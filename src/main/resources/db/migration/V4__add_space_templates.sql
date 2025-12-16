-- Add space_templates table
CREATE TABLE IF NOT EXISTS space_templates (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    color VARCHAR(255) NOT NULL CHECK (color IN ('GREEN', 'YELLOW', 'ORANGE', 'BLUE', 'PURPLE', 'WHITE'))
);

-- Create index for better query performance (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_space_templates_name ON space_templates(name);

-- Grant privileges to velvetden user
GRANT ALL PRIVILEGES ON TABLE space_templates TO velvetden;
GRANT ALL PRIVILEGES ON SEQUENCE space_templates_id_seq TO velvetden;

-- Insert the original 6 space templates from the demo event (only if they don't already exist)
INSERT INTO space_templates (name, color) 
SELECT * FROM (VALUES
    ('Buddy', 'GREEN'),
    ('Max', 'YELLOW'),
    ('Rocky', 'ORANGE'),
    ('Charlie', 'BLUE'),
    ('Duke', 'PURPLE'),
    ('Cooper', 'WHITE')
) AS v(name, color)
WHERE NOT EXISTS (
    SELECT 1 FROM space_templates WHERE space_templates.name = v.name
);

