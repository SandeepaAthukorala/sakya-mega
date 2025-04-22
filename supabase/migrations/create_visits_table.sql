/*
      # Create visits table

      1. New Tables
        - `visits`
          - `id` (uuid, primary key)
          - `ref_id` (uuid, references users.id)
          - `buyer_name` (text)
          - `phone` (text)
          - `location` (jsonb)
          - `date` (timestamp)
          - `type` (text)
          - `status` (text)
          - `notes` (text, optional)
      2. Security
        - Enable RLS on `visits` table
        - Add policy for authenticated users to create, read, update, and delete their own visits
    */

    CREATE TABLE IF NOT EXISTS visits (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      ref_id uuid REFERENCES users(id),
      buyer_name text NOT NULL,
      phone text NOT NULL,
      location jsonb NOT NULL,
      date timestamptz NOT NULL,
      type text NOT NULL,
      status text NOT NULL,
      notes text
    );

    ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can manage own visits"
      ON visits
      FOR ALL
      TO authenticated
      USING (auth.uid() = ref_id);
