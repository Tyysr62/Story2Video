package logger

import (
	"os"
	"path/filepath"
	"strings"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func New(mode string) (*zap.Logger, error) {
	cfg := buildConfig(mode)
	return cfg.Build()
}

func NewWithFile(mode, filePath string) (*zap.Logger, error) {
	cfg := buildConfig(mode)
	if strings.TrimSpace(filePath) == "" {
		return cfg.Build()
	}

	fileCore, err := newFileCore(filePath)
	if err != nil {
		return nil, err
	}

	return cfg.Build(zap.WrapCore(func(core zapcore.Core) zapcore.Core {
		return zapcore.NewTee(core, fileCore)
	}))
}

func buildConfig(mode string) zap.Config {
	release := strings.EqualFold(mode, "release")

	var cfg zap.Config
	if release {
		cfg = zap.NewProductionConfig()
		cfg.EncoderConfig.EncodeLevel = zapcore.CapitalLevelEncoder
	} else {
		cfg = zap.NewDevelopmentConfig()
		cfg.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	}
	cfg.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	return cfg
}

func newFileCore(filePath string) (zapcore.Core, error) {
	if err := os.MkdirAll(filepath.Dir(filePath), 0o755); err != nil {
		return nil, err
	}
	f, err := os.OpenFile(filePath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		return nil, err
	}
	encCfg := zap.NewProductionEncoderConfig()
	encCfg.EncodeTime = zapcore.ISO8601TimeEncoder
	encCfg.EncodeLevel = zapcore.CapitalLevelEncoder
	encoder := zapcore.NewJSONEncoder(encCfg)
	level := zap.NewAtomicLevelAt(zapcore.ErrorLevel)
	return zapcore.NewCore(encoder, zapcore.AddSync(f), level), nil
}
