package service

import (
	"context"
	"errors"
	"fmt"
	"io"

	"go.uber.org/zap"

	"story2video-backend/internal/conf"
)

var ErrOSSNotConfigured = errors.New("oss uploader not configured")

type Storage interface {
	Upload(ctx context.Context, objectKey string, body io.Reader) (string, error)
}

type OSSUploader struct {
	cfg    conf.OSS
	logger *zap.Logger
}

func NewStorage(cfg conf.OSS, logger *zap.Logger) Storage {
	if cfg.Endpoint == "" || cfg.Bucket == "" {
		if logger != nil {
			logger.Warn("oss config missing, fallback to noop uploader")
		}
		return &noopStorage{logger: logger}
	}
	return &OSSUploader{cfg: cfg, logger: logger}
}

func (o *OSSUploader) Upload(_ context.Context, objectKey string, _ io.Reader) (string, error) {
	url := fmt.Sprintf("%s/%s/%s", o.cfg.Endpoint, o.cfg.Bucket, objectKey)
	return url, nil
}

type noopStorage struct {
	logger *zap.Logger
}

func (n *noopStorage) Upload(_ context.Context, _ string, _ io.Reader) (string, error) {
	if n.logger != nil {
		n.logger.Info("noop storage upload invoked")
	}
	return "", ErrOSSNotConfigured
}
