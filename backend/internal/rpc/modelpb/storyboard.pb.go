package modelpb

import (
	context "context"

	proto "github.com/golang/protobuf/proto"
	grpc "google.golang.org/grpc"
)

var _ = proto.Marshal

type ShotResult struct {
	ShotId      string `protobuf:"bytes,1,opt,name=shot_id,json=shotId,proto3" json:"shot_id,omitempty"`
	Sequence    string `protobuf:"bytes,2,opt,name=sequence,proto3" json:"sequence,omitempty"`
	Title       string `protobuf:"bytes,3,opt,name=title,proto3" json:"title,omitempty"`
	Description string `protobuf:"bytes,4,opt,name=description,proto3" json:"description,omitempty"`
	Script      string `protobuf:"bytes,5,opt,name=script,proto3" json:"script,omitempty"`
	Details     string `protobuf:"bytes,6,opt,name=details,proto3" json:"details,omitempty"`
	Narration   string `protobuf:"bytes,7,opt,name=narration,proto3" json:"narration,omitempty"`
	Type        string `protobuf:"bytes,8,opt,name=type,proto3" json:"type,omitempty"`
	Transition  string `protobuf:"bytes,9,opt,name=transition,proto3" json:"transition,omitempty"`
	Voice       string `protobuf:"bytes,10,opt,name=voice,proto3" json:"voice,omitempty"`
	ImageUrl    string `protobuf:"bytes,11,opt,name=image_url,json=imageUrl,proto3" json:"image_url,omitempty"`
	Bgm         string `protobuf:"bytes,12,opt,name=bgm,proto3" json:"bgm,omitempty"`
	ImageData   []byte `protobuf:"bytes,13,opt,name=image_data,json=imageData,proto3" json:"image_data,omitempty"`
}

func (m *ShotResult) Reset()         { *m = ShotResult{} }
func (m *ShotResult) String() string { return proto.CompactTextString(m) }
func (*ShotResult) ProtoMessage()    {}

type CreateStoryboardTaskRequest struct {
	OperationId   string `protobuf:"bytes,1,opt,name=operation_id,json=operationId,proto3" json:"operation_id,omitempty"`
	StoryId       string `protobuf:"bytes,2,opt,name=story_id,json=storyId,proto3" json:"story_id,omitempty"`
	UserId        string `protobuf:"bytes,3,opt,name=user_id,json=userId,proto3" json:"user_id,omitempty"`
	DisplayName   string `protobuf:"bytes,4,opt,name=display_name,json=displayName,proto3" json:"display_name,omitempty"`
	ScriptContent string `protobuf:"bytes,5,opt,name=script_content,json=scriptContent,proto3" json:"script_content,omitempty"`
	Style         string `protobuf:"bytes,6,opt,name=style,proto3" json:"style,omitempty"`
}

func (m *CreateStoryboardTaskRequest) Reset()         { *m = CreateStoryboardTaskRequest{} }
func (m *CreateStoryboardTaskRequest) String() string { return proto.CompactTextString(m) }
func (*CreateStoryboardTaskRequest) ProtoMessage()    {}

type StoryboardReply struct {
	Shots []*ShotResult `protobuf:"bytes,1,rep,name=shots,proto3" json:"shots,omitempty"`
}

func (m *StoryboardReply) Reset()         { *m = StoryboardReply{} }
func (m *StoryboardReply) String() string { return proto.CompactTextString(m) }
func (*StoryboardReply) ProtoMessage()    {}

type RegenerateShotRequest struct {
	OperationId string `protobuf:"bytes,1,opt,name=operation_id,json=operationId,proto3" json:"operation_id,omitempty"`
	StoryId     string `protobuf:"bytes,2,opt,name=story_id,json=storyId,proto3" json:"story_id,omitempty"`
	ShotId      string `protobuf:"bytes,3,opt,name=shot_id,json=shotId,proto3" json:"shot_id,omitempty"`
	Details     string `protobuf:"bytes,4,opt,name=details,proto3" json:"details,omitempty"`
	Style       string `protobuf:"bytes,5,opt,name=style,proto3" json:"style,omitempty"`
	UserId      string `protobuf:"bytes,6,opt,name=user_id,json=userId,proto3" json:"user_id,omitempty"`
}

func (m *RegenerateShotRequest) Reset()         { *m = RegenerateShotRequest{} }
func (m *RegenerateShotRequest) String() string { return proto.CompactTextString(m) }
func (*RegenerateShotRequest) ProtoMessage()    {}

type RegenerateShotReply struct {
	Shot *ShotResult `protobuf:"bytes,1,opt,name=shot,proto3" json:"shot,omitempty"`
}

func (m *RegenerateShotReply) Reset()         { *m = RegenerateShotReply{} }
func (m *RegenerateShotReply) String() string { return proto.CompactTextString(m) }
func (*RegenerateShotReply) ProtoMessage()    {}

