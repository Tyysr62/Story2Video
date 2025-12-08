package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"story2video-backend/internal/data"
	"story2video-backend/internal/global"
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
		return nil, 0, WrapServiceError(ErrCodeDatabaseActionFailed, "统计故事数量失败", err)
	}

	query = query.Order("created_at desc")
	if opts.Limit > 0 {
		query = query.Limit(opts.Limit).Offset(opts.Offset)
	}

	if err := query.Find(&stories).Error; err != nil {
		return nil, 0, WrapServiceError(ErrCodeDatabaseActionFailed, "查询故事列表失败", err)
	}

	return stories, total, nil
}

func (s *StoryService) Get(ctx context.Context, userID uuid.UUID, storyID uuid.UUID) (*model.Story, []model.Shot, error) {
	var story model.Story
	if err := s.data.DB.WithContext(ctx).
		Where("id = ? AND user_id = ?", storyID, userID).
		First(&story).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, NewServiceError(ErrCodeStoryNotFound, "故事不存在")
		}
		return nil, nil, WrapServiceError(ErrCodeDatabaseActionFailed, "查询故事详情失败", err)
	}
	var shots []model.Shot
	if err := s.data.DB.WithContext(ctx).
		Where("story_id = ?", storyID).
		Order(ShotSequenceOrderClause).
		Find(&shots).Error; err != nil {
		return &story, nil, WrapServiceError(ErrCodeDatabaseActionFailed, "查询故事下镜头失败", err)
	}
	if svcErr := validateStoryResult(&story, shots); svcErr != nil {
		return nil, nil, svcErr
	}
	return &story, shots, nil
}

func validateStoryResult(story *model.Story, shots []model.Shot) *ServiceError {
	if story == nil {
		return nil
	}
	if story.Status != global.StoryReady {
		return nil
	}
	if len(shots) == 0 {
		return NewServiceError(ErrCodeShotMissingPartial, "故事已完成但没有可用镜头")
	}
	var (
		missingShots   int
		missingContent int
		missingAsset   int
	)
	for _, shot := range shots {
		if shot.Status != global.ShotDone {
			missingShots++
		}
		if shot.Details == "" || shot.Narration == "" || shot.Description == "" {
			missingContent++
		}
		if shot.ImageURL == "" {
			missingAsset++
		}
	}
	switch {
	case missingShots > 0:
		return NewServiceError(ErrCodeShotMissingPartial, fmt.Sprintf("仍有 %d 个镜头未生成完成", missingShots))
	case missingContent > 0:
		return NewServiceError(ErrCodeShotContentMissing, fmt.Sprintf("%d 个镜头内容缺失", missingContent))
	case missingAsset > 0:
		return NewServiceError(ErrCodeShotAssetMissing, fmt.Sprintf("%d 个镜头素材缺失", missingAsset))
	default:
		return nil
	}
}
