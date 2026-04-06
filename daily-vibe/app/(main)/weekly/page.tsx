import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, CalendarRange } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { fetchLogsBetweenDates } from '@/lib/actions/daily-logs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { labelForCategory, styleForCategory } from '@/lib/task-categories'
import type { LogWithTemplate, TaskStatus } from '@/types/database'

function statusLabel(s: TaskStatus): string {
  switch (s) {
    case 'completed':
      return '已完成'
    case 'in_progress':
      return '進行中'
    case 'skipped':
      return '略過'
    default:
      return '待處理'
  }
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export default async function WeeklyPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().slice(0, 10)
  const startDate = addDaysISO(today, -41)

  const logs = await fetchLogsBetweenDates(user.id, startDate, today)

  const byDate = new Map<string, LogWithTemplate[]>()
  for (const log of logs) {
    const d = log.date
    if (!byDate.has(d)) byDate.set(d, [])
    byDate.get(d)!.push(log)
  }
  const dates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a))
  for (const d of dates) {
    byDate.get(d)!.sort(
      (a, b) =>
        (a.task_templates?.sort_order ?? 0) -
        (b.task_templates?.sort_order ?? 0),
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-10 pt-8">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/"
            className="rounded-lg border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="返回本日任務"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">每周日誌</h1>
          </div>
        </div>

        <p className="mb-6 text-sm text-muted-foreground">
          最近 42 天內的任務勾選與備註紀錄。
        </p>

        {dates.length === 0 ? (
          <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
            這段期間尚無紀錄。
          </p>
        ) : (
          <ul className="space-y-6" role="list">
            {dates.map((date) => {
              const dayLogs = byDate.get(date)!
              const label = new Date(`${date}T00:00:00`).toLocaleDateString(
                'zh-TW',
                {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                },
              )
              return (
                <li key={date}>
                  <h2 className="mb-2 text-sm font-semibold text-foreground">
                    {label}
                  </h2>
                  <ul className="space-y-2" role="list">
                    {dayLogs.map((log) => {
                      const t = log.task_templates
                      const cat = t?.category ?? ''
                      const st = styleForCategory(cat)
                      return (
                        <li key={log.id}>
                          <Card>
                            <CardContent className="space-y-1.5 py-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium">
                                  {t?.title ?? '（已刪除任務）'}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'border-transparent px-1.5 py-0 text-[10px]',
                                    st.bg,
                                    st.text,
                                  )}
                                >
                                  {labelForCategory(cat)}
                                </Badge>
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] font-normal"
                                >
                                  {statusLabel(log.status)}
                                </Badge>
                              </div>
                              {log.note?.trim() && (
                                <p className="text-xs text-muted-foreground">
                                  備註：{log.note}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}
