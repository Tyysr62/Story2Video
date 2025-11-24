package model

import (
	"github.com/google/uuid"

	"story2video-backend/internal/global"
)

type Shot struct {
	BaseModel
	StoryID     uuid.UUID `gorm:"type:uuid;not null;index" json:"story_id"`
	Number      int       `json:"number"`
	Title       string    `gorm:"type:varchar(255)" json:"title"`
	Description string    `gorm:"type:text" json:"description"`
	Script      string    `gorm:"type:text" json:"script"`
	Narration   string    `gorm:"type:text" json:"narration"`
	Transition  string    `gorm:"type:varchar(32);not null;default:'none'" json:"transition"`
	Status      string    `gorm:"type:varchar(16);not null;default:'pending'" json:"status"`
	ImageURL    string    `gorm:"type:varchar(512)" json:"image_url"`
	AudioURL    string    `gorm:"type:varchar(512)" json:"audio_url"`
	ClipURL     string    `gorm:"type:varchar(512)" json:"clip_url"`
}

func NewShot(id, userID, storyID uuid.UUID) *Shot {
	return &Shot{
		BaseModel: BaseModel{
			ID:     id,
			UserID: userID,
		},
		StoryID:    storyID,
		Status:     global.ShotPending,
		Transition: global.TransNone,
	}
}

func (Shot) TableName() string {
	return "shots"
}
