'use client'

import { useState, useEffect } from 'react'
import { connectionManager } from '@/utils/realtime-connection-manager'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'

interface ConnectionStatusProps {
  className?: string
}

export default function ConnectionStatus({ className = '' }: ConnectionStatusProps) {
  const [connectionStatus, setConnectionStatus] = useState(connectionManager.getConnectionStatus())
  const [isReconnecting, setIsReconnecting] = useState(false)

  useEffect(() => {
    const unsubscribe = connectionManager.addListener((status) => {
      setConnectionStatus(status)
      setIsReconnecting(false)
    })

    return unsubscribe
  }, [])

  const handleReconnect = async () => {
    setIsReconnecting(true)
    connectionManager.forceReconnect()
    
    // Reset reconnecting state after a timeout
    setTimeout(() => {
      setIsReconnecting(false)
    }, 5000)
  }

  const getStatusColor = () => {
    if (isReconnecting) return 'text-yellow-600'
    return connectionStatus.isConnected ? 'text-green-600' : 'text-red-600'
  }

  const getStatusText = () => {
    if (isReconnecting) return 'Reconnecting...'
    return connectionStatus.isConnected ? 'Connected' : 'Disconnected'
  }

  const getStatusIcon = () => {
    if (isReconnecting) {
      return <RefreshCw className="w-4 h-4 animate-spin" />
    }
    return connectionStatus.isConnected ? 
      <Wifi className="w-4 h-4" /> : 
      <WifiOff className="w-4 h-4" />
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
      </div>
      
      {!connectionStatus.isConnected && !isReconnecting && (
        <button
          onClick={handleReconnect}
          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      )}
      
      {connectionStatus.latency !== null && connectionStatus.isConnected && (
        <span className="text-xs text-gray-500">
          {connectionStatus.latency}ms
        </span>
      )}
    </div>
  )
}
