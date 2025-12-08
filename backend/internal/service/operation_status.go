package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"story2video-backend/internal/data"
	"story2video-backend/internal/global"
	"story2video-backend/internal/model"
)

func UpdateOperationRunning(ctx context.Context, d *data.Data, opID uuid.UUID) error {
	if d == nil || d.DB == nil {
		return nil
	}
	now := time.Now()
	if err := d.DB.WithContext(ctx).
		Model(&model.Operation{}).
		Where("id = ?", opID).
		Updates(map[string]interface{}{
			"status":     global.OpRunning,
			"started_at": now,
		}).Error; err != nil {
		return WrapServiceError(ErrCodeOperationUpdateFailed, "更新任务为执行中失败", err)
	}
	return nil
}

func UpdateOperationSuccess(ctx context.Context, d *data.Data, opID uuid.UUID, workerName string) error {
	if d == nil || d.DB == nil {
		return nil
	}
	now := time.Now()
	if err := d.DB.WithContext(ctx).
		Model(&model.Operation{}).
		Where("id = ?", opID).
		Updates(map[string]interface{}{
			"status":      global.OpSuccess,
			"finished_at": now,
			"error_msg":   "",
			"worker":      workerName,
		}).Error; err != nil {
		return WrapServiceError(ErrCodeOperationUpdateFailed, "更新任务为成功状态失败", err)
	}
	return nil
}

func UpdateOperationFailure(ctx context.Context, d *data.Data, opID uuid.UUID, cause error) error {
	if d == nil || d.DB == nil {
		return nil
	}
	now := time.Now()
	msg := ""
	if cause != nil {
		msg = cause.Error()
	}
	if err := d.DB.WithContext(ctx).
		Model(&model.Operation{}).
		Where("id = ?", opID).
		Updates(map[string]interface{}{
			"status":      global.OpFail,
			"finished_at": now,
			"error_msg":   msg,
		}).Error; err != nil {
		return WrapServiceError(ErrCodeOperationUpdateFailed, "更新任务为失败状态失败", err)
	}
	return nil
}

func IncrementOperationRetry(ctx context.Context, d *data.Data, opID uuid.UUID) error {
	if d == nil || d.DB == nil {
		return nil
	}
	if err := d.DB.WithContext(ctx).
		Model(&model.Operation{}).
		Where("id = ?", opID).
		UpdateColumn("retries", gorm.Expr("retries + ?", 1)).Error; err != nil {
		return WrapServiceError(ErrCodeOperationUpdateFailed, "更新任务重试次数失败", err)
	}
	return nil
}
