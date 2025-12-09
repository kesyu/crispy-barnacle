-- Migration script to add PICTURE_REQUESTED status
-- The Velvet Den - Add Picture Requested Status

-- Drop the existing check constraint (PostgreSQL auto-generates constraint names)
-- Find and drop any existing status check constraint
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find the constraint name for the status check
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'users'::regclass
      AND contype = 'c'
      AND (pg_get_constraintdef(oid) LIKE '%status%IN_REVIEW%' 
           OR pg_get_constraintdef(oid) LIKE '%status%APPROVED%');
    
    -- Drop the constraint if found
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE users DROP CONSTRAINT ' || quote_ident(constraint_name);
    END IF;
END $$;

-- Add the new check constraint with PICTURE_REQUESTED status
ALTER TABLE users ADD CONSTRAINT users_status_check 
    CHECK (status IN ('IN_REVIEW', 'APPROVED', 'REJECTED', 'DECLINED', 'PICTURE_REQUESTED'));

