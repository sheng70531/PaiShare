/** PaiShare design tokens — ink + mint settle theme */
export const colors = {
  ink: '#1A2421',
  inkSoft: '#2C3A35',
  mist: '#E7EFEC',
  paper: '#F4F8F6',
  paperDeep: '#D5E4DE',
  mint: '#1F8A7A',
  mintBright: '#2BB39F',
  mintMuted: '#A8D5CC',
  coral: '#D65A4A',
  amber: '#C9892A',
  white: '#FFFFFF',
  line: 'rgba(26, 36, 33, 0.12)',
  textMuted: 'rgba(26, 36, 33, 0.58)',
  textFaint: 'rgba(26, 36, 33, 0.38)',
  overlay: 'rgba(26, 36, 33, 0.04)',
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

export const type = {
  brand: 'Fraunces_700Bold',
  brandSoft: 'Fraunces_600SemiBold',
  body: 'Outfit_400Regular',
  bodyMed: 'Outfit_500Medium',
  bodySemi: 'Outfit_600SemiBold',
  bodyBold: 'Outfit_700Bold',
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  hero: 34,
  display: 40,
} as const;
