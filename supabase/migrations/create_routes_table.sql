/*
  # Create routes table

  1. New Tables
    - `routes`
      - `id` (uuid, primary key)
      - `ref_id` (uuid, references users.id)
      - `name` (text)
      - `number` (integer)
  2. Security
    - Enable RLS on `routes` table
    - Add policy for authenticated users to create, read, update, and delete their own routes
*/

CREATE TABLE IF NOT EXISTS routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id uuid REFERENCES users(id),
  name text NOT NULL,
  number integer NOT NULL
);

ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own routes"
  ON routes
  FOR ALL
  TO authenticated
  USING (auth.uid() = ref_id);