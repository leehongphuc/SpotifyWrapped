// Spotify OAuth2 & Storage Configuration

export const CLIENT_ID = 'd80501e40c4d45adb2b11a05f0f36102';

export const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'user-read-recently-played',
  'playlist-read-private',
  'user-read-currently-playing',
  'user-read-playback-state',
].join(' ');

export const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

// ─── Storage Keys ─────────────────────────────────────────────
export const TOKEN_KEY = 'spotify_access_token';
export const REFRESH_KEY = 'spotify_refresh_token';
export const EXPIRY_KEY = 'spotify_token_expiry';
