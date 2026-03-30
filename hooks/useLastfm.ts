import { useCallback } from 'react';
import { getLastfmTopTracks, getLastfmTopArtists } from '../services/lastfmApi';
import { SpotifyTrack, SpotifyArtist } from '../services/spotifyApi';

const normalizeStr = (str: string) => {
  if (!str) return '';
  return str
    .normalize('NFD') // Tách dấu
    .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]/g, '') // Chỉ giữ lại chữ và số
    .toLowerCase();
};

export function useLastfm() {
  const enrichTracks = useCallback(async (tracks: SpotifyTrack[], username?: string): Promise<SpotifyTrack[]> => {
    if (!username || tracks.length === 0) return tracks;
    
    // Tự động bỏ dấu và khoảng trắng để ra username chuẩn
    const cleanUsername = username.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
    
    try {
      const lastfmTracks = await getLastfmTopTracks(cleanUsername, 200);
      return tracks.map(spotifyTrack => {
        const normSpot = normalizeStr(spotifyTrack.name);
        if (!normSpot) return { ...spotifyTrack, playcount: 0 };
        
        const match = lastfmTracks.find(lt => {
          const normLf = normalizeStr(lt.name);
          return normLf.includes(normSpot) || normSpot.includes(normLf);
        });
        return { ...spotifyTrack, playcount: match ? parseInt(match.playcount, 10) : 0 };
      });
    } catch (e) {
      return tracks.map(t => ({ ...t, playcount: 0 }));
    }
  }, []);

  const enrichArtists = useCallback(async (artists: SpotifyArtist[], username?: string): Promise<SpotifyArtist[]> => {
    if (!username || artists.length === 0) return artists;
    
    const cleanUsername = username.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');

    try {
      const lastfmArtists = await getLastfmTopArtists(cleanUsername, 200);
      return artists.map(spotifyArtist => {
        const normSpot = normalizeStr(spotifyArtist.name);
        if (!normSpot) return { ...spotifyArtist, playcount: 0 };
        
        const match = lastfmArtists.find(la => {
          const normLf = normalizeStr(la.name);
          return normLf.includes(normSpot) || normSpot.includes(normLf);
        });
        return { ...spotifyArtist, playcount: match ? parseInt(match.playcount, 10) : 0 };
      });
    } catch (e) {
      return artists.map(a => ({ ...a, playcount: 0 }));
    }
  }, []);

  return { enrichTracks, enrichArtists };
}
