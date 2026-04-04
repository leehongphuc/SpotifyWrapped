import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../services/firebaseConfig';

export interface FirebaseStats {
  total_plays: number;
  total_minutes: number;
  last_updated: number;
}

export interface HistoryRecord {
  track_id: string;
  track_name: string;
  artist_name: string;
  album_image: string;
  played_at: number;
  listened_ms: number; // Mốc thời gian thực tế đã nghe
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
  // Dictionary map `artistId` -> artist object {name, play_count}
  const [artistPlays, setArtistPlays] = useState<Record<string, any>>({});
  // List of historical play records
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    // Reset toàn bộ khi userId thay đổi hoặc logout
    if (!userId) {
      setStats(null);
      setCurrentPlaying(null);
      setTrackPlays({});
      setArtistPlays({});
      setHistory([]);
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

    const artistsRef = ref(db, `users/${userId}/artists`);
    const unsubArtists = onValue(artistsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setArtistPlays(data);
      }
    });

    // Lắng nghe lịch sử lượt nghe (History)
    const historyRef = ref(db, `users/${userId}/history`);
    const unsubHistory = onValue(historyRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: HistoryRecord[] = Object.keys(data).map(key => ({
          ...data[key],
          id: key
        }));
        setHistory(list.sort((a, b) => b.played_at - a.played_at));
      } else {
        setHistory([]);
      }
    });

    return () => {
      unsubStats();
      unsubPlaying();
      unsubTracks();
      unsubArtists();
      unsubHistory();
    };
  }, [userId]);

  return {
    stats,
    currentPlaying,
    trackPlays,
    artistPlays,
    history,
  };
}
