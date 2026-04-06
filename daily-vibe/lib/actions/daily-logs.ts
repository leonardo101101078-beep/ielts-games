'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type {
  TaskStatus,
  LogWithTemplate,
  DailyLogInsert,
} from '@/types/database'

// ---------------------------------------------------------------------------
// seedTodayLogs
// Idempotently generates daily_log rows for every active task_template.
// Safe to call on every page load — uses ON CONFLICT DO NOTHING via upsert.
// ---------------------------------------------------------------------------
export async function seedTodayLogs(
  userId: string,
  today: string, // ISO date string: "YYYY-MM-DD"
): Promise<void> {
  const supabase = createClient()

  // Auto-deactivate one-off templates whose date has passed
  await supabase
    .from('task_templates')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('recurrence', 'once')
    .lt('occurrence_date', today)

  const { data: templates, error: tErr } = await supabase
    .from('task_templates')
    .select('id, recurrence, occurrence_date')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (tErr) throw new Error(tErr.message)
  if (!templates || templates.length === 0) return

  const rows = templates as {
    id: string
    recurrence: string | null
    occurrence_date: string | null
  }[]

  const eligible = rows.filter((t) => {
    const r = t.recurrence ?? 'daily'
    if (r === 'daily') return true
    if (r === 'once' && t.occurrence_date === today) return true
    return false
  })

  if (eligible.length === 0) return

  const logs: DailyLogInsert[] = eligible.map((t) => ({
    user_id: userId,
    task_template_id: t.id,
    date: today,
    status: 'pending',
    note: null,
    progress: null,
    completed_at: null,
  }))

  const { error: uErr } = await supabase
    .from('daily_logs')
    .upsert(logs, {
      onConflict: 'user_id,task_template_id,date',
      ignoreDuplicates: true,
    })

  if (uErr) throw new Error(uErr.message)
}

// ---------------------------------------------------------------------------
// fetchTodayLogs
// Returns all daily_logs for today joined with their task_template.
// Ordered by sort_order of the template.
// ---------------------------------------------------------------------------
export async function fetchTodayLogs(
  userId: string,
  today: string,
): Promise<LogWithTemplate[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('daily_logs')
    .select('*, task_templates(*)')
    .eq('user_id', userId)
    .eq('date', today)
    .order('task_templates(sort_order)', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as LogWithTemplate[]
}

// ---------------------------------------------------------------------------
// updateLogStatus
// Toggles a task's status and updates completed_at accordingly.
// Triggers a full page revalidation so the server state stays in sync.
// ---------------------------------------------------------------------------
export async function updateLogStatus(
  logId: string,
  status: TaskStatus,
): Promise<void> {
  const supabase = createClient()

  const completedAt =
    status === 'completed' ? new Date().toISOString() : null

  const { error } = await supabase
    .from('daily_logs')
    .update({ status, completed_at: completedAt })
    .eq('id', logId)

  if (error) throw new Error(error.message)

  revalidatePath('/')
  revalidatePath('/weekly')
}

// ---------------------------------------------------------------------------
// updateLogNote
// Persists the note text for a task. Called on textarea blur.
// No page revalidation needed — optimistic UI already reflects the change.
// ---------------------------------------------------------------------------
export async function updateLogNote(
  logId: string,
  note: string,
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('daily_logs')
    .update({ note })
    .eq('id', logId)

  if (error) throw new Error(error.message)

  revalidatePath('/weekly')
}

// ---------------------------------------------------------------------------
// fetchLogsBetweenDates — for weekly journal (read-only history)
// ---------------------------------------------------------------------------
export async function fetchLogsBetweenDates(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<LogWithTemplate[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('daily_logs')
    .select('*, task_templates(*)')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as LogWithTemplate[]
}
