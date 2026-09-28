export const colors = {
  bg: '#0B1220',
  bg2: '#14203A',
  panel: 'rgba(255,255,255,0.04)',
  panelBorder: 'rgba(255,255,255,0.09)',
  text: '#E8EEF8',
  muted: '#8B97AE',
  dim: '#5C6980',
  amber: '#F5A524',
  red: '#F0546A',
  teal: '#2DD4BF',
  blue: '#5B8DEF',
  violet: '#A78BFA',
  green: '#4ADE80',
  skin: '#E8C4A2',
  skinDark: '#C9A07C',
  hair: '#3B2A1E',
  hairLight: '#7A5A44',
  blood: '#B3202E',
  plasma: '#F2C94C',
  buffy: '#F7EBD3',
};

export const font =
  'Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "DejaVu Sans", sans-serif';

export type BadgeKind = 'fact' | 'hypothesis' | 'expert' | 'preclinical' | 'clinical' | 'A' | 'B' | 'C' | 'offlabel';

export const badgeStyle: Record<BadgeKind, {label: string; color: string}> = {
  fact: {label: 'Доказано', color: colors.green},
  hypothesis: {label: 'Гипотеза', color: colors.violet},
  expert: {label: 'Мнение экспертов', color: colors.amber},
  preclinical: {label: 'in vitro / животные', color: colors.blue},
  clinical: {label: 'Клинические данные', color: colors.teal},
  A: {label: 'Уровень A', color: colors.green},
  B: {label: 'Уровень B', color: colors.blue},
  C: {label: 'Уровень C', color: colors.amber},
  offlabel: {label: 'Off-label', color: colors.red},
};
