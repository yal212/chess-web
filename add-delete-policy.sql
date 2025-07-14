-- Add DELETE policy for games table
-- This allows users to delete games they created (as white player)

CREATE POLICY "Users can delete games they created" ON games FOR DELETE USING (
  auth.uid() = white_player_id
);
