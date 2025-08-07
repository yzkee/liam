-- Migration: Add checkpoint tables for LangGraph workflow persistence
-- Purpose: Create tables to store checkpoint data for session resumption
-- Affected tables: checkpoints, checkpoint_blobs, checkpoint_writes, checkpoint_migrations
-- Special considerations: All tables include organization_id for multi-tenant data isolation

BEGIN;

-- Create checkpoints table for main checkpoint metadata
-- This table stores the core checkpoint information including thread ID, namespace, and parent relationships
CREATE TABLE IF NOT EXISTS "public"."checkpoints" (
  "thread_id" text NOT NULL,
  "checkpoint_ns" text NOT NULL DEFAULT '',
  "checkpoint_id" text NOT NULL,
  "parent_checkpoint_id" text,
  "checkpoint" jsonb NOT NULL, -- Stores serialized checkpoint data (v, id, ts, channel_versions, versions_seen)
  "metadata" jsonb NOT NULL DEFAULT '{}', -- Custom metadata attached to checkpoints
  "organization_id" text NOT NULL, -- Organization isolation for multi-tenancy
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  PRIMARY KEY ("thread_id", "checkpoint_ns", "checkpoint_id", "organization_id")
);

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS "idx_checkpoints_organization_id" 
  ON "public"."checkpoints" ("organization_id");

CREATE INDEX IF NOT EXISTS "idx_checkpoints_thread_id" 
  ON "public"."checkpoints" ("thread_id", "checkpoint_ns");

CREATE INDEX IF NOT EXISTS "idx_checkpoints_parent" 
  ON "public"."checkpoints" ("parent_checkpoint_id") 
  WHERE "parent_checkpoint_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_checkpoints_created_at" 
  ON "public"."checkpoints" ("created_at" DESC);

-- Add comment for table documentation
COMMENT ON TABLE "public"."checkpoints" IS 'Stores LangGraph checkpoint metadata for workflow state persistence';
COMMENT ON COLUMN "public"."checkpoints"."thread_id" IS 'Unique identifier for the workflow thread';
COMMENT ON COLUMN "public"."checkpoints"."checkpoint_ns" IS 'Namespace for checkpoint isolation within a thread';
COMMENT ON COLUMN "public"."checkpoints"."checkpoint_id" IS 'Unique identifier for this checkpoint';
COMMENT ON COLUMN "public"."checkpoints"."parent_checkpoint_id" IS 'Reference to parent checkpoint for version history';
COMMENT ON COLUMN "public"."checkpoints"."checkpoint" IS 'Serialized checkpoint data including versions and metadata';
COMMENT ON COLUMN "public"."checkpoints"."metadata" IS 'Custom metadata attached to the checkpoint';
COMMENT ON COLUMN "public"."checkpoints"."organization_id" IS 'Organization ID for multi-tenant isolation';

-- Create checkpoint_blobs table for channel value storage
-- This table stores the actual channel values (state data) for each checkpoint
CREATE TABLE IF NOT EXISTS "public"."checkpoint_blobs" (
  "thread_id" text NOT NULL,
  "checkpoint_ns" text NOT NULL DEFAULT '',
  "channel" text NOT NULL, -- Channel name (e.g., 'messages', 'state')
  "version" text NOT NULL, -- Version number for this channel value
  "type" text NOT NULL, -- Serialization type (e.g., 'array', 'object', 'string', 'empty')
  "blob" bytea, -- Binary data (NULL for empty type)
  "organization_id" text NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  PRIMARY KEY ("thread_id", "checkpoint_ns", "channel", "version", "organization_id")
);

-- Add indexes for blob queries
CREATE INDEX IF NOT EXISTS "idx_checkpoint_blobs_organization_id" 
  ON "public"."checkpoint_blobs" ("organization_id");

CREATE INDEX IF NOT EXISTS "idx_checkpoint_blobs_thread_id" 
  ON "public"."checkpoint_blobs" ("thread_id", "checkpoint_ns");

-- Add comments for blob table
COMMENT ON TABLE "public"."checkpoint_blobs" IS 'Stores channel values (state data) for checkpoints';
COMMENT ON COLUMN "public"."checkpoint_blobs"."channel" IS 'Name of the channel containing state data';
COMMENT ON COLUMN "public"."checkpoint_blobs"."version" IS 'Version number for channel value tracking';
COMMENT ON COLUMN "public"."checkpoint_blobs"."type" IS 'Type hint for deserialization';
COMMENT ON COLUMN "public"."checkpoint_blobs"."blob" IS 'Binary serialized data';

