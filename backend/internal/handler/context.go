package handler

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"story2video-backend/internal/middleware"
)

var errNoUser = errors.New("missing user")

func userIDFromContext(c *gin.Context) (uuid.UUID, error) {
	val, exists := c.Get(middleware.ContextUserIDKey)
	if !exists {
		return uuid.Nil, errNoUser
	}
	id, ok := val.(uuid.UUID)
	if !ok {
		return uuid.Nil, errNoUser
	}
	return id, nil
}
