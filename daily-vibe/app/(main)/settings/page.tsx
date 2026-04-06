import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from '@/components/settings/SettingsClient'

export const metadata = {
  title: '帳號管理 | DailyVibe',
}

export default async function SettingsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-28 pt-10">
        <h1 className="text-xl font-bold tracking-tight">帳號管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">信箱、資料匯出、登出與刪除帳戶</p>
        <SettingsClient
          initialEmail={user.email ?? ''}
          displayName={profile?.display_name ?? null}
          username={profile?.username ?? null}
        />
      </div>
    </main>
  )
}
