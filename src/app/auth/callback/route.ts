import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(`${requestUrl.origin}/?error=${error}&error_description=${encodeURIComponent(errorDescription || '')}`)
  }

  if (code) {
    try {
      const supabase = createServerClient()

      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('Error exchanging code for session:', exchangeError)
        return NextResponse.redirect(`${requestUrl.origin}/?error=auth_error&error_description=${encodeURIComponent(exchangeError.message)}`)
      }

      // Log successful authentication for debugging
      if (data.user) {
        console.log('User authenticated successfully:', {
          id: data.user.id,
          email: data.user.email,
          metadata: data.user.user_metadata
        })
      }
    } catch (error) {
      console.error('Unexpected error in auth callback:', error)
      return NextResponse.redirect(`${requestUrl.origin}/?error=unexpected_error&error_description=${encodeURIComponent('An unexpected error occurred during authentication')}`)
    }
  }

  // Redirect to home page after successful authentication
  return NextResponse.redirect(`${requestUrl.origin}/`)
}
