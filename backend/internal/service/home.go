package service

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/panjf2000/ants/v2"
	"go.uber.org/zap"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	"story2video-backend/internal/conf"
	"story2video-backend/internal/data"
	"story2video-backend/internal/global"
	"story2video-backend/internal/model"
)

type HomeService struct {
	data       *data.Data
	dispatcher *jobDispatcher
}

type BatchCreateItemResult struct {
	Result *CreateHomeResult
	Err    error
}

type StoryJobMessage struct {
	OperationID string          `json:"operation_id"`
	StoryID     string          `json:"story_id"`
	UserID      string          `json:"user_id"`
	Payload     StoryJobPayload `json:"payload"`
	CreatedAt   time.Time       `json:"created_at"`
}

type StoryJobPayload struct {
	DisplayName   string `json:"display_name,omitempty"`
	ScriptContent string `json:"script_content,omitempty"`
	Style         string `json:"style,omitempty"`
	ShotID        string `json:"shot_id,omitempty"`
	ShotDetails   string `json:"shot_details,omitempty"`
	Action        string `json:"action,omitempty"`
}

type CreateHomeParams struct {
	DisplayName   string
	ScriptContent string
	Style         string
}

type CreateHomeResult struct {
	OperationName string    `json:"operation_name"`
	State         string    `json:"state"`
	CreateTime    time.Time `json:"create_time"`
}

var (
	allowedStyles = map[string]struct{}{
		global.StyleMovie:     {},
		global.StyleAnimation: {},
		global.StyleRealistic: {},
	}
)

func NewHomeService(cfg *conf.Config, d *data.Data, logger *zap.Logger) *HomeService {
	prod := newKafkaProducer(cfg, logger)
	return &HomeService{
		data:       d,
		dispatcher: newJobDispatcher(logger, prod),
	}
}

func (s *HomeService) Close() error {
	if s == nil || s.dispatcher == nil {
		return nil
	}
	return s.dispatcher.Close()
}

func (s *HomeService) Create(ctx context.Context, userID uuid.UUID, params CreateHomeParams) (*CreateHomeResult, error) {
	if err := validateStyle(params.Style); err != nil {
		return nil, err
	}

	var (
		story *model.Story
		op    *model.Operation
		job   StoryJobMessage
	)

	err := s.data.DB.WithContext(ctx).Transaction(func(txCtx *gorm.DB) error {
		story = model.NewStory(uuid.New(), userID, params.ScriptContent)
		story.Title = params.DisplayName
		story.Style = params.Style
		story.Status = global.StoryGen

		if err := txCtx.Create(story).Error; err != nil {
			return WrapServiceError(ErrCodeDatabaseActionFailed, "创建故事记录失败", err)
		}

		payload := StoryJobPayload{
			DisplayName:   params.DisplayName,
			ScriptContent: params.ScriptContent,
			Style:         params.Style,
		}
		payloadBytes, err := json.Marshal(payload)
		if err != nil {
			return WrapServiceError(ErrCodeOperationCreateFailed, "序列化任务参数失败", err)
		}

		op = model.NewOperation(uuid.New(), userID, story.ID, uuid.Nil, global.OpStoryboard, datatypes.JSON(payloadBytes))
		if err := txCtx.Create(op).Error; err != nil {
			return WrapServiceError(ErrCodeOperationCreateFailed, "创建任务记录失败", err)
		}

		job = StoryJobMessage{
			OperationID: op.ID.String(),
			StoryID:     story.ID.String(),
			UserID:      userID.String(),
			Payload:     payload,
			CreatedAt:   op.CreatedAt,
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	InvalidateStoryListCache(ctx, s.data, userID)

	if err := s.dispatcher.Dispatch(job); err != nil {
		_ = UpdateOperationFailure(ctx, s.data, op.ID, err)
		_ = s.data.DB.WithContext(ctx).
			Model(&model.Story{}).
			Where("id = ?", story.ID).
			Update("status", global.StoryFail).Error
		if svcErr, ok := AsServiceError(err); ok {
			return nil, svcErr
		}
		return nil, WrapServiceError(ErrCodeJobEnqueueFailed, "派发故事生成任务失败", err)
	}

	return &CreateHomeResult{
		OperationName: fmt.Sprintf("operations/%s", op.ID),
		State:         op.Status,
		CreateTime:    op.CreatedAt,
	}, nil
}

func (s *HomeService) CreateBatch(ctx context.Context, userID uuid.UUID, items []CreateHomeParams, maxConcurrency int) ([]BatchCreateItemResult, error) {
	if len(items) == 0 {
		return nil, NewServiceError(ErrCodeInvalidRequest, "没有可生成的故事任务")
	}
	if maxConcurrency <= 0 {
		maxConcurrency = 1
	}
	if maxConcurrency > len(items) {
		maxConcurrency = len(items)
	}

	results := make([]BatchCreateItemResult, len(items))
	var wg sync.WaitGroup
	pool, err := ants.NewPool(maxConcurrency)
	if err != nil {
		return nil, WrapServiceError(ErrCodeJobEnqueueFailed, "初始化批量任务协程池失败", err)
	}
	defer pool.Release()

	for idx, item := range items {
		wg.Add(1)
		index := idx
		params := item
		task := func() {
			defer wg.Done()
			if err := ctx.Err(); err != nil {
				results[index].Err = err
				return
			}
			res, err := s.Create(ctx, userID, params)
			if err != nil {
				results[index].Err = err
				return
			}
			results[index].Result = res
		}
		if err := pool.Submit(task); err != nil {
			wg.Done()
			results[index].Err = err
		}
	}

	wg.Wait()
	return results, nil
}

func validateStyle(style string) error {
	if _, ok := allowedStyles[style]; !ok {
		return WrapServiceError(ErrCodeInvalidStyle, fmt.Sprintf("不支持的风格: %s", style), nil)
	}
	return nil
}
