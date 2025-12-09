-- Migration script to restore database to current structure
-- The Velvet Den - Initial Schema
-- Run this script to recreate the database structure from scratch

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS spaces CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL CHECK (status IN ('IN_REVIEW', 'APPROVED', 'REJECTED')),
    verification_image_path VARCHAR(1000),
    verification_notes VARCHAR(1000),
    created_at TIMESTAMP(6) NOT NULL
);

-- Create events table
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    city VARCHAR(255) NOT NULL,
    date_time TIMESTAMP(6) NOT NULL,
    is_upcoming BOOLEAN NOT NULL
);

-- Create spaces table
CREATE TABLE spaces (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    color VARCHAR(255) NOT NULL CHECK (color IN ('GREEN', 'YELLOW', 'ORANGE', 'BLUE', 'PURPLE', 'WHITE')),
    event_id BIGINT NOT NULL,
    user_id BIGINT,
    CONSTRAINT fk_space_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    CONSTRAINT fk_space_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_spaces_event_id ON spaces(event_id);
CREATE INDEX idx_spaces_user_id ON spaces(user_id);
CREATE INDEX idx_events_is_upcoming ON events(is_upcoming);
CREATE INDEX idx_events_date_time ON events(date_time);

-- Grant privileges to velvetden user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO velvetden;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO velvetden;

