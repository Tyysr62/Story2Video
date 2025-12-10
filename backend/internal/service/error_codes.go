package service

import "errors"

type ErrorCode string

const (
	ErrCodeInvalidRequest        ErrorCode = "SVC1000"
	ErrCodeInvalidStyle          ErrorCode = "SVC1001"
	ErrCodeInvalidShotDetails    ErrorCode = "SVC1002"
	ErrCodeStoryNotFound         ErrorCode = "SVC1101"
	ErrCodeShotNotFound          ErrorCode = "SVC1102"
	ErrCodeOperationCreateFailed ErrorCode = "SVC2001"
	ErrCodeOperationUpdateFailed ErrorCode = "SVC2002"
	ErrCodeOperationTimeout      ErrorCode = "SVC2003"
	ErrCodeKafkaConfigInvalid    ErrorCode = "SVC3001"
	ErrCodeJobEnqueueFailed      ErrorCode = "SVC3002"
	ErrCodeWorkerExecutionFailed ErrorCode = "SVC4001"
	ErrCodeResultDataMissing     ErrorCode = "SVC4002"
	ErrCodeShotMissingPartial    ErrorCode = "SVC4101"
	ErrCodeShotContentMissing    ErrorCode = "SVC4102"
	ErrCodeShotAssetMissing      ErrorCode = "SVC4103"
	ErrCodeDatabaseActionFailed  ErrorCode = "SVC5001"
)

var errorCodeMessages = map[ErrorCode]string{
	ErrCodeInvalidRequest:        "请求参数不合法",
	ErrCodeInvalidStyle:          "不支持的风格",
	ErrCodeInvalidShotDetails:    "镜头脚本内容无效",
	ErrCodeStoryNotFound:         "未找到对应故事",
	ErrCodeShotNotFound:          "未找到对应镜头",
	ErrCodeOperationCreateFailed: "创建任务失败",
	ErrCodeOperationUpdateFailed: "更新任务状态失败",
	ErrCodeOperationTimeout:      "任务执行超时",
	ErrCodeKafkaConfigInvalid:    "Kafka 配置错误",
	ErrCodeJobEnqueueFailed:      "任务投递失败",
	ErrCodeWorkerExecutionFailed: "工作节点执行失败",
	ErrCodeResultDataMissing:     "任务结果缺失",
	ErrCodeShotMissingPartial:    "部分镜头缺失",
	ErrCodeShotContentMissing:    "镜头内容缺失或不完整",
	ErrCodeShotAssetMissing:      "镜头素材缺失或损坏",
	ErrCodeDatabaseActionFailed:  "数据库操作失败",
}

type ServiceError struct {
	Code    ErrorCode
	Message string
	Err     error
}

func (e *ServiceError) Error() string {
	if e == nil {
		return ""
	}
	msg := string(e.Code)
	if e.Message != "" {
		msg += ": " + e.Message
	} else if def := e.Code.DefaultMessage(); def != "" {
		msg += ": " + def
	}
	if e.Err != nil {
		msg += ": " + e.Err.Error()
	}
	return msg
}

func (e *ServiceError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Err
}

func NewServiceError(code ErrorCode, msg string) *ServiceError {
	return &ServiceError{Code: code, Message: msg}
}

func WrapServiceError(code ErrorCode, msg string, cause error) *ServiceError {
	return &ServiceError{Code: code, Message: msg, Err: cause}
}

func AsServiceError(err error) (*ServiceError, bool) {
	var svcErr *ServiceError
	if errors.As(err, &svcErr) {
		return svcErr, true
	}
	return nil, false
}

func (c ErrorCode) DefaultMessage() string {
	if msg, ok := errorCodeMessages[c]; ok {
		return msg
	}
	return ""
}

type LogKey string

const (
	LogKeyOperationID LogKey = "operation_id"
	LogKeyStoryID     LogKey = "story_id"
	LogKeyShotID      LogKey = "shot_id"
	LogKeyUserID      LogKey = "user_id"
	LogKeyWorker      LogKey = "worker"
	LogKeyError       LogKey = "error"
)

type LogMsg string

const (
	LogMsgKafkaPublishFailed   LogMsg = "Kafka 投递失败"
	LogMsgKafkaConfigInvalid   LogMsg = "Kafka 配置异常"
	LogMsgOperationCreateFail  LogMsg = "创建任务失败"
	LogMsgOperationUpdateFail  LogMsg = "更新任务状态失败"
	LogMsgStoryOrShotMissing   LogMsg = "故事或镜头缺失"
	LogMsgWorkerExecutionFail  LogMsg = "Worker 执行失败"
	LogMsgResultDataMissing    LogMsg = "任务结果缺失"
	LogMsgShotMissingPartial   LogMsg = "部分镜头缺失"
	LogMsgShotContentMissing   LogMsg = "镜头内容缺失"
	LogMsgShotAssetMissing     LogMsg = "镜头素材缺失"
	LogMsgOperationTimeout     LogMsg = "任务执行超时"
	LogMsgValidationFailed     LogMsg = "请求参数校验失败"
	LogMsgDatabaseActionFailed LogMsg = "数据库操作失败"
)

var (
	defaultLogKeys = []LogKey{
		LogKeyOperationID,
		LogKeyStoryID,
		LogKeyShotID,
		LogKeyUserID,
		LogKeyWorker,
		LogKeyError,
	}
	defaultLogMsgs = []LogMsg{
		LogMsgKafkaPublishFailed,
		LogMsgKafkaConfigInvalid,
		LogMsgOperationCreateFail,
		LogMsgOperationUpdateFail,
		LogMsgStoryOrShotMissing,
		LogMsgWorkerExecutionFail,
		LogMsgResultDataMissing,
		LogMsgShotMissingPartial,
		LogMsgShotContentMissing,
		LogMsgShotAssetMissing,
		LogMsgOperationTimeout,
		LogMsgValidationFailed,
		LogMsgDatabaseActionFailed,
	}
)

func KnownLogKeys() []LogKey {
	keys := make([]LogKey, len(defaultLogKeys))
	copy(keys, defaultLogKeys)
	return keys
}

func KnownLogMsgs() []LogMsg {
	msgs := make([]LogMsg, len(defaultLogMsgs))
	copy(msgs, defaultLogMsgs)
	return msgs
}
