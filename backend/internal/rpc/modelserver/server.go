package modelserver

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"story2video-backend/internal/conf"
	"story2video-backend/internal/rpc/modelpb"
)

type Server struct {
	modelpb.UnimplementedStoryboardServiceServer
	baseURL string
	client  *http.Client
	logger  *zap.Logger
}

func NewServer(cfg conf.ModelService, logger *zap.Logger) (*Server, error) {
	baseURL := strings.TrimSpace(cfg.BaseURL)
	if baseURL == "" {
		return nil, fmt.Errorf("model_service.base_url is empty")
	}
	timeout := time.Duration(cfg.Timeout) * time.Second
	if timeout <= 0 {
		timeout = 120 * time.Second
	}
	return &Server{
		baseURL: strings.TrimRight(baseURL, "/"),
		client: &http.Client{
			Timeout: timeout,
		},
		logger: logger,
	}, nil
}

func (s *Server) CreateStoryboardTask(ctx context.Context, req *modelpb.CreateStoryboardTaskRequest) (*modelpb.StoryboardReply, error) {
	payload := map[string]string{
		"operation_id":   req.OperationId,
		"story_id":       req.StoryId,
		"user_id":        req.UserId,
		"display_name":   req.DisplayName,
		"script_content": req.ScriptContent,
		"style":          req.Style,
	}

	var resp storyboardCreateResponse
	if err := s.post(ctx, "/api/v1/storyboard/create", payload, &resp); err != nil {
		return nil, status.Errorf(codes.Internal, "create storyboard: %v", err)
	}

	shots := make([]*modelpb.ShotResult, 0, len(resp.Shots))
	for _, shot := range resp.Shots {
		shots = append(shots, convertShot(shot, s.logger))
	}

	return &modelpb.StoryboardReply{
		Shots: shots,
	}, nil
}

func (s *Server) RegenerateShot(ctx context.Context, req *modelpb.RegenerateShotRequest) (*modelpb.RegenerateShotReply, error) {
	payload := map[string]string{
		"operation_id": req.OperationId,
		"story_id":     req.StoryId,
		"shot_id":      req.ShotId,
		"user_id":      req.UserId,
		"detail":       req.Details,
		"style":        req.Style,
	}

	var resp regenerateShotResponse
	if err := s.post(ctx, "/api/v1/shot/regenerate", payload, &resp); err != nil {
		return nil, status.Errorf(codes.Internal, "regenerate shot: %v", err)
	}

	return &modelpb.RegenerateShotReply{
		Shot: convertShot(resp.Shot, s.logger),
	}, nil
}

func (s *Server) RenderVideo(ctx context.Context, req *modelpb.RenderVideoRequest) (*modelpb.RenderVideoReply, error) {
	payload := map[string]string{
		"operation_id": req.OperationId,
		"story_id":     req.StoryId,
		"user_id":      req.UserId,
	}

	var resp renderVideoResponse
	if err := s.post(ctx, "/api/v1/video/render", payload, &resp); err != nil {
		return nil, status.Errorf(codes.Internal, "render video: %v", err)
	}

	return &modelpb.RenderVideoReply{
		VideoUrl: resp.VideoURL,
		VideoData: decodeBase64(
			resp.VideoData,
		),
	}, nil
}

func (s *Server) post(ctx context.Context, path string, payload any, out any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("encode payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	res, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("request model service: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode >= http.StatusBadRequest {
		content, _ := io.ReadAll(res.Body)
		return fmt.Errorf("model service %s status=%d body=%s", path, res.StatusCode, strings.TrimSpace(string(content)))
	}

	if out == nil {
		_, _ = io.Copy(io.Discard, res.Body)
		return nil
	}

	if err := json.NewDecoder(res.Body).Decode(out); err != nil {
		return fmt.Errorf("decode model response: %w", err)
	}
	return nil
}

type storyboardCreateResponse struct {
	Operation apiOperation `json:"operation"`
	Shots     []apiShot    `json:"shots"`
}

type regenerateShotResponse struct {
	Operation apiOperation `json:"operation"`
	Shot      apiShot      `json:"shot"`
}

type renderVideoResponse struct {
	Operation apiOperation `json:"operation"`
	VideoURL  string       `json:"video_url"`
	VideoData string       `json:"video_data"`
}

type apiOperation struct {
	OperationID string `json:"operation_id"`
	Status      string `json:"status"`
	Detail      string `json:"detail"`
}

type apiShot struct {
	ID          string      `json:"id"`
	ShotID      string      `json:"shot_id"`
	Sequence    interface{} `json:"sequence"`
	Subject     string      `json:"subject"`
	Title       string      `json:"title"`
	Description string      `json:"description"`
	Script      string      `json:"script"`
	Detail      string      `json:"detail"`
	Details     string      `json:"details"`
	Camera      string      `json:"camera"`
	Type        string      `json:"type"`
	Transition  string      `json:"transition"`
	Voice       string      `json:"voice"`
	Tone        string      `json:"tone"`
	Narration   string      `json:"narration"`
	BGM         string      `json:"bgm"`
	ImageURL    string      `json:"image_url"`
	ImagePath   string      `json:"image_path"`
	ImageBase64 string      `json:"image_base64"`
	ImageData   string      `json:"image_data"`
}

func convertShot(shot apiShot, logger *zap.Logger) *modelpb.ShotResult {
	if shot.Sequence == nil && shot.ShotID == "" {
		shot.Sequence = shot.ID
	}
	sequence := normalizeSequence(shot.Sequence)
	shotID := firstNonEmpty(shot.ID, shot.ShotID, sequence)
	if sequence == "" {
		sequence = shotID
	}

	detail := firstNonEmpty(shot.Detail, shot.Details)
	description := firstNonEmpty(shot.Description, detail)
	title := firstNonEmpty(shot.Title, shot.Subject)
	narration := shot.Narration
	shotType := firstNonEmpty(shot.Type, shot.Camera)
	voice := firstNonEmpty(shot.Voice, shot.Tone)
	imageURL := firstNonEmpty(shot.ImageURL, shot.ImagePath)

	imageBytes := decodeBase64(shot.ImageBase64, shot.ImageData)
	if len(imageBytes) == 0 && logger != nil {
		logger.Debug("shot missing image data", zap.String("shot_id", shotID))
	}

	return &modelpb.ShotResult{
		ShotId:      shotID,
		Sequence:    sequence,
		Title:       title,
		Description: description,
		Script:      firstNonEmpty(shot.Script, detail),
		Details:     detail,
		Narration:   narration,
		Type:        shotType,
		Transition:  shot.Transition,
		Voice:       voice,
		ImageUrl:    imageURL,
		Bgm:         shot.BGM,
		ImageData:   imageBytes,
	}
}

func normalizeSequence(seq interface{}) string {
	switch v := seq.(type) {
	case string:
		return strings.TrimSpace(v)
	case float64:
		return strconv.FormatInt(int64(v), 10)
	case int:
		return strconv.Itoa(v)
	case int32:
		return strconv.Itoa(int(v))
	case int64:
		return strconv.FormatInt(v, 10)
	}
	return ""
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func decodeBase64(values ...string) []byte {
	for _, v := range values {
		val := strings.TrimSpace(v)
		if val == "" {
			continue
		}
		if idx := strings.Index(val, ","); idx != -1 {
			val = val[idx+1:]
		}
		data, err := base64.StdEncoding.DecodeString(val)
		if err != nil {
			continue
		}
		return data
	}
	return nil
}
