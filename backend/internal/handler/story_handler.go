package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"

	"story2video-backend/internal/service"
)

var validate = validator.New()

type StoryHandler struct {
	service *service.StoryService
}

func NewStoryHandler(service *service.StoryService) *StoryHandler {
	return &StoryHandler{service: service}
}

type createStoryRequest struct {
	Title   string `json:"title" binding:"required"`
	Content string `json:"content"`
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

	story, err := h.service.Create(c.Request.Context(), req.Title, req.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":      story.ID,
		"title":   story.Title,
		"content": story.Content,
	})
}

func (h *StoryHandler) List(c *gin.Context) {
	stories, err := h.service.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"items": stories})
}
