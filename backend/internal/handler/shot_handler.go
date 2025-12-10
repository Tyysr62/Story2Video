package handler

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"story2video-backend/internal/service"
)

type ShotHandler struct {
	service *service.ShotService
}

func NewShotHandler(service *service.ShotService) *ShotHandler {
	return &ShotHandler{service: service}
}

func (h *ShotHandler) List(c *gin.Context) {
	storyID, err := parseUUIDParam(c, "storyID")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid story_id"})
		return
	}
	userID, err := userIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	shots, err := h.service.List(c.Request.Context(), userID, storyID)
	if err != nil {
		respondServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"shots": shots})
}

func (h *ShotHandler) Get(c *gin.Context) {
	storyID, shotID, ok := h.parseStoryShotIDs(c)
	if !ok {
		return
	}
	userID, err := userIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	shot, err := h.service.Get(c.Request.Context(), userID, storyID, shotID)
	if err != nil {
		respondServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, shot)
}

type updateShotBody struct {
	Shot struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
		Details     *string `json:"details"`
		Narration   *string `json:"narration"`
		Type        *string `json:"type"`
		Transition  *string `json:"transition"`
		Voice       *string `json:"voice"`
		ImageURL    *string `json:"image_url"`
		BGM         *string `json:"bgm"`
	} `json:"shot" binding:"required"`
}

func (h *ShotHandler) Update(c *gin.Context) {
	storyID, shotID, ok := h.parseStoryShotIDs(c)
	if !ok {
		return
	}
	userID, err := userIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req updateShotBody
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fields := map[string]interface{}{}
	if req.Shot.Title != nil {
		fields["title"] = *req.Shot.Title
	}
	if req.Shot.Description != nil {
		fields["description"] = *req.Shot.Description
	}
	if req.Shot.Details != nil {
		fields["details"] = *req.Shot.Details
	}
	if req.Shot.Narration != nil {
		fields["narration"] = *req.Shot.Narration
	}
	if req.Shot.Type != nil {
		fields["type"] = *req.Shot.Type
	}
	if req.Shot.Transition != nil {
		fields["transition"] = *req.Shot.Transition
	}
	if req.Shot.Voice != nil {
		fields["voice"] = *req.Shot.Voice
	}
	if req.Shot.ImageURL != nil {
		fields["image_url"] = *req.Shot.ImageURL
	}
	if req.Shot.BGM != nil {
		fields["bgm"] = *req.Shot.BGM
	}

	shot, err := h.service.Update(c.Request.Context(), userID, storyID, shotID, fields)
	if err != nil {
		respondServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, shot)
}

type regenerateShotRequest struct {
	Details   string `json:"details"`
	AssetType string `json:"asset_type"`
}

func (h *ShotHandler) Regenerate(c *gin.Context) {
	storyID, shotID, ok := h.parseStoryShotIDs(c)
	if !ok {
		return
	}
	var req regenerateShotRequest
	if err := c.ShouldBindJSON(&req); err != nil && err.Error() != "EOF" {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.AssetType != "" && req.AssetType != "ASSET_IMAGE" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported asset_type"})
		return
	}

	userID, err := userIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	op, err := h.service.UpdateScript(c.Request.Context(), userID, storyID, shotID, req.Details)
	if err != nil {
		respondServiceError(c, err)
		return
	}
	c.JSON(http.StatusAccepted, gin.H{"operation_name": fmt.Sprintf("operations/%s", op.ID), "state": op.Status})
}

func (h *ShotHandler) Render(c *gin.Context) {
	storyID, err := parseUUIDParam(c, "storyID")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid story_id"})
		return
	}
	userID, err := userIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	op, err := h.service.RenderStory(c.Request.Context(), userID, storyID)
	if err != nil {
		respondServiceError(c, err)
		return
	}
	c.JSON(http.StatusAccepted, gin.H{"operation_name": fmt.Sprintf("operations/%s", op.ID), "state": op.Status})
}

func (h *ShotHandler) parseStoryShotIDs(c *gin.Context) (uuid.UUID, uuid.UUID, bool) {
	storyID, err := parseUUIDParam(c, "storyID")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid story_id"})
		return uuid.Nil, uuid.Nil, false
	}
	shotID, err := parseUUIDParam(c, "shotID")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid shot_id"})
		return uuid.Nil, uuid.Nil, false
	}
	return storyID, shotID, true
}

func parseUUIDParam(c *gin.Context, key string) (uuid.UUID, error) {
	value := c.Param(key)
	return uuid.Parse(value)
}
