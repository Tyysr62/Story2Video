package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const ContextUserIDKey = "user_id"

func User() gin.HandlerFunc {
	return func(c *gin.Context) {
		userHeader := c.GetHeader("X-User-ID")
		if userHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing X-User-ID"})
			return
		}
		userID, err := uuid.Parse(userHeader)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid X-User-ID"})
			return
		}
		c.Set(ContextUserIDKey, userID)
		c.Next()
	}
}
