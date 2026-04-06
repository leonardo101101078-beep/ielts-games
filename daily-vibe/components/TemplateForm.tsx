'use client'

import { useTransition, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus } from 'lucide-react'
import { createTaskTemplate } from '@/lib/actions/task-templates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PRESET_CATEGORY_KEYS,
  PRESET_CATEGORY_LABELS,
  type PresetCategoryKey,
} from '@/lib/task-categories'
import type { TaskRecurrence } from '@/types/database'

const PRESET_OPTIONS = PRESET_CATEGORY_KEYS.map((value) => ({
  value,
  label: PRESET_CATEGORY_LABELS[value],
}))

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function TemplateForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [categoryIsCustom, setCategoryIsCustom] = useState(false)
  const [presetCategory, setPresetCategory] =
    useState<PresetCategoryKey>('work')
  const [customCategory, setCustomCategory] = useState('')
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('daily')
  const [occurrenceDate, setOccurrenceDate] = useState(todayISODate)

  const minDate = useMemo(() => todayISODate(), [])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    setError('')

    startTransition(async () => {
      try {
        await createTaskTemplate({
          title: fd.get('title') as string,
          description: (fd.get('description') as string) || null,
          category: categoryIsCustom ? customCategory : presetCategory,
          categoryIsCustom,
          recurrence,
          occurrenceDate: recurrence === 'once' ? occurrenceDate : null,
          targetValue:
            (fd.get('target_value') as string)?.trim() === ''
              ? null
              : Number(fd.get('target_value')),
          unit: (fd.get('unit') as string) || null,
        })
        form.reset()
        setCategoryIsCustom(false)
        setPresetCategory('work')
        setCustomCategory('')
        setRecurrence('daily')
        setOccurrenceDate(todayISODate())
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : '建立失敗')
      }
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">新增任務</CardTitle>
      </CardHeader>
      <CardContent>
        <form id="template-form" className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="title">標題</Label>
            <Input
              id="title"
              name="title"
              placeholder="要做什麼？"
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">說明（選填）</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="補充細節…"
              rows={2}
              className="min-h-0"
            />
          </div>

          <div className="space-y-2">
            <Label>類別</Label>
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="category_mode_ui"
                  checked={!categoryIsCustom}
                  onChange={() => setCategoryIsCustom(false)}
                  className="text-primary"
                />
                預設
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="category_mode_ui"
                  checked={categoryIsCustom}
                  onChange={() => setCategoryIsCustom(true)}
                  className="text-primary"
                />
                自訂
              </label>
            </div>
            {!categoryIsCustom ? (
              <select
                id="category"
                value={presetCategory}
                onChange={(e) =>
                  setPresetCategory(e.target.value as PresetCategoryKey)
                }
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {PRESET_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="自訂類別名稱"
                maxLength={40}
                required={categoryIsCustom}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>任務屬性</Label>
            <div className="space-y-2 rounded-lg border border-input p-3">
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="recurrence_ui"
                  checked={recurrence === 'daily'}
                  onChange={() => setRecurrence('daily')}
                  className="mt-1 text-primary"
                />
                <span>
                  <span className="font-medium">循環任務</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    每日重複出現在清單中
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="recurrence_ui"
                  checked={recurrence === 'once'}
                  onChange={() => setRecurrence('once')}
                  className="mt-1 text-primary"
                />
                <span>
                  <span className="font-medium">單一任務</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    僅在指定日期出現一次
                  </span>
                </span>
              </label>
              {recurrence === 'once' && (
                <div className="pt-2">
                  <Label htmlFor="occurrence_date" className="text-xs">
                    指定日期
                  </Label>
                  <Input
                    id="occurrence_date"
                    type="date"
                    value={occurrenceDate}
                    min={minDate}
                    onChange={(e) => setOccurrenceDate(e.target.value)}
                    className="mt-1 h-9"
                    required={recurrence === 'once'}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="target_value">目標數值（選填）</Label>
              <Input
                id="target_value"
                name="target_value"
                type="number"
                min={0}
                step="any"
                placeholder="例如 8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">單位（選填）</Label>
              <Input
                id="unit"
                name="unit"
                placeholder="杯、分鐘…"
                maxLength={32}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {isPending ? '建立中…' : '建立任務'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
