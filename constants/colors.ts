// Spotify Wrapped Teen App - Color Theme
// Neon + Dark aesthetic

export const Colors = {
  // Primary brand
  background: '#0D0D1A',
  surface: '#16162A',
  surfaceLight: '#1E1E35',
  card: '#1A1A30',

  // Neon accent palette (teen vibe)
  neonPink: '#FF2D78',
  neonPurple: '#A855F7',
  neonCyan: '#06B6D4',
  neonGreen: '#1DB954', // Spotify green
  neonYellow: '#FACC15',

  // Gradient combos
  gradientPink: ['#FF2D78', '#A855F7'],
  gradientCyan: ['#06B6D4', '#3B82F6'],
  gradientGold: ['#FACC15', '#F97316'],
  gradientSpotify: ['#1DB954', '#158a3e'],
  gradientDark: ['#0D0D1A', '#16162A'],
  gradientCard: ['#1A1A30', '#16162A'],

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0CC',
  textMuted: '#6B6B90',

  // UI
  border: '#2A2A45',
  divider: '#1E1E35',
  overlay: 'rgba(0,0,0,0.6)',

  // Rank colors
  gold: '#FACC15',
  silver: '#9CA3AF',
  bronze: '#F97316',

  // Music genres (chart colors)
  genreColors: [
    '#FF2D78',
    '#A855F7',
    '#06B6D4',
    '#1DB954',
    '#FACC15',
    '#F97316',
    '#EF4444',
    '#8B5CF6',
  ],
};

export type ColorKey = keyof typeof Colors;
