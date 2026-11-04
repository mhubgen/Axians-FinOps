// Axians brand palette and chart tokens.
// Primary red confirmed: #E2001A. Charcoal + neutrals keep the dashboard minimal.

export const axians = {
  red: '#E6007E',
  redDark: '#B3005F',
  redSoft: '#F25CAE',
  redFaint: '#FCE6F2',
  charcoal: '#2B2F36',
  blue: '#1D3B8A',
  ink: '#111317',
  muted: '#6B7280',
  border: '#E7E9EE',
  surface: '#FFFFFF',
  bg: '#F4F5F7',
  positive: '#1F9D55',
  negative: '#E6007E',
} as const;

// Colors per cost bucket (brand-consistent: red = Power Platform, charcoal = AI Foundry).
export const bucketColor: Record<'powerPlatform' | 'aiFoundry', string> = {
  powerPlatform: axians.red,
  aiFoundry: axians.blue,
};

// Palette used for category / model breakdown slices.
export const categoryPalette = [
  '#E6007E',
  '#1D3B8A',
  '#F25CAE',
  '#5B6470',
  '#F7A8D3',
  '#9AA1AC',
  '#7A0043',
  '#C3C8D0',
];
