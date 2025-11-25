package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"

	"story2video-backend/internal/service"
)

var validate = validator.New()

type StoryHandler struct {
	home  *service.HomeService
	story *service.StoryService
}

func NewStoryHandler(home *service.HomeService, story *service.StoryService) *StoryHandler {
	return &StoryHandler{
		home:  home,
		story: story,
	}
}

type createStoryRequest struct {
	DisplayName   string `json:"display_name" binding:"required"`
	ScriptContent string `json:"script_content" binding:"required"`
	Style         string `json:"style" binding:"required"`
}

func (h *StoryHandler) Create(c *gin.Context) {
	var req createStoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validate.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, err := userIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	result, err := h.home.Create(
		c.Request.Context(),
		userID,
		service.CreateHomeParams{
			DisplayName:   req.DisplayName,
			ScriptContent: req.ScriptContent,
			Style:         req.Style,
		},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusAccepted, result)
}

func (h *StoryHandler) List(c *gin.Context) {
	userID, err := userIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	stories, err := h.story.List(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"items": stories})
}
