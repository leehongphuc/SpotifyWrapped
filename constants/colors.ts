// Spotify Wrapped Teen App - Color Theme
// Neon + Dark aesthetic

export const Colors = {
  // Primary brand (Minimalist Pitch Black for OLED)
  background: '#000000',
  surface: '#121212',
  surfaceLight: '#242424',
  card: '#181818',

  // Solid Bold Accents (Spotify Wrapped Authentic)
  neonPink: '#FF007F', // Authentic bold pink
  neonPurple: '#6B00FF', // Deep pop purple
  neonCyan: '#00F0FF',
  neonGreen: '#1DB954', // Spotify Official Green
  neonYellow: '#FFFB00',
  bronze: '#FF5C00',

  // Gradient combos (Rarely used now, kept for fallback)
  gradientPink: ['#FF007F', '#cc0066'],
  gradientCyan: ['#00F0FF', '#00cccc'],
  gradientGold: ['#FFFB00', '#FF5C00'],
  gradientSpotify: ['#1DB954', '#1AA34A'],
  gradientDark: ['#000000', '#121212'],
  gradientCard: ['#181818', '#121212'],

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#B3B3B3', // Standard Spotify gray
  textMuted: '#A0A0A0',

  // UI
  border: '#2A2A2A',
  divider: '#2A2A2A',
  overlay: 'rgba(0,0,0,0.8)',

  // Rank colors
  gold: '#FFD700',
  silver: '#C0C0C0',

  // Music genres (chart colors)
  genreColors: [
    '#1DB954',
    '#FF007F',
    '#FFFB00',
    '#6B00FF',
    '#00F0FF',
    '#FF5C00',
    '#FFFFFF',
    '#C0C0C0',
  ],
};

export type ColorKey = keyof typeof Colors;
