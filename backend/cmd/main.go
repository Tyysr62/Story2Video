package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"go.uber.org/zap"

	"story2video-backend/internal/conf"
	"story2video-backend/internal/data"
	"story2video-backend/internal/router"
	pkgLogger "story2video-backend/pkg/logger"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := godotenv.Load(); err != nil {
		_ = godotenv.Load("backend/.env")
	}

	cfg, err := conf.Load("")
	if err != nil {
		panic(fmt.Errorf("load config: %w", err))
	}

	log, err := pkgLogger.New(cfg.Server.Mode)
	if err != nil {
		panic(fmt.Errorf("init logger: %w", err))
	}
	defer func(log *zap.Logger) {
		_ = log.Sync()
	}(log)

	dataLayer, cleanup, err := data.NewData(ctx, cfg, log)
	if err != nil {
		panic(fmt.Errorf("init data: %w", err))
	}
	defer cleanup()

	engine := router.NewRouter(cfg, log, dataLayer)

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Server.Port),
		Handler:      engine,
		ReadTimeout:  time.Duration(cfg.Server.ReadTimeout) * time.Second,
		WriteTimeout: time.Duration(cfg.Server.WriteTimeout) * time.Second,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("server error", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctxShutDown, cancelShutdown := context.WithTimeout(ctx, 5*time.Second)
	defer cancelShutdown()
	if err := srv.Shutdown(ctxShutDown); err != nil {
		log.Error("server shutdown", zap.Error(err))
	}
	log.Info("server exited")
}
