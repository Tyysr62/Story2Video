package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"story2video-backend/internal/conf"
	"story2video-backend/internal/data"
	"story2video-backend/internal/global"
	"story2video-backend/internal/model"
	"story2video-backend/internal/rpc/modelclient"
	"story2video-backend/internal/rpc/modelpb"
	"story2video-backend/internal/service"
	pkgLogger "story2video-backend/pkg/logger"
)

type worker struct {
	data       *data.Data
	client     modelpb.StoryboardServiceClient
	logger     *zap.Logger
	reader     *kafka.Reader
	workerName string
}

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	cfg, err := conf.Load("")
	if err != nil {
		panic(fmt.Errorf("load config: %w", err))
	}

	log, err := pkgLogger.NewWithFile(cfg.Server.Mode, "logs/worker-error.log")
	if err != nil {
		panic(fmt.Errorf("init logger: %w", err))
	}
	defer func() { _ = log.Sync() }()

	// Worker 跳过数据库迁移，迁移由 API Server 负责
	dataLayer, cleanup, err := data.NewDataWithOptions(ctx, cfg, log, data.DataOptions{
		SkipMigration: true,
	})
	if err != nil {
		panic(fmt.Errorf("init data: %w", err))
	}
	defer cleanup()

	modelConn, closeConn, err := modelclient.New(cfg.GRPC)
	if err != nil {
		panic(fmt.Errorf("init grpc client: %w", err))
	}
	defer closeConn()
	if modelConn == nil || modelConn.Conn() == nil {
		panic("init grpc client: empty GRPC addr or connection unavailable")
	}

	reader := newKafkaReader(cfg)
	defer reader.Close()

	w := &worker{
		data:       dataLayer,
		client:     modelpb.NewStoryboardServiceClient(modelConn.Conn()),
		logger:     log,
		reader:     reader,
		workerName: "story-worker",
	}

	go w.run(ctx)

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt)
	<-sigCh
	log.Info("worker shutting down")
}

func (w *worker) run(ctx context.Context) {
	for {
		m, err := w.reader.FetchMessage(ctx)
		if err != nil {
			if errors.Is(err, context.Canceled) {
				return
			}
			w.logger.Error("fetch kafka message", zap.Error(err))
			time.Sleep(time.Second)
			continue
		}

		if err := w.handleMessage(ctx, m.Value); err != nil {
			w.logger.Error("process job", zap.Error(err))
		}

		if err := w.reader.CommitMessages(ctx, m); err != nil {
			w.logger.Error("commit message", zap.Error(err))
		}
	}
}

func (w *worker) handleMessage(ctx context.Context, value []byte) error {
	var job service.StoryJobMessage
	if err := json.Unmarshal(value, &job); err != nil {
		return fmt.Errorf("decode job: %w", err)
	}

	opID, err := uuid.Parse(job.OperationID)
	if err != nil {
		return fmt.Errorf("invalid operation_id: %w", err)
	}

	if err := service.UpdateOperationRunning(ctx, w.data, opID); err != nil {
		return fmt.Errorf("mark running: %w", err)
	}

	switch job.Payload.Action {
	case "regen_shot":
		err = w.handleRegenerate(ctx, job)
	case "render_video":
		err = w.handleRender(ctx, job)
	default:
		err = w.handleCreate(ctx, job)
	}

	if err != nil {
		_ = service.UpdateOperationFailure(ctx, w.data, opID, err)
		w.handleJobFailure(ctx, job)
		return err
	}

	if err := service.UpdateOperationSuccess(ctx, w.data, opID, w.workerName); err != nil {
		return fmt.Errorf("mark success: %w", err)
	}
	return nil
}

func (w *worker) handleCreate(ctx context.Context, job service.StoryJobMessage) error {
	req := &modelpb.CreateStoryboardTaskRequest{
		OperationId:   job.OperationID,
		StoryId:       job.StoryID,
		UserId:        job.UserID,
		DisplayName:   job.Payload.DisplayName,
		ScriptContent: job.Payload.ScriptContent,
		Style:         job.Payload.Style,
	}
	resp, err := w.client.CreateStoryboardTask(ctx, req)
	if err != nil {
		return err
	}
	return w.persistShots(ctx, job, resp.Shots)
}

