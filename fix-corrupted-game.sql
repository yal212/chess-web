-- Fix the corrupted game state
-- Run this in your Supabase SQL Editor

-- First, let's see the current state of the corrupted game
SELECT 
  id,
  moves,
  game_state,
  array_length(moves, 1) as move_count,
  status
FROM games 
WHERE id = '598757f2-8613-4cb2-8f9b-862d75864f34';

-- Clean up the corrupted game by reconstructing it with only valid moves
-- Based on your description: e4 (white) and d5 (black)
UPDATE games 
SET 
  moves = ARRAY['e4', 'd5'],
  game_state = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2',
  updated_at = NOW()
WHERE id = '598757f2-8613-4cb2-8f9b-862d75864f34';

-- Verify the fix
SELECT 
  'After cleanup:' as status,
  id,
  moves,
  game_state,
  array_length(moves, 1) as move_count
FROM games 
WHERE id = '598757f2-8613-4cb2-8f9b-862d75864f34';

-- Also clean up any corrupted move records in game_moves table
DELETE FROM game_moves 
WHERE game_id = '598757f2-8613-4cb2-8f9b-862d75864f34';

-- Insert the correct moves
INSERT INTO game_moves (game_id, player_id, move, fen_after, move_number, created_at)
VALUES 
  ('598757f2-8613-4cb2-8f9b-862d75864f34', 'a77137bd-9b31-40ef-bc66-ad6551c11245', 'e4', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', 1, NOW()),
  ('598757f2-8613-4cb2-8f9b-862d75864f34', '6a0744a7-364b-40fe-bb70-2f63b03d7149', 'd5', 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2', 2, NOW());

SELECT 'Game cleanup completed!' as result;
