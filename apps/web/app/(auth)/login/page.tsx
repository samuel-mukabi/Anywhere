import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sign in',
};

export default function LoginPage() {
  return (
    <div className="card-base shadow-card">
      <div className="mb-8 text-center">
        <h1 className="font-astoria text-3xl font-light text-nearblack mb-2">
          Welcome back
        </h1>
        <p className="text-sm font-cera text-nearblack-600">
          Sign in to your Anywhere account
        </p>
      </div>

      {/* TODO: Replace with real Supabase Auth component */}
      <form className="flex flex-col gap-4" aria-label="Sign in form">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs font-cera font-medium uppercase tracking-wide text-nearblack-600">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-[--aw-radius-input] border border-parchment-500 bg-parchment-100 text-nearblack placeholder:text-nearblack-600/50 text-sm font-cera focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-xs font-cera font-medium uppercase tracking-wide text-nearblack-600">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs font-cera text-terracotta hover:text-terracotta-600 transition-colors">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-[--aw-radius-input] border border-parchment-500 bg-parchment-100 text-nearblack placeholder:text-nearblack-600/50 text-sm font-cera focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-colors"
          />
        </div>

        <button
          type="submit"
          className="w-full mt-2 py-3 bg-terracotta hover:bg-terracotta-600 active:bg-terracotta-900 text-parchment-50 font-cera font-semibold rounded-pill transition-colors duration-200 shadow-sm hover:shadow-card focus-visible:shadow-glow-terracotta focus-visible:outline-none"
        >
          Sign in
        </button>
      </form>

      <p className="mt-6 text-center text-sm font-cera text-nearblack-600">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-terracotta hover:text-terracotta-600 font-medium transition-colors">
          Sign up free
        </Link>
      </p>
    </div>
  );
}
