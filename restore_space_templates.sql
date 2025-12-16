-- Restore the original 6 space templates from the demo event
-- These are the templates used in the original demo event

INSERT INTO space_templates (name, color) 
VALUES
    ('Buddy', 'GREEN'),
    ('Max', 'YELLOW'),
    ('Rocky', 'ORANGE'),
    ('Charlie', 'BLUE'),
    ('Duke', 'PURPLE'),
    ('Cooper', 'WHITE')
ON CONFLICT (name) DO NOTHING;

-- Verify the templates were created
SELECT id, name, color FROM space_templates ORDER BY name;


