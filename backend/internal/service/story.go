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

func (s *StoryService) ListWithFilter(ctx context.Context, userID uuid.UUID, keyword string, limit int, offset int, startTime *time.Time, endTime *time.Time, exactTitle *string) ([]model.Story, int64, error) {
	var stories []model.Story
	var total int64
	query := s.data.DB.WithContext(ctx).Model(&model.Story{}).Where("user_id = ?", userID)

	// 如果提供了精确标题参数，则使用等值匹配；否则如果提供了关键字，则使用 ILIKE 模糊匹配。
	if exactTitle != nil && *exactTitle != "" {
		query = query.Where("title = ?", *exactTitle)
	} else if keyword != "" {
		like := fmt.Sprintf("%%%s%%", keyword)
		query = query.Where("title ILIKE ?", like)
	}

	if startTime != nil {
		query = query.Where("created_at >= ?", *startTime)
	}
	if endTime != nil {
		query = query.Where("created_at <= ?", *endTime)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count stories: %w", err)
	}
	if limit <= 0 {
		limit = 10
	}
	if err := query.Order("created_at desc").Limit(limit).Offset(offset).Find(&stories).Error; err != nil {
		return nil, 0, fmt.Errorf("list stories with filter: %w", err)
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
		Order("sequence asc").
		Find(&shots).Error; err != nil {
		return &story, nil, fmt.Errorf("list shots for story: %w", err)
	}
	return &story, shots, nil
}