func (w *worker) handleRegenerate(ctx context.Context, job service.StoryJobMessage) error {
	req := &modelpb.RegenerateShotRequest{
		OperationId: job.OperationID,
		StoryId:     job.StoryID,
		ShotId:      job.Payload.ShotID,
		Details:     job.Payload.ShotDetails,
		Style:       job.Payload.Style,
		UserId:      job.UserID,
	}
	resp, err := w.client.RegenerateShot(ctx, req)
	if err != nil {
		return err
	}
	return w.upsertShot(ctx, job, resp.Shot)
}

func (w *worker) handleRender(ctx context.Context, job service.StoryJobMessage) error {
	req := &modelpb.RenderVideoRequest{
		OperationId: job.OperationID,
		StoryId:     job.StoryID,
		UserId:      job.UserID,
	}
	resp, err := w.client.RenderVideo(ctx, req)
	if err != nil {
		return err
	}
	storyID, err := uuid.Parse(job.StoryID)
	if err != nil {
		return err
	}
	update := map[string]interface{}{
		"status":    global.StoryReady,
		"video_url": resp.VideoUrl,
	}
	return w.data.DB.WithContext(ctx).
		Model(&model.Story{}).
		Where("id = ?", storyID).
		Updates(update).Error
}

func (w *worker) persistShots(ctx context.Context, job service.StoryJobMessage, shots []*modelpb.ShotResult) error {
	storyUUID, err := uuid.Parse(job.StoryID)
	if err != nil {
		return err
	}
	for _, s := range shots {
		if err := w.upsertShot(ctx, job, s); err != nil {
			return err
		}
	}
	if err := w.data.DB.WithContext(ctx).
		Model(&model.Story{}).
		Where("id = ?", storyUUID).
		Update("status", global.StoryReady).Error; err != nil {
		return err
	}
	if err := w.ensureStoryCover(ctx, storyUUID); err != nil {
		w.logger.Warn("ensure story cover", zap.Error(err), zap.String("story_id", storyUUID.String()))
	}
	return nil
}

func (w *worker) upsertShot(ctx context.Context, job service.StoryJobMessage, shot *modelpb.ShotResult) error {
	if shot == nil {
		return errors.New("empty shot result")
	}
	storyID, err := uuid.Parse(job.StoryID)
	if err != nil {
		return err
	}
	sequence := shot.Sequence
	if sequence == "" {
		sequence = shot.ShotId
	}
	details := shot.Details
	if details == "" {
		details = shot.Script
	}

	shotIDStr := shot.ShotId
	if shotIDStr == "" {
		shotIDStr = job.Payload.ShotID
	}

	var (
		existing  model.Shot
		shotUUID  uuid.UUID
		hasShotID bool
	)
	if shotIDStr != "" {
		if parsed, parseErr := uuid.Parse(shotIDStr); parseErr == nil {
			shotUUID = parsed
			hasShotID = true
			if err := w.data.DB.WithContext(ctx).First(&existing, "id = ?", shotUUID).Error; err == nil {
				if err := w.updateShot(ctx, &existing, shot, details); err != nil {
					return err
				}
				if shot.ImageUrl != "" {
					if err := w.ensureStoryCover(ctx, storyID); err != nil {
						w.logger.Warn("ensure story cover", zap.Error(err), zap.String("story_id", storyID.String()))
					}
				}
				return nil
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
		}
	}

	err = w.data.DB.WithContext(ctx).
		Where("story_id = ? AND sequence = ?", storyID, sequence).
		First(&existing).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		shotID := uuid.New()
		if hasShotID {
			shotID = shotUUID
		}
		userID, _ := uuid.Parse(job.UserID)
		newShot := model.Shot{
			BaseModel: model.BaseModel{
				ID:     shotID,
				UserID: userID,
			},
			StoryID:     storyID,
			Sequence:    sequence,
			Title:       shot.Title,
			Description: shot.Description,
			Details:     details,
			Narration:   shot.Narration,
			Type:        shot.Type,
			Transition:  shot.Transition,
			Voice:       shot.Voice,
			Status:      global.ShotDone,
			ImageURL:    shot.ImageUrl,
			BGM:         shot.Bgm,
		}
		if err := w.data.DB.WithContext(ctx).Create(&newShot).Error; err != nil {
			return err
		}
		if shot.ImageUrl != "" {
			if err := w.ensureStoryCover(ctx, storyID); err != nil {
				w.logger.Warn("ensure story cover", zap.Error(err), zap.String("story_id", storyID.String()))
			}
		}
		return nil
	}
	if err != nil {
		return err
	}

	if err := w.updateShot(ctx, &existing, shot, details); err != nil {
		return err
	}
	if shot.ImageUrl != "" {
		if err := w.ensureStoryCover(ctx, storyID); err != nil {
			w.logger.Warn("ensure story cover", zap.Error(err), zap.String("story_id", storyID.String()))
		}
	}
	return nil
}

