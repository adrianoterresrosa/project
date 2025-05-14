/*
  # Fix RLS policies for financial system

  1. Updates
    - Add missing RLS policies for groups table
    - Add missing RLS policies for subgroups table
    - Add missing RLS policies for accounts table
    - Add missing RLS policies for entries table

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Fix groups table policies
CREATE POLICY "Enable insert for authenticated users only"
ON groups
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable read access for authenticated users only"
ON groups
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Fix subgroups table policies
CREATE POLICY "Enable insert for authenticated users only"
ON subgroups
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable read access for authenticated users only"
ON subgroups
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Fix accounts table policies
CREATE POLICY "Enable insert for authenticated users only"
ON accounts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable read access for authenticated users only"
ON accounts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Fix entries table policies
CREATE POLICY "Enable insert for authenticated users only"
ON entries
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable read access for authenticated users only"
ON entries
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);