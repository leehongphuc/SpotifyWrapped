import spotifyAxios from './spotifyApi';

export interface AudioFeatures {
  danceability: number;
  energy: number;
  key: number;
  loudness: number;
  mode: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
  time_signature: number;
}

export interface TrackDetail {
  id: string;
  name: string;
  popularity: number;
  duration_ms: number;
  explicit: boolean;
  album: {
    name: string;
    release_date: string;
    images: { url: string }[];
    total_tracks: number;
  };
}

/** Lấy phân tích âm thanh của bài hát */
export async function getAudioFeatures(trackId: string): Promise<AudioFeatures> {
  const res = await spotifyAxios.get<AudioFeatures>(`/audio-features/${trackId}`);
  return res.data;
}

/** Lấy chi tiết bài hát (bao gồm popularity, release date) */
export async function getTrackDetail(trackId: string): Promise<TrackDetail> {
  const res = await spotifyAxios.get<TrackDetail>(`/tracks/${trackId}`);
  return res.data;
}

/** Format Key (0-11) sang tên nốt nhạc */
export function formatKey(key: number, mode: number): string {
  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const modeStr = mode === 1 ? 'Major' : 'Minor';
  return `${keys[key] || '?'} ${modeStr}`;
}

/** Format BPM */
export function formatBPM(bpm: number): string {
  return `${Math.round(bpm)} BPM`;
}

/** Format ms -> m:ss */
export function formatDurationMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/** Tính tổng số phút nghe từ playcount và duration */
export function formatMinutesListened(playcount: number, durationMs: number): string {
  const totalMs = playcount * durationMs;
  const minutes = Math.floor(totalMs / 60000);
  return `${minutes.toLocaleString()} phút`;
}