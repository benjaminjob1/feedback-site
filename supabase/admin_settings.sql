-- Admin Settings Table
-- Stores admin preferences for notifications and defaults

CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  notify_new_user_signup BOOLEAN DEFAULT true NOT NULL,
  default_notify_new_feedback BOOLEAN DEFAULT false NOT NULL,
  default_notify_edited_feedback BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(admin_user_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_admin_settings_user_id ON admin_settings(admin_user_id);

-- Enable RLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only admin can manage their own settings
CREATE POLICY "Admin can manage own settings"
  ON admin_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Anyone can read admin settings (needed for checking defaults)
CREATE POLICY "Anyone can read admin settings"
  ON admin_settings
  FOR SELECT
  USING (true);

-- Function to auto-create default admin settings for new admins
CREATE OR REPLACE FUNCTION create_default_admin_settings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    INSERT INTO admin_settings (admin_user_id)
    VALUES (NEW.id)
    ON CONFLICT (admin_user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create settings when a user becomes admin
DROP TRIGGER IF EXISTS on_profile_update_create_admin_settings ON profiles;
CREATE TRIGGER on_profile_update_create_admin_settings
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_admin_settings();

-- Backfill existing admin with default settings
INSERT INTO admin_settings (admin_user_id)
SELECT id FROM profiles
WHERE role = 'admin'
AND NOT EXISTS (
  SELECT 1 FROM admin_settings WHERE admin_settings.admin_user_id = profiles.id
)
ON CONFLICT (admin_user_id) DO NOTHING;
