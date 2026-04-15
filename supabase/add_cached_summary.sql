-- Add cached AI summary column to feedback table
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS cached_ai_summary TEXT;
