package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"story2video-backend/internal/service"
)

func respondServiceError(c *gin.Context, err error) {
	if err == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	if svcErr, ok := service.AsServiceError(err); ok {
		status := httpStatusFromCode(svcErr.Code)
		message := svcErr.Message
		if message == "" {
			message = svcErr.Code.DefaultMessage()
		}
		if message == "" {
			message = "服务处理失败"
		}
		c.JSON(status, gin.H{
			"error":      message,
			"error_code": string(svcErr.Code),
		})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
}

func httpStatusFromCode(code service.ErrorCode) int {
	switch code {
	case service.ErrCodeInvalidRequest,
		service.ErrCodeInvalidStyle,
		service.ErrCodeInvalidShotDetails:
		return http.StatusBadRequest
	case service.ErrCodeStoryNotFound,
		service.ErrCodeShotNotFound:
		return http.StatusNotFound
	case service.ErrCodeOperationTimeout:
		return http.StatusGatewayTimeout
	case service.ErrCodeKafkaConfigInvalid:
		return http.StatusInternalServerError
	case service.ErrCodeJobEnqueueFailed,
		service.ErrCodeWorkerExecutionFailed,
		service.ErrCodeResultDataMissing,
		service.ErrCodeShotMissingPartial,
		service.ErrCodeShotContentMissing,
		service.ErrCodeShotAssetMissing:
		return http.StatusBadGateway
	case service.ErrCodeOperationCreateFailed,
		service.ErrCodeOperationUpdateFailed,
		service.ErrCodeDatabaseActionFailed:
		return http.StatusInternalServerError
	default:
		return http.StatusInternalServerError
	}
}
