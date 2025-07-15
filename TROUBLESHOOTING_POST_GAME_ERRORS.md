# Troubleshooting Post-Game Feature Errors

## 🚨 Current Errors You're Seeing

### Error 1: "mismatch between server and client bindings for postgres changes"
This indicates a real-time subscription conflict, likely due to multiple subscriptions or schema mismatches.

### Error 2: "Error saving post-game action: {}"
This suggests the `post_game_actions` table doesn't exist or isn't properly configured.

## 🔧 Quick Fix Steps

### Step 1: Check Database Setup
Run this in your Supabase SQL Editor:
```sql
-- Copy and paste the contents of check-database-setup.sql
```

### Step 2: Run the Migration
If Step 1 shows missing components, run:
```sql
-- Copy and paste the contents of simple-post-game-migration.sql
```

### Step 3: Restart Your Development Server
```bash
# Stop your dev server (Ctrl+C)
npm run dev
```

### Step 4: Clear Browser Cache
- Open Developer Tools (F12)
- Right-click the refresh button
- Select "Empty Cache and Hard Reload"

## 🔍 Detailed Troubleshooting

### If the migration fails:

1. **Check if you have the right permissions**
   ```sql
   SELECT current_user, session_user;
   ```

2. **Check if the games table exists**
   ```sql
   SELECT * FROM information_schema.tables WHERE table_name = 'games';
   ```

3. **Manually create the table if needed**
   ```sql
   -- Run the contents of simple-post-game-migration.sql section by section
   ```

### If real-time errors persist:

1. **Check real-time publication**
   ```sql
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   ```

2. **Re-enable real-time for all tables**
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
   ALTER PUBLICATION supabase_realtime ADD TABLE public.post_game_actions;
   ```

3. **Restart Supabase (if self-hosted)**
   - Go to your Supabase dashboard
   - Navigate to Settings > Database
   - Click "Restart Database" (if available)

### If post-game actions still don't save:

1. **Check RLS policies**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'post_game_actions';
   ```

2. **Test direct insert**
   ```sql
   -- Replace with actual values
   INSERT INTO post_game_actions (game_id, player_id, action) 
   VALUES ('your-game-id', 'your-user-id', 'play_again');
   ```

3. **Check user authentication**
   - Make sure you're logged in
   - Check browser console for auth errors

## 🎯 Expected Behavior After Fix

1. ✅ No real-time subscription errors in console
2. ✅ Post-game UI appears when games complete
3. ✅ "Play Again" and "Leave" buttons work
4. ✅ Actions are saved to database
5. ✅ Real-time updates work between players
   
## 🆘 If Nothing Works

### Fallback Option 1: Disable Post-Game Features Temporarily
Add this to your game page to disable post-game features:
```typescript
// In src/app/game/[id]/page.tsx, comment out the post-game props:
<ChessBoard
  // ... other props
  // onPlayAgain={handlePlayAgain}
  // onLeave={handleLeaveGame}
/>
```

### Fallback Option 2: Use Simple Game Over UI
The ChessBoard component will fall back to the simple "New Game" button if post-game features aren't available.

### Fallback Option 3: Manual Database Setup
If the migration scripts don't work, you can manually create the table in Supabase:

1. Go to Supabase Dashboard > Table Editor
2. Create new table: `post_game_actions`
3. Add columns:
   - `id` (uuid, primary key, default: uuid_generate_v4())
   - `game_id` (uuid, foreign key to games.id)
   - `player_id` (uuid, foreign key to users.id)
   - `action` (text)
   - `created_at` (timestamptz, default: now())
4. Add unique constraint on (game_id, player_id)
5. Enable RLS and add policies

## 📞 Getting Help

If you're still having issues:

1. **Check the browser console** for detailed error messages
2. **Check Supabase logs** in your dashboard
3. **Run the database check script** to see what's missing
4. **Share the specific error messages** for more targeted help

## 🔄 Recovery Steps

If you want to start fresh:

1. **Remove post-game features temporarily**
2. **Run the simple migration script**
3. **Test with a new game**
4. **Gradually re-enable features**

The chess game will work fine without post-game features - they're an enhancement, not a requirement for basic gameplay.
