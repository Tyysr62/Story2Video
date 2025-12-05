package middleware

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// CORSConfig holds CORS middleware configuration
type CORSConfig struct {
	AllowOrigins     []string
	AllowMethods     []string
	AllowHeaders     []string
	ExposeHeaders    []string
	AllowCredentials bool
	MaxAge           int // seconds
}

// DefaultCORSConfig returns the default CORS configuration
func DefaultCORSConfig() CORSConfig {
	return CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Authorization", "Content-Type", "X-User-ID"},
		ExposeHeaders: []string{},
		AllowCredentials: false,
		MaxAge:           86400, // 24 hours
	}
}

// CORS returns a CORS middleware with default config (allows all origins)
func CORS() gin.HandlerFunc {
	return CORSWithConfig(DefaultCORSConfig())
}

// CORSWithOrigins returns a CORS middleware with specified allowed origins
func CORSWithOrigins(origins []string) gin.HandlerFunc {
	cfg := DefaultCORSConfig()
	if len(origins) > 0 {
		cfg.AllowOrigins = origins
	}
	return CORSWithConfig(cfg)
}

// CORSWithConfig returns a CORS middleware with custom configuration
func CORSWithConfig(cfg CORSConfig) gin.HandlerFunc {
	// Build allow origins map for O(1) lookup
	allowOriginsMap := make(map[string]bool)
	allowAll := false
	for _, origin := range cfg.AllowOrigins {
		if origin == "*" {
			allowAll = true
			break
		}
		allowOriginsMap[origin] = true
	}

	methodsStr := strings.Join(cfg.AllowMethods, ", ")
	headersStr := strings.Join(cfg.AllowHeaders, ", ")
	exposeStr := strings.Join(cfg.ExposeHeaders, ", ")
	maxAgeStr := strconv.Itoa(cfg.MaxAge)

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")

		// Determine allowed origin
		if allowAll {
			c.Header("Access-Control-Allow-Origin", "*")
		} else if origin != "" && allowOriginsMap[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
		}

		c.Header("Access-Control-Allow-Methods", methodsStr)
		c.Header("Access-Control-Allow-Headers", headersStr)

		if exposeStr != "" {
			c.Header("Access-Control-Expose-Headers", exposeStr)
		}

		if cfg.AllowCredentials {
			c.Header("Access-Control-Allow-Credentials", "true")
		}

		if cfg.MaxAge > 0 {
			c.Header("Access-Control-Max-Age", maxAgeStr)
		}

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