func (w *worker) updateShot(ctx context.Context, existing *model.Shot, shot *modelpb.ShotResult, details string) error {
	updates := map[string]interface{}{
		"status": global.ShotDone,
	}

	setIfNotEmpty := func(key, value string) {
		if strings.TrimSpace(value) != "" {
			updates[key] = value
		}
	}

	setIfNotEmpty("title", shot.Title)
	setIfNotEmpty("description", shot.Description)
	setIfNotEmpty("narration", shot.Narration)
	setIfNotEmpty("type", shot.Type)
	setIfNotEmpty("transition", shot.Transition)
	setIfNotEmpty("voice", shot.Voice)
	setIfNotEmpty("image_url", shot.ImageUrl)
	setIfNotEmpty("bgm", shot.Bgm)

	if strings.TrimSpace(details) != "" {
		updates["details"] = details
	}

	return w.data.DB.WithContext(ctx).
		Model(existing).
		Updates(updates).Error
}

func (w *worker) handleJobFailure(ctx context.Context, job service.StoryJobMessage) {
	switch job.Payload.Action {
	case "regen_shot":
		if err := w.updateShotStatus(ctx, job.Payload.ShotID, job.StoryID, global.ShotFail); err != nil {
			w.logger.Warn("mark shot failed", zap.Error(err), zap.String("shot_id", job.Payload.ShotID), zap.String("story_id", job.StoryID))
		}
	default:
		if err := w.updateStoryStatus(ctx, job.StoryID, global.StoryFail); err != nil {
			w.logger.Warn("mark story failed", zap.Error(err), zap.String("story_id", job.StoryID))
		}
	}
}

func (w *worker) updateStoryStatus(ctx context.Context, storyID string, status string) error {
	id, err := uuid.Parse(storyID)
	if err != nil {
		return err
	}
	return w.data.DB.WithContext(ctx).
		Model(&model.Story{}).
		Where("id = ?", id).
		Update("status", status).Error
}

func (w *worker) updateShotStatus(ctx context.Context, shotID string, storyID string, status string) error {
	if strings.TrimSpace(shotID) == "" {
		return errors.New("empty shot_id")
	}
	sid, err := uuid.Parse(shotID)
	if err != nil {
		return err
	}
	storyUUID, err := uuid.Parse(storyID)
	if err != nil {
		return err
	}
	return w.data.DB.WithContext(ctx).
		Model(&model.Shot{}).
		Where("id = ? AND story_id = ?", sid, storyUUID).
		Update("status", status).Error
}

func newKafkaReader(cfg *conf.Config) *kafka.Reader {
	if len(cfg.Kafka.Brokers) == 0 {
		panic("kafka brokers config missing")
	}
	if cfg.Kafka.Group == "" {
		cfg.Kafka.Group = "story-worker"
	}
	return kafka.NewReader(kafka.ReaderConfig{
		Brokers:  cfg.Kafka.Brokers,
		GroupID:  cfg.Kafka.Group,
		Topic:    cfg.Kafka.Topic,
		MinBytes: 1,
		MaxBytes: 10e6,
	})
}

func (w *worker) ensureStoryCover(ctx context.Context, storyID uuid.UUID) error {
	var story model.Story
	if err := w.data.DB.WithContext(ctx).
		Select("id", "cover_url").
		First(&story, "id = ?", storyID).Error; err != nil {
		return err
	}
	if story.CoverURL != "" {
		return nil
	}
	var shot model.Shot
	if err := w.data.DB.WithContext(ctx).
		Select("image_url").
		Where("story_id = ? AND image_url <> ''", storyID).
		Order(service.ShotSequenceOrderClause).
		First(&shot).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}
	if shot.ImageURL == "" {
		return nil
	}
	return w.data.DB.WithContext(ctx).
		Model(&model.Story{}).
		Where("id = ?", storyID).
		Update("cover_url", shot.ImageURL).Error
}
