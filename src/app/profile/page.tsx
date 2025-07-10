'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Navigation from '@/components/layout/Navigation'
import { User, Mail, Calendar, Edit2, Save, X, Camera, LogOut } from 'lucide-react'

export default function ProfilePage() {
  const { user, supabaseUser, loading, updateUserProfile, signOut } = useAuth()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    display_name: '',
    avatar_url: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      setEditForm({
        display_name: user.display_name || '',
        avatar_url: user.avatar_url || ''
      })
    }
  }, [user])

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset form when canceling
      setEditForm({
        display_name: user?.display_name || '',
        avatar_url: user?.avatar_url || ''
      })
    }
    setIsEditing(!isEditing)
  }

  const handleSave = async () => {
    if (!user) return

    setIsSaving(true)
    try {
      await updateUserProfile({
        display_name: editForm.display_name,
        avatar_url: editForm.avatar_url || undefined
      })

      setIsEditing(false)
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
      alert('Failed to sign out. Please try again.')
    } finally {
      setIsSigningOut(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="flex items-center space-x-6 mb-8">
                <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-48"></div>
                  <div className="h-4 bg-gray-200 rounded w-64"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
              <button
                onClick={handleEditToggle}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isEditing ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center space-x-6 mb-8">
              <div className="relative">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.display_name}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {getInitials(user.display_name)}
                  </div>
                )}
                {isEditing && (
                  <button className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 transition-colors">
                    <Camera className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="display_name" className="block text-sm font-medium text-gray-700">
                        Display Name
                      </label>
                      <input
                        type="text"
                        id="display_name"
                        value={editForm.display_name}
                        onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="avatar_url" className="block text-sm font-medium text-gray-700">
                        Avatar URL
                      </label>
                      <input
                        type="url"
                        id="avatar_url"
                        value={editForm.avatar_url}
                        onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="https://example.com/avatar.jpg"
                      />
                    </div>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{user.display_name}</h2>
                    <p className="text-gray-600 flex items-center mt-2">
                      <Mail className="w-4 h-4 mr-2" />
                      {user.email}
                    </p>
                    <p className="text-gray-600 flex items-center mt-1">
                      <Calendar className="w-4 h-4 mr-2" />
                      Member since {formatDate(user.created_at)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500">User ID</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{user.id}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Account Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(user.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(user.updated_at)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Authentication Provider</dt>
                  <dd className="mt-1 text-sm text-gray-900">Google</dd>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Account Actions</h3>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isSigningOut ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <LogOut className="w-4 h-4 mr-2" />
                )}
                {isSigningOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
