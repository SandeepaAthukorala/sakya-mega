/*
  # Create items table

  1. New Tables
    - `items`
      - `id` (uuid, primary key)
      - `item_name` (text, not null)
      - `item_number` (integer, not null)
  2. Security
    - Enable RLS on `items` table
    - Add policy for authenticated users to create, read, update, and delete their own items
*/

CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  item_number integer NOT NULL
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own items"
  ON items
  FOR ALL
  TO authenticated
  USING (true);