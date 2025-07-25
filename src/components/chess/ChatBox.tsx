'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { MessageCircle, Send } from 'lucide-react'
import ConnectionStatus from '@/components/ui/ConnectionStatus'

interface ChatMessage {
  id: string
  game_id: string
  user_id: string
  message: string
  created_at: string
  user?: {
    display_name: string
    avatar_url?: string
  }
}

interface ChatBoxProps {
  gameId: string
  className?: string
}

export default function ChatBox({ gameId, className = '' }: ChatBoxProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Fetch existing messages
  useEffect(() => {
    if (!gameId) return

    fetchMessages()
    const unsubscribe = setupRealtimeSubscription()

    return () => {
      // Cleanup subscription
      if (unsubscribe) unsubscribe()
    }
  }, [gameId])

  const fetchMessages = async () => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          user:users!chat_messages_user_id_fkey(display_name, avatar_url)
        `)
        .eq('game_id', gameId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching chat messages:', error)
        return
      }

      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching chat messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    if (!supabase) return

    const subscription = supabase
      .channel(`chat-${gameId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: gameId }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `game_id=eq.${gameId}`
        },
        async (payload) => {
          console.log('New chat message:', payload)

          try {
            if (!supabase) return

            // Fetch the complete message with user data
            const { data, error } = await supabase
              .from('chat_messages')
              .select(`
                *,
                user:users!chat_messages_user_id_fkey(display_name, avatar_url)
              `)
              .eq('id', payload.new.id)
              .single()

            if (!error && data) {
              // Check if message already exists to prevent duplicates
              setMessages(prev => {
                const exists = prev.some(msg => msg.id === data.id)
                if (exists) return prev
                return [...prev, data]
              })
            } else {
              console.error('Error fetching new message:', error)
            }
          } catch (err) {
            console.error('Error in realtime message handler:', err)
          }
        }
      )
      .subscribe((status) => {
        console.log('Chat subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Chat real-time subscription active')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Chat subscription error, retrying...')
          // Retry subscription after a delay
          setTimeout(() => {
            subscription.unsubscribe()
            setupRealtimeSubscription()
          }, 2000)
        }
      })

    return () => subscription.unsubscribe()
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || !user || !supabase || sending) return

    const messageText = newMessage.trim()
    setSending(true)
    setNewMessage('') // Clear input immediately for better UX

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          game_id: gameId,
          user_id: user.id,
          message: messageText
        })

      if (error) {
        console.error('Error sending message:', error)
        // Restore message text on error
        setNewMessage(messageText)
        alert('Failed to send message. Please try again.')
        return
      }

      // Message sent successfully - input already cleared
    } catch (error) {
      console.error('Error sending message:', error)
      // Restore message text on error
      setNewMessage(messageText)
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={`bg-white rounded-lg shadow-md flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5 text-gray-400" />
          <span className="font-medium text-gray-900">Chat</span>
        </div>
        <ConnectionStatus className="text-xs" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ maxHeight: '300px' }}>
        {loading ? (
          <div className="space-y-3">
            {/* Loading skeleton */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex space-x-3">
                  <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-300 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:shadow-md ${
                  message.user_id === user?.id
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                <div className="font-medium text-xs opacity-75 mb-1">
                  {message.user?.display_name || 'Unknown User'}
                </div>
                <div>{message.message}</div>
                <div className="text-xs opacity-75 mt-1">
                  {formatTime(message.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-500 bg-white dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:placeholder-gray-400"
            disabled={sending}
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
