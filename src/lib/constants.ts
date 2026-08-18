export const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  all_levels: 'All Levels',
};

export const COVER_COLORS: Record<string, { bg: string; ring: string; text: string }> = {
  amber: { bg: 'bg-amber-500', ring: 'ring-amber-300', text: 'text-amber-100' },
  blue: { bg: 'bg-blue-600', ring: 'ring-blue-300', text: 'text-blue-100' },
  emerald: { bg: 'bg-emerald-600', ring: 'ring-emerald-300', text: 'text-emerald-100' },
  rose: { bg: 'bg-rose-600', ring: 'ring-rose-300', text: 'text-rose-100' },
  violet: { bg: 'bg-violet-600', ring: 'ring-violet-300', text: 'text-violet-100' },
  slate: { bg: 'bg-slate-700', ring: 'ring-slate-300', text: 'text-slate-100' },
  teal: { bg: 'bg-teal-600', ring: 'ring-teal-300', text: 'text-teal-100' },
  orange: { bg: 'bg-orange-600', ring: 'ring-orange-300', text: 'text-orange-100' },
};

export const COVER_COLOR_NAMES = Object.keys(COVER_COLORS);

export function coverStyle(color: string | null | undefined) {
  return COVER_COLORS[color || 'amber'] || COVER_COLORS.amber;
}
