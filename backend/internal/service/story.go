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

// List 返回给定用户的不带任何过滤的简单故事列表。
// 这个方法是为了向后兼容现有的处理程序而保留的。
// 新的调用者需要分页或关键字过滤应该使用ListWithFilter代替。
// 需要分页或关键词过滤的新调用者应改用 ListWithFilter
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

// ListWithFilter 返回给定用户的故事列表，应用可选的关键词过滤和分页。
// 它还返回匹配记录的总数，以帮助计算分页游标。
// 关键词过滤针对故事标题（显示名称）进行。
func (s *StoryService) ListWithFilter(ctx context.Context, userID uuid.UUID, keyword string, limit int, offset int, startTime *time.Time, endTime *time.Time) ([]model.Story, int64, error) {
	var stories []model.Story
	var total int64
	// 构建基于此用户的基查询。
	query := s.data.DB.WithContext(ctx).Model(&model.Story{}).Where("user_id = ?", userID)

	// 如果提供了关键词，使用ILIKE进行不区分大小写的匹配，搜索Title字段。
	if keyword != "" {
		like := fmt.Sprintf("%%%s%%", keyword)
		query = query.Where("title ILIKE ?", like)
	}

	// 如果提供了时间范围，添加created_at的过滤条件。
	if startTime != nil {
		query = query.Where("created_at >= ?", *startTime)
	}
	if endTime != nil {
		query = query.Where("created_at <= ?", *endTime)
	}

	// 在应用limit/offset之前计算总数。
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count stories: %w", err)
	}
	if limit <= 0 {
		limit = 10
	}
	// 应用排序、limit和offset进行分页。
	if err := query.Order("created_at desc").Limit(limit).Offset(offset).Find(&stories).Error; err != nil {
		return nil, 0, fmt.Errorf("list stories with filter: %w", err)
	}
	return stories, total, nil
}

// Get 返回由storyID标识的故事及其所有镜头。它验证故事属于给定的用户。
// 镜头按其序列排序，以便在预览页面上进行预测显示。
// 当故事不存在或不属于用户时，函数返回错误。
// 返回由storyID标识的故事及其所有镜头。它验证故事属于给定的用户。
func (s *StoryService) Get(ctx context.Context, userID uuid.UUID, storyID uuid.UUID) (*model.Story, []model.Shot, error) {
	var story model.Story
	// 获取故事，确保它属于给定的用户。
	if err := s.data.DB.WithContext(ctx).
		Where("id = ? AND user_id = ?", storyID, userID).
		First(&story).Error; err != nil {
		return nil, nil, fmt.Errorf("get story: %w", err)
	}
	// 获取与此故事相关的镜头。
	var shots []model.Shot
	if err := s.data.DB.WithContext(ctx).
		Where("story_id = ?", storyID).
		Order("sequence asc").
		Find(&shots).Error; err != nil {
		return &story, nil, fmt.Errorf("list shots for story: %w", err)
	}
	return &story, shots, nil
}
