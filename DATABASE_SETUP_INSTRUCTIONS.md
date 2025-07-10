# Database Setup Instructions

## Problem
You're getting an "Error creating game: {}" error because the games table and related tables don't exist in your Supabase database yet.

## Solution

### Step 1: Access Supabase Dashboard
1. Go to your Supabase dashboard: https://vudqdubrlkouxjourunl.supabase.co
2. Navigate to the **SQL Editor** tab

### Step 2: Run the Database Setup
1. Copy the entire contents of the `setup-games-table.sql` file
2. Paste it into the SQL Editor
3. Click **Run** to execute the SQL

This will create:
- `games` table for storing chess games
- `game_moves` table for detailed move history  
- `chat_messages` table for in-game chat
- All necessary Row Level Security (RLS) policies
- Database indexes for performance

### Step 3: Verify the Setup
After running the SQL, you should see success messages like:
- "Games table created successfully"
- "Game moves table created successfully" 
- "Chat messages table created successfully"

### Step 4: Test Game Creation
1. Go back to your chess app at http://localhost:3003/play
2. Try clicking "Create New Game" again
3. The error should be resolved and you should be redirected to a new game

## What This Fixes
- Creates the missing `games` table that stores chess game data
- Sets up proper foreign key relationships with the `users` table
- Configures Row Level Security so users can only access their own games
- Adds database triggers for automatic timestamp updates
- Creates indexes for better query performance

## Troubleshooting
If you still get errors after running the setup:
1. Check the browser console for detailed error messages
2. Verify that the `users` table exists and has your user profile
3. Make sure you're signed in with Google OAuth
4. Check that the RLS policies allow your user to create games

The enhanced error logging in the app will now show you exactly what's wrong if there are still issues.
