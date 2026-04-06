'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { TaskRecurrence, TaskTemplate } from '@/types/database'
import { isPresetCategory, MAX_CUSTOM_CATEGORY_LEN } from '@/lib/task-categories'

export interface CreateTaskTemplateInput {
  title: string
  description?: string | null
  /** Preset key or custom label (trimmed) */
  category: string
  /** When true, category is free text (must still pass length checks) */
  categoryIsCustom?: boolean
  recurrence: TaskRecurrence
  /** Required when recurrence === 'once', YYYY-MM-DD */
  occurrenceDate?: string | null
  targetValue?: number | null
  unit?: string | null
}

export async function getTaskTemplates(): Promise<TaskTemplate[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => {
    const r = row as TaskTemplate
    return {
      ...r,
      recurrence: r.recurrence ?? 'daily',
      occurrence_date: r.occurrence_date ?? null,
    }
  })
}

function normalizeCategory(input: CreateTaskTemplateInput): string {
  const raw = input.category?.trim() ?? ''
  if (input.categoryIsCustom) {
    if (!raw) throw new Error('請輸入自訂類別名稱')
    if (raw.length > MAX_CUSTOM_CATEGORY_LEN)
      throw new Error(`自訂類別最多 ${MAX_CUSTOM_CATEGORY_LEN} 字`)
    return raw
  }
  if (!isPresetCategory(raw)) throw new Error('請選擇有效類別')
  return raw
}

export async function createTaskTemplate(
  input: CreateTaskTemplateInput,
): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const title = input.title?.trim()
  if (!title) throw new Error('標題為必填')

  const category = normalizeCategory(input)

  const recurrence = input.recurrence
  if (recurrence !== 'daily' && recurrence !== 'once') {
    throw new Error('無效的任務類型')
  }

  let occurrenceDate: string | null = null
  if (recurrence === 'once') {
    const d = input.occurrenceDate?.trim()
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      throw new Error('單一任務請選擇日期')
    }
    occurrenceDate = d
  }

  const { data: last } = await supabase
    .from('task_templates')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sortOrder = (last?.sort_order ?? -1) + 1

  const targetValue =
    input.targetValue != null && !Number.isNaN(Number(input.targetValue))
      ? Number(input.targetValue)
      : null
  const unit =
    targetValue != null && input.unit?.trim()
      ? input.unit.trim()
      : null

  const { error } = await supabase.from('task_templates').insert({
    user_id: user.id,
    title,
    description: input.description?.trim() || null,
    category,
    sort_order: sortOrder,
    is_active: true,
    target_value: targetValue,
    unit,
    icon: null,
    color: null,
    recurrence,
    occurrence_date: occurrenceDate,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/')
  revalidatePath('/templates')
  revalidatePath('/weekly')
}
