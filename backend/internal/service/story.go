package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"story2video-backend/internal/data"
	"story2video-backend/internal/model"
)

type StoryService struct {
	data   *data.Data
	logger *zap.Logger
}

func NewStoryService(d *data.Data, logger *zap.Logger) *StoryService {
	return &StoryService{
		data:   d,
		logger: logger,
	}
}

func (s *StoryService) List(ctx context.Context, userID uuid.UUID) ([]model.Story, error) {
	var stories []model.Story
	if err := s.data.DB.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at desc").
		Find(&stories).Error; err != nil {
		return nil, fmt.Errorf("list stories: %w", err)
	}
	return stories, nil
}
