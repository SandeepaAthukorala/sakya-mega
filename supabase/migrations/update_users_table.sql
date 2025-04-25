/*
      # Update users table

      1. Modified Tables
        - `users`
          - Removed `phone` column
      2. Security
        - Updated RLS policy to reflect changes
    */

    ALTER TABLE users DROP COLUMN IF EXISTS phone;

    DROP POLICY IF EXISTS "Users can read own data" ON users;

    CREATE POLICY "Users can read own data"
      ON users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
