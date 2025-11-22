package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"

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
	ID       string `json:"id" binding:"required"`
	Content  string `json:"content" binding:"required"`
	Title    string `json:"title"`
	Style    string `json:"style"`
	Duration int    `json:"duration"`
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

	userID, err := resolveUserID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	storyID, err := uuid.Parse(req.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	story, err := h.service.Create(
		c.Request.Context(),
		storyID,
		userID,
		req.Content,
		req.Title,
		req.Style,
		req.Duration,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, story)
}

func (h *StoryHandler) List(c *gin.Context) {
	userID, err := resolveUserID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	stories, err := h.service.List(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"items": stories})
}

func resolveUserID(c *gin.Context) (uuid.UUID, error) {
	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		id := uuid.New()
		c.Header("X-User-ID", id.String())
		return id, nil
	}
	id, err := uuid.Parse(userID)
	if err != nil {
		return uuid.UUID{}, err
	}
	return id, nil
}
