CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


CREATE TABLE IF NOT EXISTS stories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL,
    content     TEXT        NOT NULL,
    title       VARCHAR(255),
    style       VARCHAR(64),
    duration    INTEGER     NOT NULL DEFAULT 0,
    status      VARCHAR(16) NOT NULL DEFAULT 'draft',
    timeline    JSONB,
    cover_url   VARCHAR(512),
    video_url   VARCHAR(512),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories (user_id);
CREATE INDEX IF NOT EXISTS idx_stories_status ON stories (status);

CREATE TABLE IF NOT EXISTS shots (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL,
    story_id    UUID        NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    sequence    VARCHAR(64),
    title       VARCHAR(255),
    description TEXT,
    details     TEXT,
    narration   TEXT,
    type        TEXT,
    transition  VARCHAR(32) NOT NULL DEFAULT 'none',
    voice       VARCHAR(8),
    status      VARCHAR(16) NOT NULL DEFAULT 'pending',
    image_url   VARCHAR(512),
    bgm         VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shots_story_id ON shots (story_id);
CREATE INDEX IF NOT EXISTS idx_shots_story_sequence ON shots (story_id, sequence);
CREATE INDEX IF NOT EXISTS idx_shots_status ON shots (status);

CREATE TABLE IF NOT EXISTS operations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL,
    story_id    UUID        NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    shot_id     UUID        REFERENCES shots(id) ON DELETE SET NULL,
    type        VARCHAR(32) NOT NULL,
    payload     JSONB,
    status      VARCHAR(16) NOT NULL DEFAULT 'queued',
    retries     INTEGER     NOT NULL DEFAULT 0,
    error_msg   TEXT,
    worker      VARCHAR(64),
    started_at  TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_operations_story_id ON operations (story_id);
CREATE INDEX IF NOT EXISTS idx_operations_shot_id ON operations (shot_id);
CREATE INDEX IF NOT EXISTS idx_operations_status ON operations (status);




