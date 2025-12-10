package service

import (
	"context"
	"time"

	"go.uber.org/zap"
)

const kafkaPublishTimeout = 10 * time.Second

type jobDispatcher struct {
	logger   *zap.Logger
	producer producer
}

func newJobDispatcher(logger *zap.Logger, producer producer) *jobDispatcher {
	return &jobDispatcher{
		logger:   logger,
		producer: producer,
	}
}

func (d *jobDispatcher) Dispatch(job StoryJobMessage) error {
	ctx, cancel := context.WithTimeout(context.Background(), kafkaPublishTimeout)
	defer cancel()
	if err := d.producer.Publish(ctx, job); err != nil {
		if d.logger != nil {
			d.logger.Error(string(LogMsgKafkaPublishFailed), d.kafkaLogFields(job, err)...)
		}
		if svcErr, ok := AsServiceError(err); ok {
			return svcErr
		}
		return WrapServiceError(ErrCodeJobEnqueueFailed, "Kafka 发送失败", err)
	}
	return nil
}

func (d *jobDispatcher) kafkaLogFields(job StoryJobMessage, err error) []zap.Field {
	fields := []zap.Field{
		zap.String(string(LogKeyOperationID), job.OperationID),
	}
	if job.StoryID != "" {
		fields = append(fields, zap.String(string(LogKeyStoryID), job.StoryID))
	}
	if job.Payload.ShotID != "" {
		fields = append(fields, zap.String(string(LogKeyShotID), job.Payload.ShotID))
	}
	if job.UserID != "" {
		fields = append(fields, zap.String(string(LogKeyUserID), job.UserID))
	}
	fields = append(fields, zap.Error(err))
	return fields
}

func (d *jobDispatcher) Close() error {
	if d == nil || d.producer == nil {
		return nil
	}
	return d.producer.Close()
}
