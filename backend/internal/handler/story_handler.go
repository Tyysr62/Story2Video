package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"

	"story2video-backend/internal/global"
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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

	// 可选的查询参数：keyword用于按标题搜索，page_size和page_token用于分页。也支持按时间范围过滤：start_time和end_time，优先使用 RFC3339，支持 YYYY-MM-DD。
	keyword := c.Query("keyword")
	pageSizeStr := c.Query("page_size")
	pageTokenStr := c.Query("page_token")
	startTimeStr := c.Query("start_time")
	endTimeStr := c.Query("end_time")
	pageSize := 0
	offset := 0
	var startPtr *time.Time
	var endPtr *time.Time
	// 解析page_size。如果无效或缺失，将在服务中应用默认值。
	if pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil {
			pageSize = ps
		}
	}
	// 解析page_token作为偏移量。如果无效或缺失，默认为0。
	if pageTokenStr != "" {
		if off, err := strconv.Atoi(pageTokenStr); err == nil {
			offset = off
		}
	}

	// 解析时间范围，接受 RFC3339 或 YYYY-MM-DD
	// 规则：
	// - 如果输入是 RFC3339，则按其时间解析并保持不变。
	// - 如果输入是 YYYY-MM-DD（仅日期），对 start_time 解释为当天 00:00:00，
	//   对 end_time 解释为当天 23:59:59.999999999（即当天的结束），以便包含当天所有内容。
	parseFlexibleTime := func(s string) (*time.Time, bool, error) {
		if s == "" {
			return nil, false, nil
		}
		// 先尝试 RFC3339
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			return &t, false, nil
		}
		// 再尝试日期字符串 YYYY-MM-DD
		if t, err := time.Parse("2006-01-02", s); err == nil {
			// 将日期解释为当天00:00:00 (本地)
			return &t, true, nil
		}
		return nil, false, err
	}
	endIsDate := false
	if startTimeStr != "" {
		if t, _, err := parseFlexibleTime(startTimeStr); err == nil {
			startPtr = t
		}
	}
	if endTimeStr != "" {
		if t, isDate, err := parseFlexibleTime(endTimeStr); err == nil {
			endPtr = t
			endIsDate = isDate
		}
	}
	// 如果 end 是仅日期形式，将其调整到当天结束时刻，以包含当天所有记录。
	if endPtr != nil && endIsDate {
		// 当天结束：加上24小时并扣除1纳秒，确保包含该日所有时间点
		endOfDay := endPtr.Add(24*time.Hour - time.Nanosecond)
		endPtr = &endOfDay
	}

	// 如果提供了任何分页/搜索/时间参数，使用过滤后的列表。否则回退到简单的List。
	if keyword != "" || pageSizeStr != "" || pageTokenStr != "" || startTimeStr != "" || endTimeStr != "" {
		stories, total, err := h.story.ListWithFilter(c.Request.Context(), userID, keyword, pageSize, offset, startPtr, endPtr)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		// 组合响应项目并计算下一个页面令牌。
		items := make([]gin.H, 0, len(stories))
		for _, st := range stories {
			items = append(items, gin.H{
				"story_id":      st.ID,
				"display_name":  st.Title,
				"cover_url":     st.CoverURL,
				"create_time":   st.CreatedAt,
				"compile_state": mapStoryStatusToGenState(st.Status),
			})
		}
		// 计算下一个偏移量用于分页。当pageSize为零时，服务使用默认值10。
		if pageSize <= 0 {
			pageSize = 10
		}
		nextOffset := offset + len(stories)
		var nextToken string
		if int64(nextOffset) < total {
			nextToken = strconv.Itoa(nextOffset)
		}
		c.JSON(http.StatusOK, gin.H{
			"stories":         items,
			"next_page_token": nextToken,
			// 提供旧字段用于向后兼容。
			"items": items,
		})
		return
	}

	// 回退：返回所有故事，不进行分页或过滤，最初实现的方式。
	stories, err := h.story.List(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": stories})
}

// Get 返回故事的详细信息，包括镜头。它从URL中读取storyID，验证当前用户是否有访问权限，并返回适合预览页面的结构。
// 验证当前用户是否有访问权限并返回适合预览页面的结构。
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	// 构建镜头信息用于预览。根据排序计算索引。
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
	// 从故事状态派生编译状态。
	compileState := mapStoryStatusToGenState(story.Status)
	// 如果故事没有显式的封面，尝试使用第一个镜头的图片作为后备。
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

// 将内部的故事状态转换为前端期望的生成状态字符串
// 这个辅助函数集中了状态映射的逻辑，所以只需要在一个地方更新状态。
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
