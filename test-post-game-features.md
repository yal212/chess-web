# Testing Post-Game Features

This document outlines how to test the new post-game functionality.

## Prerequisites

1. Run the migration script in Supabase:
   ```sql
   -- Copy and paste the contents of post-game-actions-migration.sql into your Supabase SQL Editor
   ```

2. Make sure you have at least two user accounts to test multiplayer functionality.

## Test Scenarios

### 1. Game Completion by Checkmate

1. Start a new game with two players
2. Play moves until one player achieves checkmate
3. Verify:
   - Game status updates to "completed" in database
   - Winner is correctly identified
   - Result reason is set to "checkmate"
   - PostGameActions component appears with play again/leave options
   - Both players see the same game result

### 2. Game Completion by Resignation

1. Start a new game with two players
2. One player clicks the "Resign" button
3. Verify:
   - Game status updates to "completed" in database
   - Winner is the non-resigning player
   - Result reason is set to "resignation"
   - PostGameActions component appears
   - Both players see the resignation message

### 3. Play Again Functionality

1. Complete a game (checkmate or resignation)
2. Both players click "Play Again"
3. Verify:
   - New game is created automatically
   - Players are redirected to the new game
   - Colors are swapped (white becomes black, black becomes white)
   - Old game remains in completed state

### 4. Leave Game Functionality

1. Complete a game
2. One or both players click "Leave Game"
3. Verify:
   - Player action is recorded in post_game_actions table
   - Players are redirected to the play page
   - Game remains accessible until both players leave

### 5. Mixed Actions (One Play Again, One Leave)

1. Complete a game
2. Player 1 clicks "Play Again"
3. Player 2 clicks "Leave Game"
4. Verify:
   - No new game is created
   - Player 1 sees "Waiting for opponent" message
   - Player 2 is redirected to play page
   - Actions are properly recorded

### 6. Abandoned Game Cleanup

1. Create a waiting game and don't join it
2. Wait 30+ minutes (or modify WAITING_GAME_TIMEOUT_MINUTES for faster testing)
3. Visit the play page
4. Verify:
   - Stale waiting games are marked as "abandoned"
   - They no longer appear in the available games list

### 7. Old Completed Game Cleanup

1. Create completed games with both players having "leave" actions
2. Modify the cleanup function to use a shorter time period for testing
3. Run the cleanup
4. Verify:
   - Old completed games are deleted
   - Games where players haven't left are preserved

### 8. Real-time Synchronization

1. Open the same completed game in two browser windows (different players)
2. In one window, click "Play Again"
3. Verify:
   - The other window immediately shows the opponent's choice
   - Status messages update in real-time
   - When both choose "Play Again", both are redirected simultaneously

## Database Verification

Check the following tables after testing:

### games table
```sql
SELECT id, status, winner, result_reason, completed_at, created_at 
FROM games 
WHERE status = 'completed' 
ORDER BY completed_at DESC;
```

### post_game_actions table
```sql
SELECT pga.*, g.status as game_status, u.display_name 
FROM post_game_actions pga
JOIN games g ON pga.game_id = g.id
JOIN users u ON pga.player_id = u.id
ORDER BY pga.created_at DESC;
```

### Cleanup verification
```sql
-- Check for abandoned games
SELECT COUNT(*) as abandoned_count FROM games WHERE status = 'abandoned';

-- Check for old completed games
SELECT COUNT(*) as old_completed_count 
FROM games 
WHERE status = 'completed' 
AND completed_at < NOW() - INTERVAL '7 days';
```

## Expected Behavior

- ✅ Games complete automatically when checkmate/stalemate occurs
- ✅ Resignation properly ends games and updates database
- ✅ Post-game UI appears only for completed games
- ✅ Play again creates new games with swapped colors
- ✅ Leave game redirects to play page
- ✅ Real-time updates work for post-game actions
- ✅ Abandoned games are cleaned up automatically
- ✅ Old completed games are cleaned up when both players have left

## Troubleshooting

### Real-time not working
1. Check if post_game_actions table is added to supabase_realtime publication
2. Verify RLS policies allow users to see post-game actions
3. Check browser console for subscription errors

### Database updates not happening
1. Verify migration script ran successfully
2. Check RLS policies for games and post_game_actions tables
3. Ensure user has proper permissions

### Cleanup not working
1. Check if cleanup_old_completed_games function exists
2. Verify the function has proper permissions
3. Check for any foreign key constraint issues
