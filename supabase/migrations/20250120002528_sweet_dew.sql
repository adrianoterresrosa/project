-- Get user ID and set master role
DO $$ 
DECLARE
  v_user_id uuid;
  v_master_role_id uuid;
BEGIN
  -- Get user ID by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'adrianoterresrosa@gmail.com';

  -- Get master role ID
  SELECT id INTO v_master_role_id
  FROM roles
  WHERE name = 'master';

  -- If user exists, assign master role
  IF v_user_id IS NOT NULL AND v_master_role_id IS NOT NULL THEN
    -- Remove existing user roles
    DELETE FROM user_roles WHERE user_id = v_user_id;
    
    -- Insert master role
    INSERT INTO user_roles (user_id, role_id)
    VALUES (v_user_id, v_master_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;
END $$;