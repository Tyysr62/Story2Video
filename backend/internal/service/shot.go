package service

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	"story2video-backend/internal/conf"
	"story2video-backend/internal/data"
	"story2video-backend/internal/global"
	"story2video-backend/internal/model"
)

const ShotSequenceOrderClause = "CASE WHEN sequence ~ '^[0-9]+$' THEN sequence::INT ELSE 2147483647 END ASC, sequence ASC, created_at ASC"

type ShotService struct {
	data       *data.Data
	dispatcher *jobDispatcher
}

func NewShotService(cfg *conf.Config, d *data.Data, logger *zap.Logger) *ShotService {
	prod := newKafkaProducer(cfg, logger)
	return &ShotService{
		data:       d,
		dispatcher: newJobDispatcher(logger, prod),
	}
}

func (s *ShotService) List(ctx context.Context, userID, storyID uuid.UUID) ([]model.Shot, error) {
	var shots []model.Shot
	if err := s.data.DB.WithContext(ctx).
		Where("story_id = ? AND user_id = ?", storyID, userID).
		Order(ShotSequenceOrderClause).
		Find(&shots).Error; err != nil {
		return nil, WrapServiceError(ErrCodeDatabaseActionFailed, "查询镜头列表失败", err)
	}
	if len(shots) == 0 {
		if _, err := s.getStory(ctx, userID, storyID); err != nil {
			return nil, err
		}
	}
	return shots, nil
}

func (s *ShotService) Get(ctx context.Context, userID, storyID, shotID uuid.UUID) (*model.Shot, error) {
	var shot model.Shot
	if err := s.data.DB.WithContext(ctx).
		Where("id = ? AND story_id = ? AND user_id = ?", shotID, storyID, userID).
		First(&shot).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, NewServiceError(ErrCodeShotNotFound, "镜头不存在")
		}
		return nil, WrapServiceError(ErrCodeDatabaseActionFailed, "查询镜头详情失败", err)
	}
	return &shot, nil
}

func (s *ShotService) UpdateScript(ctx context.Context, userID, storyID, shotID uuid.UUID, script string) (*model.Operation, error) {
	shot, err := s.Get(ctx, userID, storyID, shotID)
	if err != nil {
		return nil, err
	}
	story, err := s.getStory(ctx, userID, storyID)
	if err != nil {
		return nil, err
	}

	if script == "" {
		script = shot.Details
	}
	if script == "" {
		return nil, NewServiceError(ErrCodeInvalidShotDetails, "镜头脚本不能为空")
	}

	// Verify shot exists before creating operation with foreign key reference
	if shot.ID == uuid.Nil {
		return nil, NewServiceError(ErrCodeInvalidRequest, "无效的镜头 ID")
	}

	payloadBytes, err := json.Marshal(map[string]string{
		"shot_id": shotID.String(),
		"details": script,
	})
	if err != nil {
		return nil, WrapServiceError(ErrCodeOperationCreateFailed, "序列化镜头任务参数失败", err)
	}

	op := model.NewOperation(uuid.New(), userID, storyID, shotID, global.OpShotRegen, datatypes.JSON(payloadBytes))
	if err := s.data.DB.WithContext(ctx).Create(op).Error; err != nil {
		return nil, WrapServiceError(ErrCodeOperationCreateFailed, "创建镜头任务失败", err)
	}

	job := StoryJobMessage{
		OperationID: op.ID.String(),
		StoryID:     storyID.String(),
		UserID:      userID.String(),
		Payload: StoryJobPayload{
			Style:       story.Style,
			ShotID:      shotID.String(),
			ShotDetails: script,
			Action:      "regen_shot",
		},
		CreatedAt: op.CreatedAt,
	}
	if err := s.dispatcher.Dispatch(job); err != nil {
		_ = UpdateOperationFailure(ctx, s.data, op.ID, err)
		if svcErr, ok := AsServiceError(err); ok {
			return nil, svcErr
		}
		return nil, WrapServiceError(ErrCodeJobEnqueueFailed, "投递镜头任务失败", err)
	}
	return op, nil
}

func (s *ShotService) RenderStory(ctx context.Context, userID, storyID uuid.UUID) (*model.Operation, error) {
	story, err := s.getStory(ctx, userID, storyID)
	if err != nil {
		return nil, err
	}

	payloadBytes, err := json.Marshal(map[string]string{
		"story_id": storyID.String(),
	})
	if err != nil {
		return nil, WrapServiceError(ErrCodeOperationCreateFailed, "序列化故事渲染参数失败", err)
	}

	op := model.NewOperation(uuid.New(), userID, storyID, uuid.Nil, global.OpVideoRender, datatypes.JSON(payloadBytes))
	if err := s.data.DB.WithContext(ctx).Create(op).Error; err != nil {
		return nil, WrapServiceError(ErrCodeOperationCreateFailed, "创建渲染任务失败", err)
	}

	job := StoryJobMessage{
		OperationID: op.ID.String(),
		StoryID:     storyID.String(),
		UserID:      userID.String(),
		Payload: StoryJobPayload{
			DisplayName: story.Title,
			Style:       story.Style,
			Action:      "render_video",
		},
		CreatedAt: op.CreatedAt,
	}

	if err := s.dispatcher.Dispatch(job); err != nil {
		_ = UpdateOperationFailure(ctx, s.data, op.ID, err)
		if svcErr, ok := AsServiceError(err); ok {
			return nil, svcErr
		}
		return nil, WrapServiceError(ErrCodeJobEnqueueFailed, "投递渲染任务失败", err)
	}
	return op, nil
}

func (s *ShotService) Update(ctx context.Context, userID, storyID, shotID uuid.UUID, fields map[string]interface{}) (*model.Shot, error) {
	if len(fields) == 0 {
		return nil, NewServiceError(ErrCodeInvalidRequest, "没有可更新的字段")
	}
	allowed := map[string]struct{}{
		"title":       {},
		"description": {},
		"details":     {},
		"narration":   {},
		"type":        {},
		"transition":  {},
		"voice":       {},
		"image_url":   {},
		"bgm":         {},
	}
	updates := make(map[string]interface{})
	for k, v := range fields {
		if _, ok := allowed[k]; ok {
			updates[k] = v
		}
	}
	if len(updates) == 0 {
		return nil, NewServiceError(ErrCodeInvalidRequest, "没有可更新的字段")
	}
	if err := s.data.DB.WithContext(ctx).
		Model(&model.Shot{}).
		Where("id = ? AND story_id = ? AND user_id = ?", shotID, storyID, userID).
		Updates(updates).Error; err != nil {
		return nil, WrapServiceError(ErrCodeDatabaseActionFailed, "更新镜头字段失败", err)
	}
	return s.Get(ctx, userID, storyID, shotID)
}

func (s *ShotService) getStory(ctx context.Context, userID, storyID uuid.UUID) (*model.Story, error) {
	var story model.Story
	if err := s.data.DB.WithContext(ctx).
		Where("id = ? AND user_id = ?", storyID, userID).
		First(&story).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, NewServiceError(ErrCodeStoryNotFound, "故事不存在")
		}
		return nil, WrapServiceError(ErrCodeDatabaseActionFailed, "查询故事失败", err)
	}
	return &story, nil
}
