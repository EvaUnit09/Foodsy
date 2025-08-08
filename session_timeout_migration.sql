-- Updated Session Timeout Configuration
-- Now uses 1 hour max duration and 30 minutes inactivity timeout

ALTER TABLE session 
ADD COLUMN last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN expires_at TIMESTAMP;

-- Update existing sessions to have default values (1 hour from creation)
UPDATE session 
SET last_activity_at = created_at,
    expires_at = created_at + INTERVAL '1 hour'
WHERE last_activity_at IS NULL;
