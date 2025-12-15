-- Add space_templates table
CREATE TABLE IF NOT EXISTS space_templates (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    color VARCHAR(255) NOT NULL CHECK (color IN ('GREEN', 'YELLOW', 'ORANGE', 'BLUE', 'PURPLE', 'WHITE')),
    description VARCHAR(500)
);

-- Create index for better query performance (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_space_templates_name ON space_templates(name);

-- Grant privileges to velvetden user
GRANT ALL PRIVILEGES ON TABLE space_templates TO velvetden;
GRANT ALL PRIVILEGES ON SEQUENCE space_templates_id_seq TO velvetden;

-- Insert some default space templates (only if they don't already exist)
INSERT INTO space_templates (name, color, description) 
SELECT * FROM (VALUES
    ('Buddy', 'GREEN', 'Friendly and energetic'),
    ('Max', 'YELLOW', 'Loyal companion'),
    ('Rocky', 'ORANGE', 'Adventurous spirit'),
    ('Charlie', 'BLUE', 'Playful and fun'),
    ('Duke', 'PURPLE', 'Noble and calm'),
    ('Cooper', 'WHITE', 'Gentle and kind'),
    ('Bella', 'GREEN', 'Beautiful and graceful'),
    ('Luna', 'YELLOW', 'Bright and cheerful'),
    ('Milo', 'ORANGE', 'Curious explorer'),
    ('Lucy', 'BLUE', 'Sweet and loving'),
    ('Bailey', 'PURPLE', 'Gentle giant'),
    ('Sadie', 'WHITE', 'Elegant and refined')
) AS v(name, color, description)
WHERE NOT EXISTS (
    SELECT 1 FROM space_templates WHERE space_templates.name = v.name
);