-- Create checkpoint_writes table for pending operations
-- This table stores intermediate writes that haven't been committed to a checkpoint yet
CREATE TABLE IF NOT EXISTS "public"."checkpoint_writes" (
  "thread_id" text NOT NULL,
  "checkpoint_ns" text NOT NULL DEFAULT '',
  "checkpoint_id" text NOT NULL,
  "task_id" text NOT NULL, -- Task that generated this write
  "idx" integer NOT NULL, -- Index for ordering writes within a task
  "channel" text NOT NULL, -- Target channel for the write
  "type" text, -- Serialization type
  "blob" bytea NOT NULL, -- Binary write data
  "organization_id" text NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  PRIMARY KEY ("thread_id", "checkpoint_ns", "checkpoint_id", "task_id", "idx", "organization_id")
);

-- Add indexes for write queries
CREATE INDEX IF NOT EXISTS "idx_checkpoint_writes_organization_id" 
  ON "public"."checkpoint_writes" ("organization_id");

CREATE INDEX IF NOT EXISTS "idx_checkpoint_writes_checkpoint" 
  ON "public"."checkpoint_writes" ("thread_id", "checkpoint_ns", "checkpoint_id");

CREATE INDEX IF NOT EXISTS "idx_checkpoint_writes_task" 
  ON "public"."checkpoint_writes" ("task_id");

-- Add comments for writes table
COMMENT ON TABLE "public"."checkpoint_writes" IS 'Stores pending write operations for checkpoints';
COMMENT ON COLUMN "public"."checkpoint_writes"."task_id" IS 'Identifier of the task that generated this write';
COMMENT ON COLUMN "public"."checkpoint_writes"."idx" IS 'Index for ordering multiple writes from the same task';
COMMENT ON COLUMN "public"."checkpoint_writes"."channel" IS 'Target channel for the write operation';

-- Create checkpoint_migrations table for schema versioning
-- This table tracks which migrations have been applied for checkpoint system
CREATE TABLE IF NOT EXISTS "public"."checkpoint_migrations" (
  "v" integer PRIMARY KEY, -- Migration version number
  "organization_id" text NOT NULL,
  "created_at" timestamptz DEFAULT now()
);

-- Add index for migration queries
CREATE INDEX IF NOT EXISTS "idx_checkpoint_migrations_organization_id" 
  ON "public"."checkpoint_migrations" ("organization_id");

-- Add comment for migrations table
COMMENT ON TABLE "public"."checkpoint_migrations" IS 'Tracks applied checkpoint system migrations';
COMMENT ON COLUMN "public"."checkpoint_migrations"."v" IS 'Migration version number';

-- Create update trigger for checkpoints updated_at
CREATE OR REPLACE FUNCTION "public"."update_checkpoints_updated_at"()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to checkpoints table
CREATE TRIGGER "update_checkpoints_updated_at_trigger"
  BEFORE UPDATE ON "public"."checkpoints"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."update_checkpoints_updated_at"();

-- Add RLS policies (disabled by default, enable if needed)
-- These policies would restrict access to organization-owned data when RLS is enabled

-- Example RLS policies (uncomment and adjust if RLS is needed):
-- ALTER TABLE "public"."checkpoints" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "public"."checkpoint_blobs" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "public"."checkpoint_writes" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "public"."checkpoint_migrations" ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "checkpoints_organization_isolation" ON "public"."checkpoints"
--   FOR ALL USING (organization_id = current_setting('app.organization_id')::text);

-- CREATE POLICY "checkpoint_blobs_organization_isolation" ON "public"."checkpoint_blobs"
--   FOR ALL USING (organization_id = current_setting('app.organization_id')::text);

-- CREATE POLICY "checkpoint_writes_organization_isolation" ON "public"."checkpoint_writes"
--   FOR ALL USING (organization_id = current_setting('app.organization_id')::text);

-- CREATE POLICY "checkpoint_migrations_organization_isolation" ON "public"."checkpoint_migrations"
--   FOR ALL USING (organization_id = current_setting('app.organization_id')::text);

COMMIT;