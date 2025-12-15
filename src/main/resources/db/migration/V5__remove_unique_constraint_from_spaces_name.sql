-- Remove unique constraint from spaces.name
-- Space names should be unique only within space_templates, not across all events
-- Different events can have spaces with the same name (e.g., "Buddy" can exist in multiple events)

-- Drop the unique constraint if it exists
ALTER TABLE spaces DROP CONSTRAINT IF EXISTS spaces_name_key;

-- Also drop any unique index on name if it exists
DROP INDEX IF EXISTS spaces_name_key;

