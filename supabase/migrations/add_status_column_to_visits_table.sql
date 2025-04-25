/*
  # Add status column to visits table

  1. Modified Tables
    - `visits`
      - Added `status` column (text, NOT NULL, default 'Pending')
  2. Security
    - No security changes
*/

ALTER TABLE visits ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Pending';
