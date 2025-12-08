package main

import (
	"fmt"
	"net"
	"os"
	"os/signal"
	"syscall"

	"github.com/joho/godotenv"
	"go.uber.org/zap"
	"google.golang.org/grpc"

	"story2video-backend/internal/conf"
	"story2video-backend/internal/rpc/interceptor"
	"story2video-backend/internal/rpc/modelpb"
	"story2video-backend/internal/rpc/modelserver"
	pkgLogger "story2video-backend/pkg/logger"
)

func main() {
	if err := godotenv.Load(); err != nil {
		_ = godotenv.Load("backend/.env")
	}

	cfg, err := conf.Load("")
	if err != nil {
		panic(fmt.Errorf("load config: %w", err))
	}

	log, err := pkgLogger.NewWithFile(cfg.Server.Mode, "logs/rpcserver-error.log")
	if err != nil {
		panic(fmt.Errorf("init logger: %w", err))
	}
	defer func(log *zap.Logger) {
		_ = log.Sync()
	}(log)

	server, err := modelserver.NewServer(cfg.ModelService, log)
	if err != nil {
		panic(fmt.Errorf("init model server: %w", err))
	}

	lis, err := net.Listen("tcp", cfg.GRPC.Addr)
	if err != nil {
		panic(fmt.Errorf("listen grpc: %w", err))
	}
	defer lis.Close()

	rateLimit := cfg.Pool.Size
	if rateLimit <= 0 {
		rateLimit = 8
	}
	limiter := interceptor.NewRateLimiter(rateLimit)
	grpcServer := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			interceptor.RateLimitInterceptor(limiter),
			interceptor.LoggingInterceptor(log),
			interceptor.RecoveryInterceptor(log),
		),
	)
	modelpb.RegisterStoryboardServiceServer(grpcServer, server)

	go func() {
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatal("grpc serve failed", zap.Error(err))
		}
	}()
	log.Info("grpc model server started", zap.String("addr", cfg.GRPC.Addr), zap.String("model_base_url", cfg.ModelService.BaseURL))

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	grpcServer.GracefulStop()
	log.Info("grpc model server stopped")
}
