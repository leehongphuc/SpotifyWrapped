// Spotify Wrapped Teen App - Color Theme
// Neon + Dark aesthetic

export const Colors = {
  // ── Core Background ──────────────────────────────
  background: '#080808',
  surface: '#111111',
  card: '#161616',
  surfaceLight: '#1E1E1E',

  // ── Borders ──────────────────────────────────────
  border: '#2A2A2A',
  borderLight: '#333333',

  // ── Text ─────────────────────────────────────────
  textPrimary: '#F5F0E8',   // warm white, không lạnh
  textSecondary: '#9A9490',   // warm grey
  textMuted: '#555050',

  // ── Accent: Gold ─────────────────────────────────
  gold: '#C9A84C',
  goldLight: '#E8C870',
  goldDim: '#8A6F2E',

  // ── Accent: thay neon bằng tones sang ────────────
  neonPink: '#C9A84C',   // map → gold
  neonCyan: '#8AAFA8',   // muted teal
  neonPurple: '#7A6E8A',   // muted mauve
  neonGreen: '#6A8A6E',   // muted sage
  neonYellow: '#C9A84C',   // map → gold

  // ── Medal ────────────────────────────────────────
  silver: '#9BA3AE',
  bronze: '#A07850',

  // ── Gradients ────────────────────────────────────
  gradientPink: ['#C9A84C', '#8A6F2E'],
  gradientSpotify: ['#1DB954', '#158A3E'],

  // ── Genre chart colors (muted, luxury) ───────────
  genreColors: [
    '#C9A84C', '#8AAFA8', '#7A6E8A',
    '#A07850', '#6A8A6E', '#9BA3AE',
    '#B8866A', '#7A8AAA',
  ],
};

export type ColorKey = keyof typeof Colors;
