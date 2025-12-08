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
	r.Use(middleware.CORSWithOrigins(cfg.CORS.AllowOrigins))

	api := r.Group("/v1")
	api.Use(middleware.User())

	homeService := service.NewHomeService(cfg, d, log)
	storyService := service.NewStoryService(cfg, d, log)
	shotService := service.NewShotService(cfg, d, log)

	storyHandler := handler.NewStoryHandler(homeService, storyService)
	shotHandler := handler.NewShotHandler(shotService)
	opHandler := handler.NewOperationHandler(d)

	api.GET("/stories", storyHandler.List)
	api.POST("/stories", storyHandler.Create)
	api.GET("/stories/:storyID", storyHandler.Get)
	api.GET("/stories/:storyID/shots", shotHandler.List)
	api.GET("/stories/:storyID/shots/:shotID", shotHandler.Get)
	api.PATCH("/stories/:storyID/shots/:shotID", shotHandler.Update)
	api.POST("/stories/:storyID/shots/:shotID/regenerate", shotHandler.Regenerate)
	api.POST("/stories/:storyID/compile", shotHandler.Render)

	api.GET("/operations/:operationID", opHandler.Get)

	return r
}
