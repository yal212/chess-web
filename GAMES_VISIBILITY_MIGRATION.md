# Games Visibility Migration Instructions

## Overview
This migration updates the Row Level Security (RLS) policy for the `games` table to allow users to see available games they can join, in addition to their own games.

## What This Fixes
- **Before**: Users could only see games they were already part of
- **After**: Users can see their own games + games with `status='waiting'` that are available to join

## Migration Steps

### Step 1: Access Supabase Dashboard
1. Go to your Supabase dashboard
2. Navigate to the **SQL Editor** tab

### Step 2: Run the Migration
1. Copy the entire contents of the `update-games-rls-policy.sql` file
2. Paste it into the SQL Editor
3. Click **Run** to execute the SQL

### Step 3: Verify the Migration
After running the SQL, you should see:
- "Current Games RLS Policies" - showing the old policy
- "Updated Games RLS Policies" - showing the new policy
- "Policy Test - Visible Games" - showing games that are now visible
- "Games RLS Policy Update Complete" - confirmation message

## Expected Results

### New Policy Logic
```sql
-- Users can see games where they are:
-- 1. The white player (game creator)
-- 2. The black player (joined player)
-- 3. Games waiting for a black player (available to join)
auth.uid() = white_player_id OR 
auth.uid() = black_player_id OR
(status = 'waiting' AND black_player_id IS NULL)
```

### What Users Will See
- **My Games**: Games where they are white_player or black_player
- **Available Games**: Games with status='waiting' and no black_player

## Rollback Instructions (If Needed)

If you need to rollback to the original policy:

```sql
-- Drop the new policy
DROP POLICY IF EXISTS "Users can view their games and available games" ON games;

-- Restore the original policy
CREATE POLICY "Users can view games they're part of" ON games FOR SELECT USING (
  auth.uid() = white_player_id OR auth.uid() = black_player_id
);
```

## Testing the Migration

After running the migration:

1. Go to your chess app at `/play`
2. You should now see two sections:
   - Your existing games
   - Available games to join (if any exist)
3. Try creating a new game with one account
4. Sign in with a different account - you should see the first account's game as "available to join"

## Security Notes

This migration maintains security by:
- Only showing waiting games (not active/completed games from other users)
- Only showing games that actually need a second player
- Preserving all existing access controls for game updates and moves
