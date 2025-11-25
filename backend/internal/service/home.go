package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
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

func (s *HomeService) Create(ctx context.Context, userID uuid.UUID, params CreateHomeParams) (*CreateHomeResult, error) {
	if err := validateStyle(params.Style); err != nil {
		return nil, err
	}

	var (
		story *model.Story
		op    *model.Operation
	)

	err := s.data.DB.WithContext(ctx).Transaction(func(txCtx *gorm.DB) error {
		story = model.NewStory(uuid.New(), userID, params.ScriptContent)
		story.Title = params.DisplayName
		story.Style = params.Style
		story.Status = global.StoryGen

		if err := txCtx.Create(story).Error; err != nil {
			return fmt.Errorf("create story: %w", err)
		}

		payloadBytes, err := json.Marshal(StoryJobPayload{
			DisplayName:   params.DisplayName,
			ScriptContent: params.ScriptContent,
			Style:         params.Style,
		})
		if err != nil {
			return fmt.Errorf("marshal payload: %w", err)
		}

		op = model.NewOperation(uuid.New(), userID, story.ID, uuid.Nil, global.OpStoryboard, datatypes.JSON(payloadBytes))
		if err := txCtx.Create(op).Error; err != nil {
			return fmt.Errorf("create operation: %w", err)
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	job := StoryJobMessage{
		OperationID: op.ID.String(),
		StoryID:     story.ID.String(),
		UserID:      userID.String(),
		Payload: StoryJobPayload{
			DisplayName:   params.DisplayName,
			ScriptContent: params.ScriptContent,
			Style:         params.Style,
		},
		CreatedAt: op.CreatedAt,
	}
	if err := s.dispatcher.Dispatch(job); err != nil {
		return nil, err
	}

	return &CreateHomeResult{
		OperationName: fmt.Sprintf("operations/%s", op.ID),
		State:         op.Status,
		CreateTime:    op.CreatedAt,
	}, nil
}

func validateStyle(style string) error {
	if _, ok := allowedStyles[style]; !ok {
		return fmt.Errorf("unsupported style: %s", style)
	}
	return nil
}
