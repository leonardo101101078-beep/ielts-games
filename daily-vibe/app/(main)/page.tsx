import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { seedTodayLogs, fetchTodayLogs } from '@/lib/actions/daily-logs'
import { getNotificationSettings } from '@/lib/actions/push'
import { getWellnessForDate } from '@/lib/actions/wellness'
import { GroupedDayChecklist } from '@/components/GroupedDayChecklist'
import { NotificationToggle } from '@/components/NotificationToggle'
import { TodayClock } from '@/components/TodayClock'
import { WellnessCard } from '@/components/WellnessCard'

function getLocalDateString(): string {
  const now = new Date()
  return now.toISOString().slice(0, 10)
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString('zh-TW', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '深夜好'
  if (hour < 12) return '早安'
  if (hour < 18) return '午安'
  return '晚安'
}

export default async function HomePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const today = getLocalDateString()

  const [logs, notificationSettings, wellness] = await Promise.all([
    seedTodayLogs(user.id, today).then(() => fetchTodayLogs(user.id, today)),
    getNotificationSettings(),
    getWellnessForDate(user.id, today),
  ])

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md">
        <header className="px-5 pb-4 pt-10">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {formatDisplayDate(today)}
          </p>
          <TodayClock />
          <h1 className="mt-2 text-xl font-bold tracking-tight">
            {getGreeting()}，今天繼續加油
          </h1>
        </header>

        <div className="space-y-5 px-5 pb-4">
          <WellnessCard date={today} initial={wellness} />
        </div>

        <GroupedDayChecklist initialLogs={logs} />

        <div className="px-5 pb-8 pt-4">
          <NotificationToggle initialSettings={notificationSettings} />
        </div>
      </div>
    </main>
  )
}
