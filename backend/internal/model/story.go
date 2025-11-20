package model

type Story struct {
	BaseModel
	Title   string `gorm:"type:varchar(255);not null" json:"title"`
	Content string `gorm:"type:text" json:"content"`
}

func (Story) TableName() string {
	return "stories"
}
