import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    try {
        const { searchParams, origin } = new URL(request.url)
        console.log(`Callback triggered for: ${request.url}`)

        const code = searchParams.get('code')
        // if "next" is in param, use it as the redirect URL
        const next = searchParams.get('next') ?? '/'

        if (code) {
            console.log('Code found, exchanging for session...')
            const supabase = await createClient()
            const { error } = await supabase.auth.exchangeCodeForSession(code)

            if (error) {
                console.error('Exchange error:', error)
            }

            if (!error) {
                const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
                const isLocalEnv = process.env.NODE_ENV === 'development'

                console.log(`Exchange success, redirecting to ${next}`)

                if (isLocalEnv) {
                    // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
                    return NextResponse.redirect(`${origin}${next}`)
                } else if (forwardedHost) {
                    return NextResponse.redirect(`https://${forwardedHost}${next}`)
                } else {
                    return NextResponse.redirect(`${origin}${next}`)
                }
            }
        } else {
            console.log('No code found in params')
        }

        // return the user to an error page with instructions
        console.error('Callback failed: No code provided or code exchange failed silently.')
        return NextResponse.redirect(`${origin}/login?error=AuthCallbackFailed&message=No+code+provided`)
    } catch (e: any) {
        console.error('CRITICAL CALLBACK ERROR:', e)
        const errorMsg = encodeURIComponent(e.message || 'Unknown Error')
        return NextResponse.redirect(`${origin}/login?error=ServerCallbackError&message=${errorMsg}`)
    }
}
