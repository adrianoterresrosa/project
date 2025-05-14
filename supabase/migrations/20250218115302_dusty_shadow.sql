-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own entry cost centers" ON entry_cost_centers;
DROP POLICY IF EXISTS "Users can manage their own entry cost centers" ON entry_cost_centers;

-- Create more permissive policies for entry cost centers
CREATE POLICY "Enable all operations for users own entry cost centers"
ON entry_cost_centers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM entries e
    WHERE e.id = entry_id
    AND e.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM entries e
    WHERE e.id = entry_id
    AND e.user_id = auth.uid()
  )
);

-- Create policy for cost centers access
CREATE POLICY "Enable access to cost centers for entry allocations"
ON cost_centers
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Refresh RLS
ALTER TABLE entry_cost_centers DISABLE ROW LEVEL SECURITY;
ALTER TABLE entry_cost_centers ENABLE ROW LEVEL SECURITY;

-- Create function to get entry cost centers with info
CREATE OR REPLACE FUNCTION get_entry_cost_centers(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  entry_id uuid,
  cost_center_id uuid,
  percentage decimal,
  amount decimal,
  cost_center_name text,
  entry_user_id uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ecc.id,
    ecc.entry_id,
    ecc.cost_center_id,
    ecc.percentage,
    ecc.amount,
    cc.name as cost_center_name,
    e.user_id
  FROM entry_cost_centers ecc
  JOIN cost_centers cc ON ecc.cost_center_id = cc.id
  JOIN entries e ON ecc.entry_id = e.id
  WHERE e.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;