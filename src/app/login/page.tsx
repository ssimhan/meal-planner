import { login } from './actions'

export default function LoginPage({
    searchParams,
}: {
    searchParams: { error?: string }
}) {
    return (
        <main className="container mx-auto max-w-md px-4 py-24">
            <div className="card shadow-2xl">
                <header className="mb-8">
                    <h1 className="text-3xl mb-2">Welcome Back</h1>
                    <p className="text-[var(--text-muted)] text-sm uppercase tracking-widest font-mono">
                        Access The Family Gate
                    </p>
                </header>

                <form action={login} className="space-y-6">
                    <div className="space-y-2">
                        <label
                            htmlFor="email"
                            className="text-xs uppercase tracking-tighter text-[var(--text-muted)] block"
                        >
                            Email Address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            placeholder="family@example.com"
                            className="w-full p-3 border border-[var(--border-subtle)] rounded-sm bg-white focus:outline-none focus:border-[var(--accent-sage)] transition-colors"
                        />
                    </div>

                    <div className="space-y-2">
                        <label
                            htmlFor="password"
                            className="text-xs uppercase tracking-tighter text-[var(--text-muted)] block"
                        >
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            placeholder="••••••••"
                            className="w-full p-3 border border-[var(--border-subtle)] rounded-sm bg-white focus:outline-none focus:border-[var(--accent-sage)] transition-colors"
                        />
                    </div>

                    {searchParams.error && (
                        <div className="p-3 bg-[var(--accent-terracotta)]/10 border-l-4 border-[var(--accent-terracotta)] text-sm text-[var(--accent-terracotta)]">
                            {searchParams.error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-primary w-full py-4 text-center flex justify-center items-center group text-lg"
                    >
                        <span>Unlock Dashboard</span>
                        <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                </form>

                <footer className="mt-8 pt-6 border-t border-[var(--border-subtle)] text-center text-xs text-[var(--text-muted)]">
                    <p>Secure Family Access only.</p>
                </footer>
            </div>
        </main>
    )
}
