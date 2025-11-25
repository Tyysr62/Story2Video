package modelclient

import (
	"context"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	"story2video-backend/internal/conf"
)

type Client struct {
	conn *grpc.ClientConn
}

func New(cfg conf.GRPC) (*Client, func(), error) {
	if cfg.Addr == "" {
		return nil, func() {}, nil
	}

	timeout := time.Duration(cfg.DialTimeout) * time.Second
	if timeout <= 0 {
		timeout = 5 * time.Second
	}

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	conn, err := grpc.DialContext(ctx, cfg.Addr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithBlock(),
	)
	cancel()
	if err != nil {
		return nil, nil, err
	}
	cleanup := func() {
		_ = conn.Close()
	}
	return &Client{conn: conn}, cleanup, nil
}

func (c *Client) Conn() *grpc.ClientConn {
	if c == nil {
		return nil
	}
	return c.conn
}
