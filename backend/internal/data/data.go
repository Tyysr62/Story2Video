package data

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/panjf2000/ants/v2"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"story2video-backend/internal/conf"
	"story2video-backend/internal/model"
	"story2video-backend/internal/rpc/modelclient"
)

type Data struct {
	DB    *gorm.DB
	Redis *redis.Client
	Pool  *ants.Pool
	RPC   *modelclient.Client
}

// DataOptions 用于配置 Data 初始化选项
type DataOptions struct {
	// SkipMigration 如果为 true，则跳过数据库迁移（适用于 Worker 等不需要迁移的服务）
	SkipMigration bool
}

func NewData(ctx context.Context, cfg *conf.Config, log *zap.Logger) (*Data, func(), error) {
	return NewDataWithOptions(ctx, cfg, log, DataOptions{})
}

func NewDataWithOptions(ctx context.Context, cfg *conf.Config, log *zap.Logger, opts DataOptions) (*Data, func(), error) {
	colorful := !strings.EqualFold(cfg.Server.Mode, "release")
	db, err := newDB(cfg.Database, log, colorful)
	if err != nil {
		return nil, nil, err
	}
	if !opts.SkipMigration {
		if err := db.AutoMigrate(&model.Story{}, &model.Shot{}, &model.Operation{}); err != nil {
			return nil, nil, fmt.Errorf("auto migrate: %w", err)
		}
	}

	rdb, err := newRedis(cfg.Redis)
	if err != nil {
		return nil, nil, err
	}

	pool, err := ants.NewPool(cfg.Pool.Size, ants.WithExpiryDuration(time.Duration(cfg.Pool.ExpirySeconds)*time.Second))
	if err != nil {
		return nil, nil, fmt.Errorf("init ants: %w", err)
	}

	rpcClient, rpcCleanup, err := modelclient.New(cfg.GRPC)
	if err != nil {
		return nil, nil, fmt.Errorf("init grpc client: %w", err)
	}

	cleanup := func() {
		sqlDB, _ := db.DB()
		if sqlDB != nil {
			_ = sqlDB.Close()
		}
		pool.Release()
		if err := rdb.Close(); err != nil {
			log.Warn("close redis", zap.Error(err))
		}
		if rpcCleanup != nil {
			rpcCleanup()
		}
	}

	return &Data{
		DB:    db,
		Redis: rdb,
		Pool:  pool,
		RPC:   rpcClient,
	}, cleanup, nil
}

func newDB(cfg conf.Database, log *zap.Logger, colorful bool) (*gorm.DB, error) {
	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.Name, cfg.SSLMode)
	gormLogger := logger.New(
		zap.NewStdLog(log),
		logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logger.Info,
			IgnoreRecordNotFoundError: true,
			Colorful:                  colorful,
		},
	)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: gormLogger,
	})
	if err != nil {
		return nil, fmt.Errorf("open postgres: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("get sql db: %w", err)
	}
	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(time.Duration(cfg.ConnMaxLifetime) * time.Second)
	return db, nil
}

func newRedis(cfg conf.Redis) (*redis.Client, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:         fmt.Sprintf("%s:%d", cfg.Host, cfg.Port),
		Password:     cfg.Password,
		DB:           cfg.DB,
		PoolSize:     cfg.PoolSize,
		MinIdleConns: cfg.MinIdleConns,
	})
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("ping redis: %w", err)
	}
	return rdb, nil
}
