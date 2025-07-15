# Enhanced Game Cleanup System

The chess web application now includes a comprehensive game cleanup system to maintain database performance and provide a clean user experience.

## 🎯 Features

### Automatic Cleanup
- **Periodic Cleanup**: Runs every 5 minutes automatically
- **Stale Waiting Games**: Games waiting for players for 30+ minutes are marked as abandoned
- **Old Completed Games**: Completed games older than 7 days (where both players have left) are deleted
- **Old Abandoned Games**: Abandoned games older than 1 day are deleted

### Manual Cleanup Options
- **Quick Cleanup**: One-click cleanup with immediate feedback
- **Full Cleanup Panel**: Advanced cleanup interface with statistics
- **Individual Cleanup**: Separate controls for different game types

### Cleanup Statistics
- Real-time game counts by status
- Identification of games eligible for cleanup
- Cleanup history and results tracking

## 🛠️ Components

### 1. GameCleanupPanel Component
**Location**: `src/components/admin/GameCleanupPanel.tsx`

**Features**:
- Real-time cleanup statistics
- Quick and comprehensive cleanup options
- Detailed cleanup results with success/failure indicators
- Advanced options with cleanup rules explanation

**Usage**:
```tsx
import GameCleanupPanel from '@/components/admin/GameCleanupPanel'

// In your component
<GameCleanupPanel />
```

### 2. Enhanced Play Page
**Location**: `src/app/play/page.tsx`

**New Features**:
- Quick cleanup button with user feedback
- Toggle for cleanup panel visibility
- Enhanced cleanup function with detailed results
- Automatic cleanup on page load and periodic intervals

### 3. Database Functions
**Location**: `enhanced-cleanup-functions.sql`

**New Functions**:
- `get_cleanup_stats()`: Returns JSON with cleanup statistics
- `cleanup_abandoned_games(days_old)`: Deletes old abandoned games
- `cleanup_stale_waiting_games(minutes_old)`: Marks stale waiting games as abandoned
- `cleanup_user_games(user_id)`: Cleans up games for specific user
- `comprehensive_cleanup()`: Runs all cleanup operations with detailed results

## 📊 Cleanup Rules

### Waiting Games → Abandoned
- **Trigger**: Games in 'waiting' status for 30+ minutes
- **Action**: Status changed to 'abandoned'
- **Reason**: Prevents stale games from cluttering the available games list

### Completed Games → Deleted
- **Trigger**: Games in 'completed' status for 7+ days AND both players have left
- **Action**: Game record deleted from database
- **Reason**: Removes old games that are no longer relevant

### Abandoned Games → Deleted
- **Trigger**: Games in 'abandoned' status for 1+ day
- **Action**: Game record deleted from database
- **Reason**: Cleans up games that were never properly started

## 🎮 User Interface

### Quick Cleanup Button
- Available on the main play page
- Shows immediate feedback with alert dialog
- Displays detailed results of cleanup operation

### Cleanup Panel
- Toggle visibility with "Show/Hide Cleanup Panel" button
- Real-time statistics display
- Two cleanup options:
  - **Quick Cleanup**: Fast, comprehensive cleanup
  - **Full Cleanup**: Detailed cleanup with individual operations

### Statistics Display
- **Waiting Games**: Current count of games waiting for players
- **Completed Games**: Total completed games in database
- **Abandoned Games**: Games that were abandoned
- **Old Completed (7+ days)**: Completed games eligible for deletion

## 🔧 Configuration

### Timing Parameters
```typescript
// Waiting game timeout (minutes)
const WAITING_GAME_TIMEOUT_MINUTES = 30

// Cleanup intervals
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes

// Database function parameters
cleanup_stale_waiting_games(30)     // 30 minutes
cleanup_old_completed_games(7)      // 7 days
cleanup_abandoned_games(1)          // 1 day
```

### Customization
You can adjust cleanup parameters by:
1. Modifying the constants in `src/app/play/page.tsx`
2. Calling database functions with different parameters
3. Updating the comprehensive_cleanup function defaults

## 🚀 Installation

### For New Installations
The cleanup system is included in the main schema files.

### For Existing Installations
1. Run `enhanced-cleanup-functions.sql` in Supabase SQL Editor
2. Verify functions are created successfully
3. Test cleanup functionality

### Verification
```sql
-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%cleanup%';

-- Test cleanup stats
SELECT get_cleanup_stats();

-- View cleanup monitoring
SELECT * FROM cleanup_monitoring;
```

## 📈 Benefits

### Performance
- **Reduced Database Size**: Regular cleanup prevents database bloat
- **Faster Queries**: Fewer records to scan improves query performance
- **Better User Experience**: Clean game lists without stale entries

### Maintenance
- **Automated**: Minimal manual intervention required
- **Configurable**: Easy to adjust cleanup parameters
- **Monitored**: Built-in statistics and monitoring

### User Experience
- **Clean Interface**: No stale games cluttering the UI
- **Fast Loading**: Reduced data improves page load times
- **Transparency**: Users can see and control cleanup operations

## 🔍 Monitoring

### Cleanup Logs
All cleanup operations are logged to the console with detailed information:
```
✅ Marked 3 stale waiting games as abandoned
✅ Deleted 12 old completed games (7+ days)
✅ Deleted 5 old abandoned games (1+ days)
Total games cleaned up: 20
```

### Database Monitoring
Use the `cleanup_monitoring` view to track cleanup effectiveness:
```sql
SELECT * FROM cleanup_monitoring ORDER BY game_type;
```

### Statistics API
The `get_cleanup_stats()` function provides real-time statistics for monitoring dashboards.

## 🛡️ Safety Features

### Data Protection
- **Selective Deletion**: Only deletes games that meet specific criteria
- **Player Consent**: Completed games only deleted after both players leave
- **Gradual Process**: Waiting games marked as abandoned before deletion

### Error Handling
- **Graceful Failures**: Cleanup continues even if individual operations fail
- **User Feedback**: Clear error messages and success indicators
- **Rollback Safe**: Operations are atomic and can be safely retried

## 🎯 Future Enhancements

### Planned Features
- **Scheduled Cleanup**: Admin-configurable cleanup schedules
- **Cleanup History**: Track cleanup operations over time
- **Advanced Filters**: More granular cleanup controls
- **Bulk Operations**: Mass cleanup for administrative purposes

### Extensibility
The system is designed to be easily extended with:
- Additional cleanup rules
- Custom cleanup functions
- Integration with monitoring systems
- Automated reporting

## 📞 Support

If you encounter issues with the cleanup system:
1. Check the console logs for error messages
2. Verify database functions are properly installed
3. Test individual cleanup operations
4. Review the cleanup monitoring view for insights

The cleanup system is designed to be robust and self-healing, automatically handling most common scenarios.
