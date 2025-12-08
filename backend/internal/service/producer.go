package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"

	"story2video-backend/internal/conf"
)

const kafkaEnsureTopicTimeout = 10 * time.Second

type producer interface {
	Publish(ctx context.Context, msg StoryJobMessage) error
}

type kafkaProducer struct {
	writer *kafka.Writer
	logger *zap.Logger
}

func newKafkaProducer(cfg *conf.Config, logger *zap.Logger) producer {
	if len(cfg.Kafka.Brokers) == 0 || cfg.Kafka.Topic == "" {
		err := NewServiceError(ErrCodeKafkaConfigInvalid, fmt.Sprintf("缺少 Kafka 配置，brokers=%v, topic=%s", cfg.Kafka.Brokers, cfg.Kafka.Topic))
		if logger != nil {
			logger.Error(string(LogMsgKafkaConfigInvalid), zap.Error(err))
		}
		return &failingProducer{err: err}
	}

	if cfg.Kafka.AutoCreateTopic {
		if err := ensureKafkaTopic(cfg.Kafka); err != nil && logger != nil {
			logger.Warn("ensure kafka topic", zap.Error(err))
		}
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
		return WrapServiceError(ErrCodeJobEnqueueFailed, "序列化 Kafka 消息失败", err)
	}
	if err := p.writer.WriteMessages(ctx, kafka.Message{
		Key:   []byte(msg.OperationID),
		Value: bytes,
		Time:  msg.CreatedAt,
	}); err != nil {
		return WrapServiceError(ErrCodeJobEnqueueFailed, "Kafka 写入失败", err)
	}
	return nil
}

type failingProducer struct {
	err error
}

func (f *failingProducer) Publish(_ context.Context, _ StoryJobMessage) error {
	if f.err != nil {
		return f.err
	}
	return NewServiceError(ErrCodeKafkaConfigInvalid, "Kafka 生产者不可用")
}

func ensureKafkaTopic(cfg conf.Kafka) error {
	if len(cfg.Brokers) == 0 {
		return fmt.Errorf("ensure topic: empty brokers")
	}
	if cfg.Topic == "" {
		return fmt.Errorf("ensure topic: empty topic")
	}

	partitions := cfg.Partitions
	if partitions <= 0 {
		partitions = 1
	}
	replicas := cfg.ReplicationFactor
	if replicas <= 0 {
		replicas = 1
	}

	ctx, cancel := context.WithTimeout(context.Background(), kafkaEnsureTopicTimeout)
	defer cancel()

	client := &kafka.Client{
		Addr:    kafka.TCP(cfg.Brokers...),
		Timeout: kafkaEnsureTopicTimeout,
	}

	req := &kafka.CreateTopicsRequest{
		Addr: kafka.TCP(cfg.Brokers[0]),
		Topics: []kafka.TopicConfig{{
			Topic:             cfg.Topic,
			NumPartitions:     partitions,
			ReplicationFactor: replicas,
		}},
	}
	resp, err := client.CreateTopics(ctx, req)
	if err != nil {
		return fmt.Errorf("create topic request: %w", err)
	}
	for topic, topicErr := range resp.Errors {
		if topicErr == nil || errors.Is(topicErr, kafka.TopicAlreadyExists) {
			continue
		}
		return fmt.Errorf("create topic %s: %w", topic, topicErr)
	}
	return nil
}
