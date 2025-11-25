package router

import (
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"story2video-backend/internal/conf"
	"story2video-backend/internal/data"
	"story2video-backend/internal/handler"
	"story2video-backend/internal/middleware"
	"story2video-backend/internal/service"
)

func NewRouter(cfg *conf.Config, log *zap.Logger, d *data.Data) *gin.Engine {
	gin.SetMode(cfg.Server.Mode)

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.Logger(log))
	r.Use(middleware.CORS())

	api := r.Group("/api")

	homeService := service.NewHomeService(cfg, d, log)
	storyService := service.NewStoryService(d, log)
	storyHandler := handler.NewStoryHandler(homeService, storyService)

	api.GET("/stories", storyHandler.List)
	api.POST("/stories", storyHandler.Create)

	return r
}
