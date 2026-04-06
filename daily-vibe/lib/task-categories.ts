/** Preset category keys stored in task_templates.category */
export const PRESET_CATEGORY_KEYS = [
  'reminder',
  'work',
  'learning',
  'creative',
  'chores',
  'social',
] as const

export type PresetCategoryKey = (typeof PRESET_CATEGORY_KEYS)[number]

export const PRESET_CATEGORY_LABELS: Record<PresetCategoryKey, string> = {
  reminder: '提醒事項',
  work: '工作',
  learning: '學習',
  creative: '創作',
  chores: '庶務',
  social: '社交',
}

/** Main task groups on home (excludes reminder — shown separately) */
export const MAIN_TASK_CATEGORY_ORDER: PresetCategoryKey[] = [
  'work',
  'learning',
  'creative',
  'chores',
  'social',
]

export function isPresetCategory(category: string): category is PresetCategoryKey {
  return (PRESET_CATEGORY_KEYS as readonly string[]).includes(category)
}

export function labelForCategory(category: string): string {
  if (isPresetCategory(category)) return PRESET_CATEGORY_LABELS[category]
  return category.trim() || '自訂'
}

export const CUSTOM_CATEGORY_STYLE = {
  bg: 'bg-amber-100',
  text: 'text-amber-800',
} as const

/** Badge colours for presets + fallback for custom / legacy */
export const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  reminder: { bg: 'bg-rose-100', text: 'text-rose-800' },
  work: { bg: 'bg-blue-100', text: 'text-blue-700' },
  learning: { bg: 'bg-purple-100', text: 'text-purple-700' },
  creative: { bg: 'bg-fuchsia-100', text: 'text-fuchsia-800' },
  chores: { bg: 'bg-slate-200', text: 'text-slate-700' },
  social: { bg: 'bg-cyan-100', text: 'text-cyan-800' },
  // legacy
  health: { bg: 'bg-green-100', text: 'text-green-700' },
  personal: { bg: 'bg-orange-100', text: 'text-orange-700' },
}

export const DEFAULT_CATEGORY_STYLE = {
  bg: 'bg-slate-100',
  text: 'text-slate-600',
}

export function styleForCategory(category: string): { bg: string; text: string } {
  if (!isPresetCategory(category)) {
    if (CATEGORY_STYLES[category]) return CATEGORY_STYLES[category]
    return CUSTOM_CATEGORY_STYLE
  }
  return CATEGORY_STYLES[category] ?? DEFAULT_CATEGORY_STYLE
}

export const MAX_CUSTOM_CATEGORY_LEN = 40
