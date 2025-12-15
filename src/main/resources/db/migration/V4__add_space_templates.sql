-- Add space_templates table
CREATE TABLE space_templates (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    color VARCHAR(255) NOT NULL CHECK (color IN ('GREEN', 'YELLOW', 'ORANGE', 'BLUE', 'PURPLE', 'WHITE')),
    description VARCHAR(500)
);

-- Create index for better query performance
CREATE INDEX idx_space_templates_name ON space_templates(name);

-- Grant privileges to velvetden user
GRANT ALL PRIVILEGES ON TABLE space_templates TO velvetden;
GRANT ALL PRIVILEGES ON SEQUENCE space_templates_id_seq TO velvetden;

-- Insert some default space templates
INSERT INTO space_templates (name, color, description) VALUES
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
    ('Sadie', 'WHITE', 'Elegant and refined');

