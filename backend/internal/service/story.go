package service

import (
	"context"
	"crypto/sha1"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"story2video-backend/internal/conf"
	"story2video-backend/internal/data"
	"story2video-backend/internal/global"
	"story2video-backend/internal/model"
)

type StoryService struct {
	data     *data.Data
	logger   *zap.Logger
	cacheTTL time.Duration
}

func NewStoryService(cfg *conf.Config, d *data.Data, logger *zap.Logger) *StoryService {
	var ttl time.Duration
	if cfg == nil {
		ttl = time.Minute
	} else if cfg.Redis.CacheTTLSeconds > 0 {
		ttl = time.Duration(cfg.Redis.CacheTTLSeconds) * time.Second
	}
	return &StoryService{
		data:     d,
		logger:   logger,
		cacheTTL: ttl,
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
	cacheKey := s.storyListCacheKey(userID, opts)
	if cachedStories, cachedTotal, ok := s.getStoryListCache(ctx, cacheKey); ok {
		return cachedStories, cachedTotal, nil
	}

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

	s.setStoryListCache(ctx, cacheKey, stories, total)

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

type storyListCacheEntry struct {
	Stories []model.Story `json:"stories"`
	Total   int64         `json:"total"`
}

func (s *StoryService) cacheEnabled() bool {
	return s != nil && s.cacheTTL > 0 && s.data != nil && s.data.Redis != nil
}

func (s *StoryService) storyListCacheKey(userID uuid.UUID, opts StoryListOptions) string {
	if !s.cacheEnabled() {
		return ""
	}
	payload := struct {
		Keyword    string `json:"keyword,omitempty"`
		ExactTitle string `json:"exact_title,omitempty"`
		Limit      int    `json:"limit"`
		Offset     int    `json:"offset"`
		Start      string `json:"start,omitempty"`
		End        string `json:"end,omitempty"`
	}{
		Keyword:    opts.Keyword,
		ExactTitle: opts.ExactTitle,
		Limit:      opts.Limit,
		Offset:     opts.Offset,
	}
	if opts.StartTime != nil {
		payload.Start = opts.StartTime.UTC().Format(time.RFC3339Nano)
	}
	if opts.EndTime != nil {
		payload.End = opts.EndTime.UTC().Format(time.RFC3339Nano)
	}
	bytes, err := json.Marshal(payload)
	if err != nil {
		if s.logger != nil {
			s.logger.Warn("生成故事列表缓存 key 失败", zap.Error(err))
		}
		return ""
	}
	sum := sha1.Sum(bytes)
	return fmt.Sprintf("story:list:%s:%x", userID.String(), sum)
}

func (s *StoryService) getStoryListCache(ctx context.Context, key string) ([]model.Story, int64, bool) {
	if !s.cacheEnabled() || key == "" {
		return nil, 0, false
	}
	result, err := s.data.Redis.Get(ctx, key).Bytes()
	if err != nil {
		if err != redis.Nil && s.logger != nil {
			s.logger.Warn("读取故事列表缓存失败", zap.String("key", key), zap.Error(err))
		}
		return nil, 0, false
	}
	var entry storyListCacheEntry
	if err := json.Unmarshal(result, &entry); err != nil {
		if s.logger != nil {
			s.logger.Warn("解析故事列表缓存失败", zap.String("key", key), zap.Error(err))
		}
		_ = s.data.Redis.Del(ctx, key).Err()
		return nil, 0, false
	}
	return entry.Stories, entry.Total, true
}

func (s *StoryService) setStoryListCache(ctx context.Context, key string, stories []model.Story, total int64) {
	if !s.cacheEnabled() || key == "" {
		return
	}
	entry := storyListCacheEntry{
		Stories: stories,
		Total:   total,
	}
	bytes, err := json.Marshal(entry)
	if err != nil {
		if s.logger != nil {
			s.logger.Warn("序列化故事列表缓存失败", zap.Error(err))
		}
		return
	}
	if err := s.data.Redis.Set(ctx, key, bytes, s.cacheTTL).Err(); err != nil && s.logger != nil {
		s.logger.Warn("写入故事列表缓存失败", zap.String("key", key), zap.Error(err))
	}
}

func InvalidateStoryListCache(ctx context.Context, d *data.Data, userID uuid.UUID) {
	if d == nil || d.Redis == nil {
		return
	}
	pattern := fmt.Sprintf("story:list:%s:*", userID.String())
	var cursor uint64
	for {
		keys, next, err := d.Redis.Scan(ctx, cursor, pattern, 50).Result()
		if err != nil {
			return
		}
		if len(keys) > 0 {
			_ = d.Redis.Del(ctx, keys...).Err()
		}
		if next == 0 {
			break
		}
		cursor = next
	}
}
