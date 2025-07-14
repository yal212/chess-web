'use client'

import { useState, useEffect } from 'react'
import { connectionManager, ConnectionStatus as Status } from '@/utils/realtime-connection-manager'
import { Wifi, WifiOff, Clock, AlertTriangle } from 'lucide-react'

interface ConnectionStatusProps {
  showDetails?: boolean
  className?: string
}

export default function ConnectionStatus({ showDetails = false, className = '' }: ConnectionStatusProps) {
  const [status, setStatus] = useState<Status>({
    isConnected: false,
    lastConnected: null,
    connectionAttempts: 0,
    latency: null
  })

  useEffect(() => {
    const removeListener = connectionManager.addListener(setStatus)
    return removeListener
  }, [])

  const getStatusColor = () => {
    if (!status.isConnected) return 'text-red-500'
    if (status.latency && status.latency > 5000) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getStatusIcon = () => {
    if (!status.isConnected) return <WifiOff className="w-4 h-4" />
    if (status.latency && status.latency > 5000) return <AlertTriangle className="w-4 h-4" />
    return <Wifi className="w-4 h-4" />
  }

  const getStatusText = () => {
    if (!status.isConnected) {
      if (status.connectionAttempts > 0) {
        return `Disconnected (${status.connectionAttempts} attempts)`
      }
      return 'Disconnected'
    }
    
    if (status.latency) {
      if (status.latency > 5000) {
        return `Connected (slow: ${status.latency}ms)`
      }
      return `Connected (${status.latency}ms)`
    }
    
    return 'Connected'
  }

  const formatLastConnected = () => {
    if (!status.lastConnected) return 'Never'
    
    const now = new Date()
    const diff = now.getTime() - status.lastConnected.getTime()
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return status.lastConnected.toLocaleDateString()
  }

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={getStatusColor()}>
          {getStatusIcon()}
        </div>
        <span className={`text-sm ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>
    )
  }

  return (
    <div className={`bg-gray-50 border rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={getStatusColor()}>
          {getStatusIcon()}
        </div>
        <h3 className="font-medium text-gray-900">Real-time Connection</h3>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Status:</span>
          <span className={getStatusColor()}>{getStatusText()}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Last Connected:</span>
          <span className="text-gray-900">{formatLastConnected()}</span>
        </div>
        
        {status.connectionAttempts > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Attempts:</span>
            <span className="text-gray-900">{status.connectionAttempts}</span>
          </div>
        )}
        
        {status.latency !== null && (
          <div className="flex justify-between">
            <span className="text-gray-600">Latency:</span>
            <span className={status.latency > 5000 ? 'text-yellow-600' : 'text-green-600'}>
              {status.latency}ms
            </span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span className="text-gray-600">Mode:</span>
          <span className="text-gray-900">
            {connectionManager.shouldUseRealtime() ? 'Real-time' : 'Polling'}
          </span>
        </div>
        
        {!connectionManager.shouldUseRealtime() && (
          <div className="flex justify-between">
            <span className="text-gray-600">Poll Interval:</span>
            <span className="text-gray-900">
              {connectionManager.getRecommendedPollingInterval()}ms
            </span>
          </div>
        )}
      </div>
      
      {!status.isConnected && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Using polling fallback for updates</span>
          </div>
        </div>
      )}
    </div>
  )
}
