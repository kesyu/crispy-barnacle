-- Add cancelled field to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS cancelled BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_events_cancelled ON events(cancelled);

