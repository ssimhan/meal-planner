'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const router = useRouter()
    const supabase = createClient()

    async function handleLogin() {
        setLoading(true)
        setMessage('')

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setMessage('Error: ' + error.message)
        } else {
            setMessage('Success! Redirecting...')
            router.push('/') // Go to dashboard
            router.refresh()
        }
        setLoading(false)
    }

    async function handleSignUp() {
        setLoading(true)
        setMessage('')

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${location.origin}/auth/callback`,
                },
            })

            if (error) {
                console.error("Signup Error Details:", error)
                // Map common errors to user-friendly messages
                if (error.message.includes("Database error")) {
                    setMessage(`System Error (500): Onboarding failed. Please contact support. Code: ${error.code || 'DB_TRIGGER_FAIL'}`)
                } else if (error.status === 422) {
                    setMessage(`Validation Error (422): ${error.message}`)
                } else if (error.status === 400) {
                    setMessage(`Bad Request (400): ${error.message}`)
                } else {
                    setMessage(`Error (${error.status || 'Unknown'}): ${error.message}`)
                }
            } else {
                if (data.user && !data.session) {
                    setMessage('Success! Please check your email to confirm your account.')
                } else if (data.user && data.session) {
                    setMessage('Success! Account created. Redirecting...')
                    router.push('/')
                }
            }
        } catch (e: any) {
            console.error("Unexpected Signup Exception:", e)
            setMessage('Critical Client Error: ' + e.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
            <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-lg shadow-md border border-gray-100">
                <div>
                    <h2 className="text-center text-3xl font-extrabold text-gray-900">
                        Sign in to Meal Planner
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Or create a new account
                    </p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label htmlFor="email" className="sr-only">Email address</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="sr-only">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {message && (
                        <div className={`text-sm text-center ${message.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>
                            {message}
                        </div>
                    )}

                    <div className="flex gap-4">
                        <button
                            onClick={handleLogin}
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                        >
                            Sign in
                        </button>
                        <button
                            onClick={handleSignUp}
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-emerald-600 text-sm font-medium rounded-md text-emerald-600 bg-white hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                        >
                            Sign up
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
