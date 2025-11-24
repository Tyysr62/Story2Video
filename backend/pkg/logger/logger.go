package logger

import (
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func New(mode string) (*zap.Logger, error) {
	var cfg zap.Config
	if mode == "release" {
		cfg = zap.NewProductionConfig()
	} else {
		cfg = zap.NewDevelopmentConfig()
	}
	cfg.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	return cfg.Build()
}
