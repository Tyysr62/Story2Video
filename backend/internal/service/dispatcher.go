package service

import (
	"context"
	"fmt"
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
			d.logger.Error("publish kafka", zap.Error(err), zap.String("operation_id", job.OperationID))
		}
		return fmt.Errorf("publish kafka: %w", err)
	}
	return nil
}
