package interceptor

import (
	"context"
	"runtime/debug"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

type traceIDKey struct{}

const traceHeader = "x-trace-id"

func TraceIDFromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	if val, ok := ctx.Value(traceIDKey{}).(string); ok {
		return val
	}
	return ""
}

func LoggingInterceptor(logger *zap.Logger) grpc.UnaryServerInterceptor {
	if logger == nil {
		logger = zap.NewNop()
	}
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		traceID := ensureTraceID(ctx)
		ctx = context.WithValue(ctx, traceIDKey{}, traceID)
		start := time.Now()
		resp, err := handler(ctx, req)
		fields := []zap.Field{
			zap.String("method", info.FullMethod),
			zap.String("trace_id", traceID),
			zap.Duration("duration", time.Since(start)),
		}
		if err != nil {
			logger.Error("grpc request failed", append(fields, zap.Error(err))...)
			return resp, err
		}
		logger.Info("grpc request completed", fields...)
		return resp, nil
	}
}

func RecoveryInterceptor(logger *zap.Logger) grpc.UnaryServerInterceptor {
	if logger == nil {
		logger = zap.NewNop()
	}
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (resp interface{}, err error) {
		defer func() {
			if r := recover(); r != nil {
				logger.Error("grpc panic recovered",
					zap.Any("panic", r),
					zap.ByteString("stack", debug.Stack()),
					zap.String("method", info.FullMethod),
					zap.String("trace_id", TraceIDFromContext(ctx)),
				)
				err = status.Error(codes.Internal, "internal server error")
			}
		}()
		return handler(ctx, req)
	}
}

func TimeoutInterceptor(timeout time.Duration) grpc.UnaryServerInterceptor {
	if timeout <= 0 {
		return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
			return handler(ctx, req)
		}
	}
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		if deadline, ok := ctx.Deadline(); ok && time.Until(deadline) <= timeout {
			return handler(ctx, req)
		}
		timeoutCtx, cancel := context.WithTimeout(ctx, timeout)
		defer cancel()
		return handler(timeoutCtx, req)
	}
}

type RateLimiter struct {
	tokens chan struct{}
}

func NewRateLimiter(limit int) *RateLimiter {
	if limit <= 0 {
		return nil
	}
	return &RateLimiter{
		tokens: make(chan struct{}, limit),
	}
}

func (r *RateLimiter) acquire(ctx context.Context) error {
	if r == nil {
		return nil
	}
	select {
	case r.tokens <- struct{}{}:
		return nil
	default:
		select {
		case r.tokens <- struct{}{}:
			return nil
		case <-ctx.Done():
			return ctx.Err()
		default:
			return status.Error(codes.ResourceExhausted, "too many concurrent grpc requests")
		}
	}
}

func (r *RateLimiter) release() {
	if r == nil {
		return
	}
	select {
	case <-r.tokens:
	default:
	}
}

func RateLimitInterceptor(limiter *RateLimiter) grpc.UnaryServerInterceptor {
	if limiter == nil {
		return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
			return handler(ctx, req)
		}
	}
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		if err := limiter.acquire(ctx); err != nil {
			return nil, err
		}
		defer limiter.release()
		return handler(ctx, req)
	}
}

func ensureTraceID(ctx context.Context) string {
	if ctx == nil {
		return uuid.NewString()
	}
	if val := TraceIDFromContext(ctx); val != "" {
		return val
	}
	if md, ok := metadata.FromIncomingContext(ctx); ok {
		if ids := md.Get(traceHeader); len(ids) > 0 && ids[0] != "" {
			return ids[0]
		}
	}
	return uuid.NewString()
}