type RenderVideoRequest struct {
	OperationId string `protobuf:"bytes,1,opt,name=operation_id,json=operationId,proto3" json:"operation_id,omitempty"`
	StoryId     string `protobuf:"bytes,2,opt,name=story_id,json=storyId,proto3" json:"story_id,omitempty"`
	UserId      string `protobuf:"bytes,3,opt,name=user_id,json=userId,proto3" json:"user_id,omitempty"`
}

func (m *RenderVideoRequest) Reset()         { *m = RenderVideoRequest{} }
func (m *RenderVideoRequest) String() string { return proto.CompactTextString(m) }
func (*RenderVideoRequest) ProtoMessage()    {}

type RenderVideoReply struct {
	VideoUrl  string `protobuf:"bytes,1,opt,name=video_url,json=videoUrl,proto3" json:"video_url,omitempty"`
	VideoData []byte `protobuf:"bytes,2,opt,name=video_data,json=videoData,proto3" json:"video_data,omitempty"`
}

func (m *RenderVideoReply) Reset()         { *m = RenderVideoReply{} }
func (m *RenderVideoReply) String() string { return proto.CompactTextString(m) }
func (*RenderVideoReply) ProtoMessage()    {}

type StoryboardServiceClient interface {
	CreateStoryboardTask(ctx context.Context, in *CreateStoryboardTaskRequest, opts ...grpc.CallOption) (*StoryboardReply, error)
	RegenerateShot(ctx context.Context, in *RegenerateShotRequest, opts ...grpc.CallOption) (*RegenerateShotReply, error)
	RenderVideo(ctx context.Context, in *RenderVideoRequest, opts ...grpc.CallOption) (*RenderVideoReply, error)
}

type storyboardServiceClient struct {
	cc grpc.ClientConnInterface
}

func NewStoryboardServiceClient(cc grpc.ClientConnInterface) StoryboardServiceClient {
	return &storyboardServiceClient{cc}
}

func (c *storyboardServiceClient) CreateStoryboardTask(ctx context.Context, in *CreateStoryboardTaskRequest, opts ...grpc.CallOption) (*StoryboardReply, error) {
	out := new(StoryboardReply)
	err := c.cc.Invoke(ctx, "/storyboard.v1.StoryboardService/CreateStoryboardTask", in, out, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func (c *storyboardServiceClient) RegenerateShot(ctx context.Context, in *RegenerateShotRequest, opts ...grpc.CallOption) (*RegenerateShotReply, error) {
	out := new(RegenerateShotReply)
	err := c.cc.Invoke(ctx, "/storyboard.v1.StoryboardService/RegenerateShot", in, out, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func (c *storyboardServiceClient) RenderVideo(ctx context.Context, in *RenderVideoRequest, opts ...grpc.CallOption) (*RenderVideoReply, error) {
	out := new(RenderVideoReply)
	err := c.cc.Invoke(ctx, "/storyboard.v1.StoryboardService/RenderVideo", in, out, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

type StoryboardServiceServer interface {
	CreateStoryboardTask(context.Context, *CreateStoryboardTaskRequest) (*StoryboardReply, error)
	RegenerateShot(context.Context, *RegenerateShotRequest) (*RegenerateShotReply, error)
	RenderVideo(context.Context, *RenderVideoRequest) (*RenderVideoReply, error)
}

func RegisterStoryboardServiceServer(s *grpc.Server, srv StoryboardServiceServer) {
	s.RegisterService(&_StoryboardService_serviceDesc, srv)
}

func _StoryboardService_CreateStoryboardTask_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(CreateStoryboardTaskRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(StoryboardServiceServer).CreateStoryboardTask(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/storyboard.v1.StoryboardService/CreateStoryboardTask",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(StoryboardServiceServer).CreateStoryboardTask(ctx, req.(*CreateStoryboardTaskRequest))
	}
	return interceptor(ctx, in, info, handler)
}

func _StoryboardService_RegenerateShot_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(RegenerateShotRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(StoryboardServiceServer).RegenerateShot(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/storyboard.v1.StoryboardService/RegenerateShot",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(StoryboardServiceServer).RegenerateShot(ctx, req.(*RegenerateShotRequest))
	}
	return interceptor(ctx, in, info, handler)
}

func _StoryboardService_RenderVideo_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(RenderVideoRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(StoryboardServiceServer).RenderVideo(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/storyboard.v1.StoryboardService/RenderVideo",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(StoryboardServiceServer).RenderVideo(ctx, req.(*RenderVideoRequest))
	}
	return interceptor(ctx, in, info, handler)
}

var _StoryboardService_serviceDesc = grpc.ServiceDesc{
	ServiceName: "storyboard.v1.StoryboardService",
	HandlerType: (*StoryboardServiceServer)(nil),
	Methods: []grpc.MethodDesc{
		{
			MethodName: "CreateStoryboardTask",
			Handler:    _StoryboardService_CreateStoryboardTask_Handler,
		},
		{
			MethodName: "RegenerateShot",
			Handler:    _StoryboardService_RegenerateShot_Handler,
		},
		{
			MethodName: "RenderVideo",
			Handler:    _StoryboardService_RenderVideo_Handler,
		},
	},
	Streams:  []grpc.StreamDesc{},
	Metadata: "proto/storyboard.proto",
}
