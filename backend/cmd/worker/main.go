package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/signal"
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
	storage    service.Storage
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

	log, err := pkgLogger.New(cfg.Server.Mode)
	if err != nil {
		panic(fmt.Errorf("init logger: %w", err))
	}
	defer func() { _ = log.Sync() }()

	dataLayer, cleanup, err := data.NewData(ctx, cfg, log)
	if err != nil {
		panic(fmt.Errorf("init data: %w", err))
	}
	defer cleanup()

	modelConn, closeConn, err := modelclient.New(cfg.GRPC)
	if err != nil {
		panic(fmt.Errorf("init grpc client: %w", err))
	}
	defer closeConn()

	storage := service.NewStorage(cfg.OSS, log)
	reader := newKafkaReader(cfg)
	defer reader.Close()

	w := &worker{
		data:       dataLayer,
		client:     modelpb.NewStoryboardServiceClient(modelConn.Conn()),
		storage:    storage,
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
	if len(resp.VideoData) > 0 {
		objectKey := fmt.Sprintf("%s/output.mp4", job.StoryID)
		url, uploadErr := w.storage.Upload(ctx, objectKey, bytes.NewReader(resp.VideoData))
		if uploadErr == nil {
			update["video_url"] = url
		}
	}
	return w.data.DB.WithContext(ctx).
		Model(&model.Story{}).
		Where("id = ?", storyID).
		Updates(update).Error
}

func (w *worker) persistShots(ctx context.Context, job service.StoryJobMessage, shots []*modelpb.ShotResult) error {
	for _, s := range shots {
		if err := w.upsertShot(ctx, job, s); err != nil {
			return err
		}
	}
	return w.data.DB.WithContext(ctx).
		Model(&model.Story{}).
		Where("id = ?", job.StoryID).
		Update("status", global.StoryReady).Error
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
	var existing model.Shot
	err = w.data.DB.WithContext(ctx).
		Where("story_id = ? AND sequence = ?", storyID, sequence).
		First(&existing).Error

	details := shot.Details
	if details == "" {
		details = shot.Script
	}

	imageURL := shot.ImageUrl
	if len(shot.ImageData) > 0 {
		objectKey := fmt.Sprintf("%s/%s.png", job.StoryID, sequence)
		if url, uploadErr := w.storage.Upload(ctx, objectKey, bytes.NewReader(shot.ImageData)); uploadErr == nil {
			imageURL = url
		}
	}

	if errors.Is(err, gorm.ErrRecordNotFound) {
		shotID := uuid.New()
		if parsed, parseErr := uuid.Parse(shot.ShotId); parseErr == nil {
			shotID = parsed
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
			ImageURL:    imageURL,
			BGM:         shot.Bgm,
		}
		return w.data.DB.WithContext(ctx).Create(&newShot).Error
	}
	if err != nil {
		return err
	}

	return w.data.DB.WithContext(ctx).
		Model(&existing).
		Updates(map[string]interface{}{
			"title":       shot.Title,
			"description": shot.Description,
			"details":     details,
			"narration":   shot.Narration,
			"type":        shot.Type,
			"transition":  shot.Transition,
			"voice":       shot.Voice,
			"status":      global.ShotDone,
			"image_url":   imageURL,
			"bgm":         shot.Bgm,
		}).Error
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
