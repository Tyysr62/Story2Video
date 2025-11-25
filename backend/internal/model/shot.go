package model

import (
	"github.com/google/uuid"

	"story2video-backend/internal/global"
)

type Shot struct {
	BaseModel
	StoryID     uuid.UUID `gorm:"type:uuid;not null;index" json:"story_id"`
	Sequence    string    `gorm:"type:varchar(64);index" json:"sequence"`
	Title       string    `gorm:"type:varchar(255)" json:"title"`
	Description string    `gorm:"type:text" json:"description"`
	Details     string    `gorm:"type:text" json:"details"`
	Narration   string    `gorm:"type:text" json:"narration"`
	Type        string    `gorm:"type:text" json:"type"`
	Transition  string    `gorm:"type:varchar(32);not null;default:'none'" json:"transition"`
	Voice       string    `gorm:"type:varchar(8)" json:"voice"`
	Status      string    `gorm:"type:varchar(16);not null;default:'pending'" json:"status"`
	ImageURL    string    `gorm:"type:varchar(512)" json:"image_url"`
	BGM         string    `gorm:"type:varchar(255)" json:"bgm"`
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
