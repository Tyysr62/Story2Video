package service

import (
	"context"
	"fmt"
	"time"

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

type StoryListOptions struct {
	Keyword    string
	ExactTitle string
	Limit      int
	Offset     int
	StartTime  *time.Time
	EndTime    *time.Time
}

func (s *StoryService) ListStories(ctx context.Context, userID uuid.UUID, opts StoryListOptions) ([]model.Story, int64, error) {
	var stories []model.Story
	var total int64

	query := s.data.DB.WithContext(ctx).Model(&model.Story{}).Where("user_id = ?", userID)

	if opts.ExactTitle != "" {
		query = query.Where("title = ?", opts.ExactTitle)
	} else if opts.Keyword != "" {
		like := fmt.Sprintf("%%%s%%", opts.Keyword)
		query = query.Where("title ILIKE ?", like)
	}

	if opts.StartTime != nil {
		query = query.Where("created_at >= ?", *opts.StartTime)
	}
	if opts.EndTime != nil {
		query = query.Where("created_at <= ?", *opts.EndTime)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count stories: %w", err)
	}

	query = query.Order("created_at desc")
	if opts.Limit > 0 {
		query = query.Limit(opts.Limit).Offset(opts.Offset)
	}

	if err := query.Find(&stories).Error; err != nil {
		return nil, 0, fmt.Errorf("list stories: %w", err)
	}

	return stories, total, nil
}

func (s *StoryService) Get(ctx context.Context, userID uuid.UUID, storyID uuid.UUID) (*model.Story, []model.Shot, error) {
	var story model.Story
	if err := s.data.DB.WithContext(ctx).
		Where("id = ? AND user_id = ?", storyID, userID).
		First(&story).Error; err != nil {
		return nil, nil, fmt.Errorf("get story: %w", err)
	}
	var shots []model.Shot
	if err := s.data.DB.WithContext(ctx).
		Where("story_id = ?", storyID).
		Order(ShotSequenceOrderClause).
		Find(&shots).Error; err != nil {
		return &story, nil, fmt.Errorf("list shots for story: %w", err)
	}
	return &story, shots, nil
}
