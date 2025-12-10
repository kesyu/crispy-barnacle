-- Migration script to remove DECLINED status
-- The Velvet Den - Remove DECLINED Status
-- DECLINED status is removed, REJECTED should be used instead
-- If any users have DECLINED status, they will be converted to REJECTED

-- First, update any existing DECLINED users to REJECTED
UPDATE users SET status = 'REJECTED' WHERE status = 'DECLINED';

-- Drop the existing check constraint
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

-- Add the new check constraint without DECLINED status
ALTER TABLE users ADD CONSTRAINT users_status_check 
    CHECK (status IN ('IN_REVIEW', 'APPROVED', 'REJECTED', 'PICTURE_REQUESTED'));

