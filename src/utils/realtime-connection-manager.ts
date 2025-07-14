import { supabase } from '@/lib/supabase'

export interface ConnectionStatus {
  isConnected: boolean
  lastConnected: Date | null
  connectionAttempts: number
  latency: number | null
}

export class RealtimeConnectionManager {
  private static instance: RealtimeConnectionManager
  private connectionStatus: ConnectionStatus = {
    isConnected: false,
    lastConnected: null,
    connectionAttempts: 0,
    latency: null
  }
  private listeners: ((status: ConnectionStatus) => void)[] = []
  private heartbeatInterval: NodeJS.Timeout | null = null
  private connectionTestChannel: any = null

  private constructor() {
    this.initializeConnectionMonitoring()
  }

  public static getInstance(): RealtimeConnectionManager {
    if (!RealtimeConnectionManager.instance) {
      RealtimeConnectionManager.instance = new RealtimeConnectionManager()
    }
    return RealtimeConnectionManager.instance
  }

  private initializeConnectionMonitoring() {
    if (!supabase) {
      console.warn('⚠️ Supabase not configured, skipping connection monitoring')
      return
    }

    // Create a dedicated channel for connection testing
    this.connectionTestChannel = supabase
      .channel('connection-test', {
        config: {
          presence: {
            key: 'connection-monitor',
          },
        },
      })
      .subscribe((status) => {
        const wasConnected = this.connectionStatus.isConnected
        
        if (status === 'SUBSCRIBED') {
          this.connectionStatus.isConnected = true
          this.connectionStatus.lastConnected = new Date()
          this.connectionStatus.connectionAttempts = 0
          
          if (!wasConnected) {
            console.log('✅ Real-time connection established')
            this.notifyListeners()
          }
          
          this.startHeartbeat()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.connectionStatus.isConnected = false
          this.connectionStatus.connectionAttempts++
          
          console.warn(`⚠️ Real-time connection issue: ${status}`)
          this.notifyListeners()
          this.stopHeartbeat()
        } else if (status === 'CLOSED') {
          this.connectionStatus.isConnected = false
          console.log('📡 Real-time connection closed')
          this.notifyListeners()
          this.stopHeartbeat()
        }
      })
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.heartbeatInterval = setInterval(() => {
      this.testLatency()
    }, 30000) // Test every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private async testLatency() {
    if (!supabase || !this.connectionStatus.isConnected) return

    const startTime = Date.now()
    
    try {
      // Simple ping test using a lightweight query
      await supabase.from('games').select('id').limit(1)
      
      const latency = Date.now() - startTime
      this.connectionStatus.latency = latency
      
      if (latency > 5000) {
        console.warn(`⚠️ High latency detected: ${latency}ms`)
      }
      
      this.notifyListeners()
    } catch (error) {
      console.error('❌ Latency test failed:', error)
      this.connectionStatus.latency = null
      this.connectionStatus.isConnected = false
      this.notifyListeners()
    }
  }

  public getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus }
  }

  public addListener(callback: (status: ConnectionStatus) => void) {
    this.listeners.push(callback)
    
    // Immediately call with current status
    callback(this.getConnectionStatus())
    
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  private notifyListeners() {
    const status = this.getConnectionStatus()
    this.listeners.forEach(listener => {
      try {
        listener(status)
      } catch (error) {
        console.error('❌ Error in connection status listener:', error)
      }
    })
  }

  public forceReconnect() {
    console.log('🔄 Forcing real-time reconnection...')
    
    if (this.connectionTestChannel) {
      this.connectionTestChannel.unsubscribe()
    }
    
    this.connectionStatus.isConnected = false
    this.connectionStatus.connectionAttempts++
    this.stopHeartbeat()
    
    // Reinitialize after a short delay
    setTimeout(() => {
      this.initializeConnectionMonitoring()
    }, 1000)
  }

  public cleanup() {
    this.stopHeartbeat()
    
    if (this.connectionTestChannel) {
      this.connectionTestChannel.unsubscribe()
      this.connectionTestChannel = null
    }
    
    this.listeners = []
    this.connectionStatus = {
      isConnected: false,
      lastConnected: null,
      connectionAttempts: 0,
      latency: null
    }
  }

  // Helper method to determine if real-time should be used
  public shouldUseRealtime(): boolean {
    const status = this.getConnectionStatus()
    
    // Don't use real-time if:
    // - Not connected
    // - Too many failed attempts (> 5)
    // - High latency (> 10 seconds)
    return status.isConnected && 
           status.connectionAttempts <= 5 && 
           (status.latency === null || status.latency < 10000)
  }

  // Get recommended polling interval based on connection quality
  public getRecommendedPollingInterval(): number {
    const status = this.getConnectionStatus()
    
    if (!status.isConnected) {
      return 2000 // 2 seconds for disconnected state
    }
    
    if (status.latency === null) {
      return 3000 // 3 seconds if latency unknown
    }
    
    if (status.latency > 5000) {
      return 5000 // 5 seconds for high latency
    }
    
    return 3000 // 3 seconds default
  }
}

// Export singleton instance
export const connectionManager = RealtimeConnectionManager.getInstance()
