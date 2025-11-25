package global

const (
	StoryDraft = "draft"
	StoryGen   = "generating"
	StoryReady = "ready"
	StoryFail  = "failed"
)

const (
	ShotPending = "pending"
	ShotRender  = "rendering"
	ShotDone    = "done"
	ShotFail    = "failed"
)

const (
	OpQueued  = "queued"
	OpRunning = "running"
	OpSuccess = "succeeded"
	OpFail    = "failed"
	OpCancel  = "cancelled"
)

const (
	OpLLM        = "llm"
	OpT2I        = "t2i"
	OpTTS        = "tts"
	OpCompose    = "compose"
	OpRetry      = "retry"
	OpStoryboard = "story_create"
)

const (
	TransNone      = "none"
	TransKenBurns  = "ken_burns"
	TransCrossfade = "crossfade"
)

const (
	StyleMovie     = "movie"
	StyleAnimation = "animation"
	StyleRealistic = "realistic"
)

const (
	VoiceMale   = "male"
	VoiceFemale = "female"
)
