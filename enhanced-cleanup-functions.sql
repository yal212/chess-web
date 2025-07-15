-- Enhanced Game Cleanup Functions
-- Run this in your Supabase SQL Editor to add enhanced cleanup capabilities

-- Function to get cleanup statistics
CREATE OR REPLACE FUNCTION get_cleanup_stats()
RETURNS JSON AS $$
DECLARE
  waiting_count INTEGER;
  completed_count INTEGER;
  abandoned_count INTEGER;
  old_completed_count INTEGER;
  stale_waiting_count INTEGER;
  result JSON;
BEGIN
  -- Count waiting games
  SELECT COUNT(*) INTO waiting_count
  FROM games 
  WHERE status = 'waiting';

  -- Count completed games
  SELECT COUNT(*) INTO completed_count
  FROM games 
  WHERE status = 'completed';

  -- Count abandoned games
  SELECT COUNT(*) INTO abandoned_count
  FROM games 
  WHERE status = 'abandoned';

  -- Count old completed games (7+ days)
  SELECT COUNT(*) INTO old_completed_count
  FROM games 
  WHERE status = 'completed' 
  AND completed_at < NOW() - INTERVAL '7 days';

  -- Count stale waiting games (30+ minutes)
  SELECT COUNT(*) INTO stale_waiting_count
  FROM games 
  WHERE status = 'waiting' 
  AND created_at < NOW() - INTERVAL '30 minutes';

  -- Build result JSON
  result := json_build_object(
    'waiting_games', waiting_count,
    'completed_games', completed_count,
    'abandoned_games', abandoned_count,
    'old_completed_games', old_completed_count,
    'stale_waiting_games', stale_waiting_count,
    'total_games', waiting_count + completed_count + abandoned_count
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Enhanced cleanup function for abandoned games
CREATE OR REPLACE FUNCTION cleanup_abandoned_games(days_old INTEGER DEFAULT 1)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete abandoned games older than specified days
  WITH games_to_delete AS (
    SELECT id
    FROM games
    WHERE status = 'abandoned'
    AND created_at < NOW() - INTERVAL '1 day' * days_old
  )
  DELETE FROM games 
  WHERE id IN (SELECT id FROM games_to_delete);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup stale waiting games
CREATE OR REPLACE FUNCTION cleanup_stale_waiting_games(minutes_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Mark stale waiting games as abandoned
  WITH games_to_update AS (
    SELECT id
    FROM games
    WHERE status = 'waiting'
    AND created_at < NOW() - INTERVAL '1 minute' * minutes_old
  )
  UPDATE games 
  SET status = 'abandoned', updated_at = NOW()
  WHERE id IN (SELECT id FROM games_to_update);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup games by specific user (for user account deletion)
CREATE OR REPLACE FUNCTION cleanup_user_games(user_id_param UUID)
RETURNS JSON AS $$
DECLARE
  deleted_waiting INTEGER;
  deleted_completed INTEGER;
  deleted_abandoned INTEGER;
  result JSON;
BEGIN
  -- Delete waiting games created by user
  DELETE FROM games 
  WHERE white_player_id = user_id_param 
  AND status = 'waiting';
  GET DIAGNOSTICS deleted_waiting = ROW_COUNT;

  -- Delete completed games where user was the only player
  DELETE FROM games 
  WHERE (white_player_id = user_id_param AND black_player_id IS NULL)
  OR (black_player_id = user_id_param AND white_player_id IS NULL)
  AND status = 'completed';
  GET DIAGNOSTICS deleted_completed = ROW_COUNT;

  -- Delete abandoned games involving user
  DELETE FROM games 
  WHERE (white_player_id = user_id_param OR black_player_id = user_id_param)
  AND status = 'abandoned';
  GET DIAGNOSTICS deleted_abandoned = ROW_COUNT;

  result := json_build_object(
    'deleted_waiting', deleted_waiting,
    'deleted_completed', deleted_completed,
    'deleted_abandoned', deleted_abandoned,
    'total_deleted', deleted_waiting + deleted_completed + deleted_abandoned
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function for comprehensive cleanup with detailed results
CREATE OR REPLACE FUNCTION comprehensive_cleanup(
  stale_waiting_minutes INTEGER DEFAULT 30,
  old_completed_days INTEGER DEFAULT 7,
  old_abandoned_days INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  stale_waiting_count INTEGER;
  old_completed_count INTEGER;
  old_abandoned_count INTEGER;
  result JSON;
BEGIN
  -- Cleanup stale waiting games
  SELECT cleanup_stale_waiting_games(stale_waiting_minutes) INTO stale_waiting_count;
  
  -- Cleanup old completed games
  SELECT cleanup_old_completed_games(old_completed_days) INTO old_completed_count;
  
  -- Cleanup old abandoned games
  SELECT cleanup_abandoned_games(old_abandoned_days) INTO old_abandoned_count;

  result := json_build_object(
    'stale_waiting_marked_abandoned', stale_waiting_count,
    'old_completed_deleted', old_completed_count,
    'old_abandoned_deleted', old_abandoned_count,
    'total_actions', stale_waiting_count + old_completed_count + old_abandoned_count,
    'cleanup_timestamp', NOW()
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_cleanup_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_abandoned_games(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_stale_waiting_games(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_user_games(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION comprehensive_cleanup(INTEGER, INTEGER, INTEGER) TO authenticated;

-- Create a view for easy cleanup monitoring
CREATE OR REPLACE VIEW cleanup_monitoring AS
SELECT 
  'waiting' as game_type,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM games 
WHERE status = 'waiting'
UNION ALL
SELECT 
  'completed' as game_type,
  COUNT(*) as count,
  MIN(completed_at) as oldest,
  MAX(completed_at) as newest
FROM games 
WHERE status = 'completed'
UNION ALL
SELECT 
  'abandoned' as game_type,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM games 
WHERE status = 'abandoned'
UNION ALL
SELECT 
  'stale_waiting' as game_type,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM games 
WHERE status = 'waiting' 
AND created_at < NOW() - INTERVAL '30 minutes'
UNION ALL
SELECT 
  'old_completed' as game_type,
  COUNT(*) as count,
  MIN(completed_at) as oldest,
  MAX(completed_at) as newest
FROM games 
WHERE status = 'completed' 
AND completed_at < NOW() - INTERVAL '7 days';

-- Grant select on the view
GRANT SELECT ON cleanup_monitoring TO authenticated;

-- Success message
SELECT 'Enhanced cleanup functions installed successfully!' as status;
