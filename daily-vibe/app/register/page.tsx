'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, Loader2, Lock, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    if (data.session) {
      router.replace('/')
      router.refresh()
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="max-w-xs space-y-4">
          <div className="flex justify-center">
            <div className="rounded-2xl bg-primary/10 p-5">
              <Mail className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-xl font-bold">請確認信箱</h1>
          <p className="text-sm text-muted-foreground">
            我們已寄出驗證信到 <span className="font-medium text-foreground">{email}</span>
            。若專案未開啟「信箱驗證」，您可能已可直接登入。
          </p>
          <Link
            href="/login"
            className="inline-block text-sm font-medium text-primary underline"
          >
            返回登入
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs space-y-7">
        <div className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="rounded-2xl bg-primary/10 p-5">
              <CalendarDays className="h-10 w-10 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">註冊</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              建立 DailyVibe 帳號
            </p>
          </div>
        </div>

        <form onSubmit={handleRegister} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              placeholder="密碼（至少 6 字元）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email || password.length < 6}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? '註冊中…' : '註冊'}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          已有帳號？{' '}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            登入
          </Link>
        </p>
      </div>
    </main>
  )
}
