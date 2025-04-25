/*
      # Add check constraint to users table

      1. Modified Tables
        - `users`
          - Added check constraint to `role` column to only allow 'Ref' or 'Admin'
      2. Security
        - No security changes
    */

    -- The check constraint already exists, so this statement is not needed.
    -- ALTER TABLE users
    -- ADD CONSTRAINT users_role_check
    -- CHECK (role IN ('Ref', 'Admin'));
