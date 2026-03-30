import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../services/firebaseConfig';
import { SpotifyTrack } from '../services/spotifyApi';

export interface FirebaseStats {
  total_plays: number;
  total_minutes: number;
  last_updated: number;
}

export interface CurrentPlaying {
  track_id: string;
  track_name: string;
  artist_name: string;
  album_image: string;
  started_at: number;
  is_playing: boolean;
  progress_ms?: number;
}

export function useFirebaseStats(userId: string | undefined) {
  const [stats, setStats] = useState<FirebaseStats | null>(null);
  const [currentPlaying, setCurrentPlaying] = useState<CurrentPlaying | null>(null);
  // Dictionary map `trackId` -> Firebase Track object
  const [trackPlays, setTrackPlays] = useState<Record<string, any>>({});
  // Dictionary map `artistId` -> play count
  const [artistPlays, setArtistPlays] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!userId) {
      setStats(null);
      setCurrentPlaying(null);
      setTrackPlays({});
      return;
    }

    // Lắng nghe tổng thống kê
    const statsRef = ref(db, `users/${userId}/stats`);
    const unsubStats = onValue(statsRef, (snapshot) => {
      if (snapshot.exists()) {
        setStats(snapshot.val());
      }
    });

    // Lắng nghe bài đang phát
    const playingRef = ref(db, `users/${userId}/current_playing`);
    const unsubPlaying = onValue(playingRef, (snapshot) => {
      if (snapshot.exists()) {
        setCurrentPlaying(snapshot.val());
      } else {
        setCurrentPlaying(null);
      }
    });

    // Lắng nghe lượt phát từng bài (dictionary để map siêu tốc)
    const tracksRef = ref(db, `users/${userId}/tracks`);
    const unsubTracks = onValue(tracksRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const map: Record<string, any> = {};
        for (const trackId in data) {
          map[trackId] = data[trackId];
        }
        setTrackPlays(map);
      }
    });

    // Lắng nghe lượt nghe nghệ sĩ
    const artistsRef = ref(db, `users/${userId}/artists`);
    const unsubArtists = onValue(artistsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const map: Record<string, number> = {};
        for (const artistId in data) {
          map[artistId] = data[artistId].play_count || 0;
        }
        setArtistPlays(map);
      }
    });

    return () => {
      unsubStats();
      unsubPlaying();
      unsubTracks();
      unsubArtists();
    };
  }, [userId]);

  // Hàm helper để gắp Playcount Firebase vào mã Spotify Track
  const attachPlaycount = (tracks: SpotifyTrack[]): SpotifyTrack[] => {
    if (Object.keys(trackPlays).length === 0) return tracks;
    return tracks.map(t => ({
      ...t,
      playcount: trackPlays[t.id]?.play_count || 0
    }));
  };

  // Hàm helper gắp Playcount Firebase và đếm số Bài Hát đã lưu của Nghệ sĩ
  const attachArtistStats = (artists: any[]): any[] => {
    if (Object.keys(artistPlays).length === 0) return artists;
    return artists.map(a => {
      // Đếm số bài hát có tên nghệ sĩ này lọt vào firebase tracks
      let tracksCount = 0;
      for (const trackId in trackPlays) {
        if (trackPlays[trackId].artist?.includes(a.name)) {
          tracksCount++;
        }
      }

      return {
        ...a,
        playcount: artistPlays[a.id] || 0,
        tracks_count: tracksCount
      };
    });
  };

  return {
    stats,
    currentPlaying,
    trackPlays,
    attachPlaycount,
    attachArtistStats
  };
}
