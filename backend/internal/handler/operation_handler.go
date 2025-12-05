package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"story2video-backend/internal/data"
	"story2video-backend/internal/model"
)

type OperationHandler struct {
	data *data.Data
}

func NewOperationHandler(d *data.Data) *OperationHandler {
	return &OperationHandler{data: d}
}

func (h *OperationHandler) Get(c *gin.Context) {
	opIDParam := c.Param("operationID")
	opIDParam = strings.TrimPrefix(opIDParam, "operations/")
	opID, err := uuid.Parse(opIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid operation_id"})
		return
	}

	userID, err := userIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var op model.Operation
	if err := h.data.DB.WithContext(c.Request.Context()).
		First(&op, "id = ? AND user_id = ?", opID, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "operation not found"})
		return
	}

	c.JSON(http.StatusOK, op)
}
