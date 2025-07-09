import { createServerClient } from '@/lib/supabase-server'
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
      const supabase = await createServerClient()

      // Try to exchange the code for a session
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('Error exchanging code for session:', exchangeError)

        // If it's a PKCE error, try to handle it differently
        if (exchangeError.message.includes('code verifier')) {
          console.log('PKCE flow error detected, this might be due to configuration mismatch')
          return NextResponse.redirect(`${requestUrl.origin}/?error=pkce_error&error_description=${encodeURIComponent('Authentication flow mismatch. Please check your Supabase OAuth configuration.')}`)
        }

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

      // Create a response that will set the auth cookies
      const response = NextResponse.redirect(`${requestUrl.origin}/`)

      return response

    } catch (error) {
      console.error('Unexpected error in auth callback:', error)
      return NextResponse.redirect(`${requestUrl.origin}/?error=unexpected_error&error_description=${encodeURIComponent('An unexpected error occurred during authentication')}`)
    }
  }

  // Redirect to home page if no code (shouldn't happen in normal flow)
  return NextResponse.redirect(`${requestUrl.origin}/`)
}
