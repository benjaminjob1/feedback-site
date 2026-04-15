-- Create action_plans table for storing AI-generated action plans
CREATE TABLE IF NOT EXISTS action_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site TEXT NOT NULL,
  summary TEXT NOT NULL,
  issues TEXT NOT NULL, -- JSON array of identified issues
  action_items TEXT NOT NULL, -- JSON array of action items
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed')),
  comments TEXT, -- Admin comments/notes
  feedback_ids TEXT, -- JSON array of feedback IDs used to create this plan
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;

-- Allow admins to do everything
CREATE POLICY "Admins can manage action_plans" ON action_plans
  FOR ALL USING (true);

-- Index for querying by site
CREATE INDEX IF NOT EXISTS idx_action_plans_site ON action_plans(site);
CREATE INDEX IF NOT EXISTS idx_action_plans_status ON action_plans(status);

-- Add comments column if it doesn't exist
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS comments TEXT;
