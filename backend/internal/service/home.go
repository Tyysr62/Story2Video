package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
	"google.golang.org/protobuf/types/known/structpb"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	"story2video-backend/internal/conf"
	"story2video-backend/internal/data"
	"story2video-backend/internal/global"
	"story2video-backend/internal/model"
)

type HomeService struct {
	data     *data.Data
	logger   *zap.Logger
	producer producer
}

type producer interface {
	Publish(ctx context.Context, msg StoryJobMessage) error
}

type StoryJobMessage struct {
	OperationID string          `json:"operation_id"`
	StoryID     string          `json:"story_id"`
	UserID      string          `json:"user_id"`
	Payload     StoryJobPayload `json:"payload"`
	CreatedAt   time.Time       `json:"created_at"`
}

type StoryJobPayload struct {
	DisplayName   string `json:"display_name"`
	ScriptContent string `json:"script_content"`
	Style         string `json:"style"`
}

type CreateHomeParams struct {
	DisplayName   string
	ScriptContent string
	Style         string
}

type CreateHomeResult struct {
	OperationName string    `json:"operation_name"`
	State         string    `json:"state"`
	CreateTime    time.Time `json:"create_time"`
}

var (
	allowedStyles = map[string]struct{}{
		global.StyleMovie:     {},
		global.StyleAnimation: {},
		global.StyleRealistic: {},
	}

	errRPCDisabled      = errors.New("model rpc disabled")
	modelMethodCreate   = "/storyboard.Model/CreateStoryboardTask"
	modelCallTimeout    = 20 * time.Second
	kafkaPublishTimeout = 10 * time.Second
)

func NewHomeService(cfg *conf.Config, d *data.Data, logger *zap.Logger) *HomeService {
	return &HomeService{
		data:     d,
		logger:   logger,
		producer: newKafkaProducer(cfg, logger),
	}
}

func (s *HomeService) Create(ctx context.Context, userID uuid.UUID, params CreateHomeParams) (*CreateHomeResult, error) {
	if err := validateStyle(params.Style); err != nil {
		return nil, err
	}

	var (
		story *model.Story
		op    *model.Operation
	)

	err := s.data.DB.WithContext(ctx).Transaction(func(txCtx *gorm.DB) error {
		story = model.NewStory(uuid.New(), userID, params.ScriptContent)
		story.Title = params.DisplayName
		story.Style = params.Style
		story.Status = global.StoryGen

		if err := txCtx.Create(story).Error; err != nil {
			return fmt.Errorf("create story: %w", err)
		}

		payloadBytes, err := json.Marshal(StoryJobPayload{
			DisplayName:   params.DisplayName,
			ScriptContent: params.ScriptContent,
			Style:         params.Style,
		})
		if err != nil {
			return fmt.Errorf("marshal payload: %w", err)
		}

		op = model.NewOperation(uuid.New(), userID, story.ID, uuid.Nil, global.OpStoryboard, datatypes.JSON(payloadBytes))
		if err := txCtx.Create(op).Error; err != nil {
			return fmt.Errorf("create operation: %w", err)
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	job := StoryJobMessage{
		OperationID: op.ID.String(),
		StoryID:     story.ID.String(),
		UserID:      userID.String(),
		Payload: StoryJobPayload{
			DisplayName:   params.DisplayName,
			ScriptContent: params.ScriptContent,
			Style:         params.Style,
		},
		CreatedAt: op.CreatedAt,
	}
	if err := s.dispatchJob(job, op.ID); err != nil {
		return nil, err
	}

	return &CreateHomeResult{
		OperationName: fmt.Sprintf("operations/%s", op.ID),
		State:         op.Status,
		CreateTime:    op.CreatedAt,
	}, nil
}

func (s *HomeService) failOperation(ctx context.Context, opID uuid.UUID, cause error) error {
	return s.data.DB.WithContext(ctx).
		Model(&model.Operation{}).
		Where("id = ?", opID).
		Updates(map[string]interface{}{
			"status":    global.OpFail,
			"error_msg": cause.Error(),
		}).Error
}

func validateStyle(style string) error {
	if _, ok := allowedStyles[style]; !ok {
		return fmt.Errorf("unsupported style: %s", style)
	}
	return nil
}

func (s *HomeService) dispatchJob(job StoryJobMessage, opID uuid.UUID) error {
	if s.data.Pool == nil {
		go s.executeJob(job, opID)
		return nil
	}
	if err := s.data.Pool.Submit(func() {
		s.executeJob(job, opID)
	}); err != nil {
		_ = s.failOperation(context.Background(), opID, err)
		return fmt.Errorf("submit job: %w", err)
	}
	return nil
}

func (s *HomeService) executeJob(job StoryJobMessage, opID uuid.UUID) {
	ctxModel, cancelModel := context.WithTimeout(context.Background(), modelCallTimeout)
	defer cancelModel()

	if err := s.callModel(ctxModel, job); err != nil && !errors.Is(err, errRPCDisabled) {
		s.logger.Error("call model rpc", zap.Error(err), zap.String("operation_id", job.OperationID))
		_ = s.failOperation(context.Background(), opID, err)
		return
	}

	ctxKafka, cancelKafka := context.WithTimeout(context.Background(), kafkaPublishTimeout)
	defer cancelKafka()
	if err := s.producer.Publish(ctxKafka, job); err != nil {
		s.logger.Error("publish kafka", zap.Error(err), zap.String("operation_id", job.OperationID))
		_ = s.failOperation(context.Background(), opID, err)
		return
	}
}

func (s *HomeService) callModel(ctx context.Context, job StoryJobMessage) error {
	if s.data == nil || s.data.RPC == nil || s.data.RPC.Conn() == nil {
		return errRPCDisabled
	}

	payload := map[string]interface{}{
		"display_name":   job.Payload.DisplayName,
		"script_content": job.Payload.ScriptContent,
		"style":          job.Payload.Style,
	}
	reqStruct, err := structpb.NewStruct(map[string]interface{}{
		"operation_id": job.OperationID,
		"story_id":     job.StoryID,
		"user_id":      job.UserID,
		"payload":      payload,
		"created_at":   job.CreatedAt.Format(time.RFC3339),
	})
	if err != nil {
		return err
	}

	resp := &structpb.Struct{}
	if err := s.data.RPC.Conn().Invoke(ctx, modelMethodCreate, reqStruct, resp); err != nil {
		return err
	}
	return nil
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
