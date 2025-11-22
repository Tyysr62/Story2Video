package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"

	"story2video-backend/internal/global"
)

type Operation struct {
	BaseModel
	StoryID    uuid.UUID      `gorm:"type:uuid;not null;index" json:"story_id"`
	ShotID     uuid.UUID      `gorm:"type:uuid" json:"shot_id"`
	Type       string         `gorm:"type:varchar(32);not null" json:"type"`
	Payload    datatypes.JSON `json:"payload"`
	Status     string         `gorm:"type:varchar(16);not null;default:'queued'" json:"status"`
	Retries    int            `json:"retries"`
	ErrorMsg   string         `gorm:"type:text" json:"error_msg"`
	Worker     string         `gorm:"type:varchar(64)" json:"worker"`
	StartedAt  *time.Time     `json:"started_at"`
	FinishedAt *time.Time     `json:"finished_at"`
}

func NewOperation(id, userID, storyID uuid.UUID, shotID uuid.UUID, opType string, payload datatypes.JSON) *Operation {
	return &Operation{
		BaseModel: BaseModel{
			ID:     id,
			UserID: userID,
		},
		StoryID: storyID,
		ShotID:  shotID,
		Type:    opType,
		Payload: payload,
		Status:  global.OpQueued,
	}
}

func (Operation) TableName() string {
	return "operations"
}
