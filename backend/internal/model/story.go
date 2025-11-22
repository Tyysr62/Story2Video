package model

import (
	"github.com/google/uuid"
	"gorm.io/datatypes"

	"story2video-backend/internal/global"
)

type Story struct {
	BaseModel
	Content  string         `gorm:"type:text;not null" json:"content"`
	Title    string         `gorm:"type:varchar(255)" json:"title"`
	Style    string         `gorm:"type:varchar(64)" json:"style"`
	Duration int            `json:"duration"`
	Status   string         `gorm:"type:varchar(16);not null;default:'draft'" json:"status"`
	Timeline datatypes.JSON `json:"timeline"`
	CoverURL string         `gorm:"type:varchar(512)" json:"cover_url"`
	VideoURL string         `gorm:"type:varchar(512)" json:"video_url"`
}

func NewStory(id, userID uuid.UUID, content string) *Story {
	return &Story{
		BaseModel: BaseModel{
			ID:     id,
			UserID: userID,
		},
		Content: content,
		Status:  global.StoryDraft,
	}
}

func (Story) TableName() string {
	return "stories"
}
