import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ListChecks } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getTaskTemplates } from '@/lib/actions/task-templates'
import { TemplateForm } from '@/components/TemplateForm'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { labelForCategory, styleForCategory } from '@/lib/task-categories'
import type { TaskTemplate } from '@/types/database'

function TemplateListItem({ t }: { t: TaskTemplate }) {
  const catStyle = styleForCategory(t.category)
  const progressHint =
    t.target_value != null
      ? `${t.target_value}${t.unit ? ` ${t.unit}` : ''}`
      : null
  const recurrence = t.recurrence ?? 'daily'
  const onceDate = t.occurrence_date

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-snug">{t.title}</p>
            {t.description && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {t.description}
              </p>
            )}
            {progressHint && (
              <p className="mt-1 text-xs text-muted-foreground">
                目標：{progressHint}
              </p>
            )}
          </div>
          <Badge
            variant="outline"
            className={cn(
              'shrink-0 border-transparent px-2 py-0.5 text-[11px]',
              catStyle.bg,
              catStyle.text,
            )}
          >
            {labelForCategory(t.category)}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-[10px] font-normal">
            {recurrence === 'daily' ? '每日循環' : `單次 · ${onceDate ?? '—'}`}
          </Badge>
          {!t.is_active && (
            <Badge variant="outline" className="text-[10px] font-normal">
              已停用
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function TemplatesPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const templates = await getTaskTemplates()

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
            <ListChecks className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">新增任務</h1>
          </div>
        </div>

        <p className="mb-6 text-sm text-muted-foreground">
          建立循環任務後每天會自動出現；單一任務只在指定日期出現一次。
        </p>

        <div className="space-y-6">
          <TemplateForm />

          <div>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
              已有任務（{templates.length}）
            </h2>
            {templates.length === 0 ? (
              <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
                尚無任務，請先新增一筆。
              </p>
            ) : (
              <ul className="space-y-2.5" role="list">
                {templates.map((t) => (
                  <li key={t.id}>
                    <TemplateListItem t={t} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
