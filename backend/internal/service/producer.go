package service

import (
	"context"
	"encoding/json"

	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"

	"story2video-backend/internal/conf"
)

type producer interface {
	Publish(ctx context.Context, msg StoryJobMessage) error
}

type kafkaProducer struct {
	writer *kafka.Writer
	logger *zap.Logger
}

func newKafkaProducer(cfg *conf.Config, logger *zap.Logger) producer {
	if len(cfg.Kafka.Brokers) == 0 || cfg.Kafka.Topic == "" {
		logger.Warn("kafka config missing, fallback to noop producer")
		return &noopProducer{logger: logger}
	}

	w := &kafka.Writer{
		Addr:     kafka.TCP(cfg.Kafka.Brokers...),
		Topic:    cfg.Kafka.Topic,
		Balancer: &kafka.Hash{},
	}
	return &kafkaProducer{
		writer: w,
		logger: logger,
	}
}

func (p *kafkaProducer) Publish(ctx context.Context, msg StoryJobMessage) error {
	bytes, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	return p.writer.WriteMessages(ctx, kafka.Message{
		Key:   []byte(msg.OperationID),
		Value: bytes,
		Time:  msg.CreatedAt,
	})
}

type noopProducer struct {
	logger *zap.Logger
}

func (n *noopProducer) Publish(_ context.Context, msg StoryJobMessage) error {
	if n.logger != nil {
		n.logger.Info("noop kafka producer invoked", zap.String("operation_id", msg.OperationID))
	}
	return nil
}
