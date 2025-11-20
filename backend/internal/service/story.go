package service

import (
	"context"
	"fmt"
	"time"

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

func (s *StoryService) Create(ctx context.Context, title, content string) (*model.Story, error) {
	story := &model.Story{
		Title:   title,
		Content: content,
	}
	if err := s.data.DB.WithContext(ctx).Create(story).Error; err != nil {
		return nil, fmt.Errorf("create story: %w", err)
	}
	s.enqueueCache(ctx, story)
	return story, nil
}

func (s *StoryService) List(ctx context.Context) ([]model.Story, error) {
	var stories []model.Story
	if err := s.data.DB.WithContext(ctx).Order("created_at desc").Find(&stories).Error; err != nil {
		return nil, fmt.Errorf("list stories: %w", err)
	}
	return stories, nil
}

func (s *StoryService) enqueueCache(ctx context.Context, story *model.Story) {
	_ = s.data.Pool.Submit(func() {
		key := fmt.Sprintf("story:%s", story.ID.String())
		if err := s.data.Redis.Set(ctx, key, story.Title, time.Hour).Err(); err != nil {
			s.logger.Warn("cache story", zap.Error(err))
		}
	})
}
