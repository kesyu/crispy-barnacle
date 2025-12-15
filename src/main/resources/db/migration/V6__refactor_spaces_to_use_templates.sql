-- Refactor spaces table to use space templates
-- Spaces should reference space_templates instead of storing name/color directly
-- A bookable space is identified by event_id + space_id (where space_id references a space_template)

-- Step 1: Add space_template_id column (nullable initially for migration)
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS space_template_id BIGINT;

-- Step 2: Create foreign key constraint (will be added after data migration)
-- First, we need to migrate existing data if any exists
-- For existing spaces, try to match by name and color to space templates
-- If no match is found, we'll need to handle it (delete or create template)
-- For now, delete spaces that don't match any template (they're orphaned)
UPDATE spaces s
SET space_template_id = (
    SELECT st.id 
    FROM space_templates st 
    WHERE st.name = s.name 
    AND st.color = s.color 
    LIMIT 1
)
WHERE space_template_id IS NULL;

-- Delete any spaces that couldn't be matched to a template
DELETE FROM spaces WHERE space_template_id IS NULL;

-- Step 3: Remove name and color columns from spaces table
ALTER TABLE spaces DROP COLUMN IF EXISTS name;
ALTER TABLE spaces DROP COLUMN IF EXISTS color;

-- Step 4: Make space_template_id NOT NULL and add foreign key constraint
ALTER TABLE spaces ALTER COLUMN space_template_id SET NOT NULL;
ALTER TABLE spaces ADD CONSTRAINT fk_space_template FOREIGN KEY (space_template_id) REFERENCES space_templates(id) ON DELETE RESTRICT;

-- Step 5: Add unique constraint on (event_id, space_template_id) to prevent duplicate spaces per event
ALTER TABLE spaces ADD CONSTRAINT spaces_event_template_unique UNIQUE (event_id, space_template_id);

-- Grant privileges
GRANT ALL PRIVILEGES ON TABLE spaces TO velvetden;

