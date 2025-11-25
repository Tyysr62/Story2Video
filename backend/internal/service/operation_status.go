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
	return d.DB.WithContext(ctx).
		Model(&model.Operation{}).
		Where("id = ?", opID).
		Updates(map[string]interface{}{
			"status":     global.OpRunning,
			"started_at": now,
		}).Error
}

func UpdateOperationSuccess(ctx context.Context, d *data.Data, opID uuid.UUID, workerName string) error {
	if d == nil || d.DB == nil {
		return nil
	}
	now := time.Now()
	return d.DB.WithContext(ctx).
		Model(&model.Operation{}).
		Where("id = ?", opID).
		Updates(map[string]interface{}{
			"status":      global.OpSuccess,
			"finished_at": now,
			"error_msg":   "",
			"worker":      workerName,
		}).Error
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
	return d.DB.WithContext(ctx).
		Model(&model.Operation{}).
		Where("id = ?", opID).
		Updates(map[string]interface{}{
			"status":      global.OpFail,
			"finished_at": now,
			"error_msg":   msg,
		}).Error
}

func IncrementOperationRetry(ctx context.Context, d *data.Data, opID uuid.UUID) error {
	if d == nil || d.DB == nil {
		return nil
	}
	return d.DB.WithContext(ctx).
		Model(&model.Operation{}).
		Where("id = ?", opID).
		UpdateColumn("retries", gorm.Expr("retries + ?", 1)).Error
}
