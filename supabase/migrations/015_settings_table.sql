-- Settings table for per-pharmacy configuration
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (pharmacy_id, key)
);

-- RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Read: all authenticated users in their pharmacy
CREATE POLICY "Users can view settings in their pharmacy" ON settings
  FOR SELECT USING (
    pharmacy_id IN (SELECT pharmacy_id FROM profiles WHERE id = auth.uid())
  );

-- Manage: owners/managers can upsert settings
CREATE POLICY "Managers and owners can manage settings" ON settings
  FOR ALL USING (
    pharmacy_id IN (SELECT pharmacy_id FROM profiles WHERE id = auth.uid()) AND
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','manager')
    )
  );

-- Optional: allow INSERT without specifying pharmacy_id by defaulting to user's pharmacy via trigger
CREATE OR REPLACE FUNCTION set_settings_pharmacy_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.pharmacy_id IS NULL THEN
    NEW.pharmacy_id := (SELECT pharmacy_id FROM profiles WHERE id = auth.uid());
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_settings_pharmacy_id ON settings;
CREATE TRIGGER trg_set_settings_pharmacy_id
BEFORE INSERT OR UPDATE ON settings
FOR EACH ROW
EXECUTE FUNCTION set_settings_pharmacy_id();

