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
		logger.Warn("kafka config missing, fallback to noop producer")
		return &noopProducer{logger: logger}
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
