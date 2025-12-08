package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"

	"story2video-backend/internal/global"
	"story2video-backend/internal/model"
	"story2video-backend/internal/service"
)

var validate = validator.New()

type StoryHandler struct {
	home  *service.HomeService
	story *service.StoryService
}

func NewStoryHandler(home *service.HomeService, story *service.StoryService) *StoryHandler {
	return &StoryHandler{
		home:  home,
		story: story,
	}
}

type createStoryRequest struct {
	DisplayName   string `json:"display_name" binding:"required"`
	ScriptContent string `json:"script_content" binding:"required"`
	Style         string `json:"style" binding:"required"`
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

	userID, err := userIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	result, err := h.home.Create(
		c.Request.Context(),
		userID,
		service.CreateHomeParams{
			DisplayName:   req.DisplayName,
			ScriptContent: req.ScriptContent,
			Style:         req.Style,
		},
	)
	if err != nil {
		respondServiceError(c, err)
		return
	}

	c.JSON(http.StatusAccepted, result)
}

func (h *StoryHandler) List(c *gin.Context) {
	userID, err := userIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	keyword := c.Query("keyword")
	titleParam := c.Query("title")
	pageSizeStr := c.Query("page_size")
	pageTokenStr := c.Query("page_token")
	startTimeStr := c.Query("start_time")
	endTimeStr := c.Query("end_time")
	rawQ := c.Request.URL.Query()
	pageSize := 0
	offset := 0
	var startPtr *time.Time
	var endPtr *time.Time

	// 严格校验分页参数：如果请求中包含该参数但为空或非法，则返回 400；否则解析并赋值
	if _, ok := rawQ["page_size"]; ok {
		if pageSizeStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid page_size"})
			return
		}
		ps, err := strconv.Atoi(pageSizeStr)
		if err != nil || ps < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid page_size"})
			return
		}
		pageSize = ps
	}
	if _, ok := rawQ["page_token"]; ok {
		if pageTokenStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid page_token"})
			return
		}
		off, err := strconv.Atoi(pageTokenStr)
		if err != nil || off < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid page_token"})
			return
		}
		offset = off
	}

	parseFlexibleTime := func(s string) (*time.Time, bool, error) {
		if s == "" {
			return nil, false, nil
		}
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			return &t, false, nil
		}
		if t, err := time.Parse("2006-01-02", s); err == nil {
			return &t, true, nil
		}
		return nil, false, err
	}
	endIsDate := false
	// 解析时间范围：若请求中包含参数但为空则视为非法；解析错误返回 400
	if _, ok := rawQ["start_time"]; ok {
		if startTimeStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_time"})
			return
		}
		t, _, err := parseFlexibleTime(startTimeStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_time"})
			return
		}
		startPtr = t
	}
	if _, ok := rawQ["end_time"]; ok {
		if endTimeStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_time"})
			return
		}
		t, isDate, err := parseFlexibleTime(endTimeStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_time"})
			return
		}
		endPtr = t
		endIsDate = isDate
	}
	if endPtr != nil && endIsDate {
		endOfDay := endPtr.Add(24*time.Hour - time.Nanosecond)
		endPtr = &endOfDay
	}

	needFilter := false
	for _, k := range []string{"keyword", "title", "page_size", "page_token", "start_time", "end_time"} {
		if _, ok := rawQ[k]; ok {
			needFilter = true
			break
		}
	}

	opts := service.StoryListOptions{
		Keyword:   keyword,
		StartTime: startPtr,
		EndTime:   endPtr,
	}
	if titleParam != "" {
		opts.ExactTitle = titleParam
	}

	paginated := false
	if needFilter {
		paginated = true
		if pageSize <= 0 {
			pageSize = 10
		}
		opts.Limit = pageSize
		opts.Offset = offset
	}

	stories, total, err := h.story.ListStories(c.Request.Context(), userID, opts)
	if err != nil {
		respondServiceError(c, err)
		return
	}
	items := buildStoryListItems(stories)
	nextToken := ""
	if paginated {
		nextOffset := offset + len(stories)
		if int64(nextOffset) < total {
			nextToken = strconv.Itoa(nextOffset)
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"items":           items,
		"next_page_token": nextToken,
	})
}

func (h *StoryHandler) Get(c *gin.Context) {
	storyIDStr := c.Param("storyID")
	storyUUID, err := uuid.Parse(storyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid story_id"})
		return
	}
	userID, err := userIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	story, shots, err := h.story.Get(c.Request.Context(), userID, storyUUID)
	if err != nil {
		respondServiceError(c, err)
		return
	}
	shotItems := make([]gin.H, 0, len(shots))
	for idx, sh := range shots {
		shotItems = append(shotItems, gin.H{
			"shot_id":     sh.ID,
			"index":       idx,
			"title":       sh.Title,
			"description": sh.Description,
			"details":     sh.Details,
			"narration":   sh.Narration,
			"type":        sh.Type,
			"transition":  sh.Transition,
			"voice":       sh.Voice,
			"image_url":   sh.ImageURL,
			"bgm":         sh.BGM,
			"status":      sh.Status,
		})
	}
	compileState := mapStoryStatusToGenState(story.Status)
	cover := story.CoverURL
	if cover == "" && len(shots) > 0 {
		cover = shots[0].ImageURL
	}
	resp := gin.H{
		"story_id":       story.ID,
		"display_name":   story.Title,
		"script_content": story.Content,
		"style":          story.Style,
		"video_url":      story.VideoURL,
		"compile_state":  compileState,
		"cover_url":      cover,
		"create_time":    story.CreatedAt,
		"shots":          shotItems,
	}
	c.JSON(http.StatusOK, gin.H{"story": resp})
}

func mapStoryStatusToGenState(status string) string {
	switch status {
	case global.StoryDraft:
		return "STATE_PENDING"
	case global.StoryGen:
		return "STATE_RUNNING"
	case global.StoryReady:
		return "STATE_SUCCEEDED"
	case global.StoryFail:
		return "STATE_FAILED"
	default:
		return "STATE_UNSPECIFIED"
	}
}

func buildStoryListItems(stories []model.Story) []gin.H {
	items := make([]gin.H, 0, len(stories))
	for _, st := range stories {
		items = append(items, gin.H{
			"story_id":      st.ID,
			"display_name":  st.Title,
			"cover_url":     st.CoverURL,
			"create_time":   st.CreatedAt,
			"compile_state": mapStoryStatusToGenState(st.Status),
			"video_url":     st.VideoURL,
		})
	}
	return items
}
