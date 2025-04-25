/*
  # Add item_id column to visits table

  1. Modified Tables
    - `visits`
      - Added `item_id` column (text, optional)
  2. Security
    - No security changes
*/

ALTER TABLE visits ADD COLUMN IF NOT EXISTS item_id text;