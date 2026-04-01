const express = require('express');
const admin = require('firebase-admin');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

// ─── 1. FIREBASE ADMIN SETUP ──────────────────────────────────────
let serviceAccount;
try {
  serviceAccount = require('./google-credentials.json');
} catch (e) {
  console.log('Cảnh báo: Không tìm thấy google-credentials.json, đọc từ biến môi trường...');
  if (process.env.FIREBASE_CREDENTIALS) {
    serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
  } else {
    console.error('LỖI: Chưa có chứng chỉ Firebase Admin.');
  }
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL:
      process.env.FIREBASE_DB_URL ||
      'https://nghenhac-53b05-default-rtdb.asia-southeast1.firebasedatabase.app',
  });
}

const db = admin.database();

// ─── 2. SPOTIFY CREDENTIALS ───────────────────────────────────────
const SPOTIFY_CLIENT_ID =
  process.env.SPOTIFY_CLIENT_ID || 'd80501e40c4d45adb2b11a05f0f36102';
const SPOTIFY_CLIENT_SECRET =
  process.env.SPOTIFY_CLIENT_SECRET || 'c86a8c794f354f3396ae5d69eaf89460';

// ─── 3. HELPERS ───────────────────────────────────────────────────

const refreshAccessToken = async (userId, refreshToken) => {
  try {
    const authString = Buffer.from(
      `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
    ).toString('base64');

    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);

    const res = await axios.post(
      'https://accounts.spotify.com/api/token',
      params.toString(),
      {
        headers: {
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const newAccessToken = res.data.access_token;
    const expiresIn = res.data.expires_in;

    await db.ref(`users/${userId}/tokens`).update({
      access_token: newAccessToken,
      expires_at: Date.now() + expiresIn * 1000,
      ...(res.data.refresh_token && { refresh_token: res.data.refresh_token }),
    });

    console.log(`[Token] Refreshed token for user ${userId}`);
    return newAccessToken;
  } catch (error) {
    console.error(
      `[Token] Lỗi refresh token user ${userId}:`,
      error.response?.data || error.message
    );
    return null;
  }
};

/**
 * Lấy image_url của artist từ Spotify API (dùng ngoài transaction)
 */
const fetchArtistImage = async (artistId, accessToken) => {
  try {
    const res = await axios.get(
      `https://api.spotify.com/v1/artists/${artistId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return res.data.images?.[0]?.url || '';
  } catch (e) {
    return '';
  }
};

// ─── 4. CORE BOT LOGIC ────────────────────────────────────────────

const checkAndLogPlaycount = async (userId, accessToken) => {
  try {
    const res = await axios.get(
      'https://api.spotify.com/v1/me/player/currently-playing',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    // 204 = không có gì đang phát
    if (res.status === 204 || !res.data || !res.data.is_playing || !res.data.item) {
      // Xóa current_playing khi dừng hẳn
      await db.ref(`users/${userId}/current_playing`).remove();
      return;
    }

    const currentTrack = res.data.item;
    const newProgressMs = res.data.progress_ms;

    // Đọc trạng thái cũ
    const playingRef = db.ref(`users/${userId}/current_playing`);
    const snap = await playingRef.once('value');
    const lastState = snap.val() || {};

    const isNewSong = lastState.track_id !== currentTrack.id;
    // Phát lại từ đầu: progress hiện tại nhỏ hơn progress cũ đáng kể
    const isRepeated =
      lastState.track_id === currentTrack.id &&
      newProgressMs < (lastState.progress_ms || 0) - 10000;

    // ── Khi chuyển bài hoặc lặp lại ────────────────────────────
    if (isNewSong || isRepeated) {
      console.log(`[Track] User ${userId} → "${currentTrack.name}"`);

      // Xử lý bài hát VỪA KẾT THÚC
      if (lastState.track_id && lastState.progress_ms) {
        const listenedMs = lastState.progress_ms;
        const counted = listenedMs >= 30000; // Chỉ tính nếu nghe >= 30 giây

        // 4a. Cộng dồn thời gian nghe thực tế cho track vừa kết thúc
        await db
          .ref(`users/${userId}/tracks/${lastState.track_id}`)
          .transaction((trackData) => {
            if (!trackData) return trackData; // Không tạo mới ở đây
            trackData.total_listened_ms =
              (trackData.total_listened_ms || 0) + listenedMs;
            if (counted) {
              trackData.play_count = (trackData.play_count || 0) + 1;
            }
            return trackData;
          });

        // 4b. Cập nhật tổng thống kê toàn user
        await db.ref(`users/${userId}/stats`).transaction((stats) => {
          if (!stats) {
            return {
              total_plays: counted ? 1 : 0,
              total_minutes: Math.round((listenedMs / 60000) * 100) / 100,
              last_updated: Date.now(),
            };
          }
          stats.total_minutes =
            Math.round(((stats.total_minutes || 0) + listenedMs / 60000) * 100) / 100;
          if (counted) {
            stats.total_plays = (stats.total_plays || 0) + 1;
          }
          stats.last_updated = Date.now();
          return stats;
        });

        // 4c. Tăng play_count cho từng artist (chỉ khi nghe >= 30s)
        //     Transaction thuần — KHÔNG async bên trong
        if (counted && lastState.artist_ids?.length) {
          for (const artistId of lastState.artist_ids) {
            await db
              .ref(`users/${userId}/artists/${artistId}`)
              .transaction((aData) => {
                if (!aData) return aData; // Artist chưa tồn tại → bỏ qua
                aData.play_count = (aData.play_count || 0) + 1;
                return aData;
              });
          }
        }

        // 4d. Ghi lịch sử
        await db.ref(`users/${userId}/history`).push({
          track_id: lastState.track_id,
          track_name: lastState.track_name || '',
          artist_name: lastState.artist_name || '',
          album_image: lastState.album_image || '',
          played_at: admin.database.ServerValue.TIMESTAMP,
          listened_ms: listenedMs,
        });
      }

      // ── Khởi tạo / cập nhật thông tin bài hát HIỆN TẠI ────────
      const newTrackData = {
        name: currentTrack.name,
        artist: currentTrack.artists.map((a) => a.name).join(', '),
        album_image: currentTrack.album?.images[0]?.url || '',
        duration_ms: currentTrack.duration_ms,
        last_played: Date.now(),
      };

      await db
        .ref(`users/${userId}/tracks/${currentTrack.id}`)
        .transaction((trackData) => {
          if (!trackData) {
            // Bài mới hoàn toàn — tạo mới
            return { ...newTrackData, play_count: 0, total_listened_ms: 0 };
          }
          // Bài đã biết — chỉ cập nhật meta
          trackData.last_played = newTrackData.last_played;
          trackData.album_image = newTrackData.album_image || trackData.album_image;
          trackData.artist = newTrackData.artist || trackData.artist;
          return trackData;
        });

      // ── Đảm bảo stats node tồn tại ─────────────────────────────
      await db.ref(`users/${userId}/stats`).transaction((stats) => {
        if (!stats) {
          return { total_plays: 0, total_minutes: 0, last_updated: Date.now() };
        }
        return stats;
      });

      // ── Cập nhật thông tin artist (fetch image bên NGOÀI transaction) ─
      for (const artist of currentTrack.artists) {
        const artistRef = db.ref(`users/${userId}/artists/${artist.id}`);
        const artistSnap = await artistRef.once('value');
        const existingArtist = artistSnap.val();

        if (!existingArtist) {
          // Artist chưa có → fetch ảnh rồi ghi mới
          const imageUrl = await fetchArtistImage(artist.id, accessToken);
          await artistRef.set({
            id: artist.id,
            name: artist.name,
            play_count: 0,
            image_url: imageUrl,
          });
          console.log(`[Artist] Created: ${artist.name} | image: ${imageUrl ? 'OK' : 'none'}`);
        } else {
          // Artist đã có → chỉ patch nếu thiếu thông tin
          const updates = {};
          if (!existingArtist.id) updates.id = artist.id;
          if (!existingArtist.image_url) {
            const imageUrl = await fetchArtistImage(artist.id, accessToken);
            if (imageUrl) updates.image_url = imageUrl;
          }
          if (Object.keys(updates).length > 0) {
            await artistRef.update(updates);
          }
        }
      }
    }

    // ── Luôn cập nhật current_playing với progress mới nhất ──────
    await playingRef.set({
      track_id: currentTrack.id,
      track_name: currentTrack.name,
      artist_name: currentTrack.artists.map((a) => a.name).join(', '),
      artist_ids: currentTrack.artists.map((a) => a.id),
      album_image: currentTrack.album?.images[0]?.url || '',
      progress_ms: newProgressMs,
      started_at: isNewSong ? Date.now() : lastState.started_at || Date.now(),
      is_playing: true,
    });
  } catch (error) {
    if (error.response?.status === 401) {
      console.warn(`[Auth] Token hết hạn sớm cho user ${userId}, sẽ refresh ở vòng tiếp theo`);
    } else {
      console.error(
        `[Bot] Lỗi user ${userId}:`,
        error.response?.data || error.message
      );
    }
  }
};

// ─── 5. BOT LOOP ──────────────────────────────────────────────────

const runBotLoop = async () => {
  try {
    const usersSnap = await db.ref('users').once('value');
    const users = usersSnap.val();
    if (!users) return;

    const userIds = Object.keys(users);
    console.log(`[Loop] Scanning ${userIds.length} user(s)...`);

    // Chạy song song tất cả users để tăng tốc
    await Promise.allSettled(
      userIds.map(async (userId) => {
        const user = users[userId];
        if (!user.tokens?.refresh_token) return;

        let accessToken = user.tokens.access_token;
        const expiresAt = user.tokens.expires_at || 0;

        // Refresh nếu hết hạn hoặc còn dưới 5 phút
        if (!accessToken || Date.now() > expiresAt - 300000) {
          accessToken = await refreshAccessToken(userId, user.tokens.refresh_token);
        }

        if (accessToken) {
          await checkAndLogPlaycount(userId, accessToken);
        }
      })
    );
  } catch (err) {
    console.error('[Loop] Lỗi:', err.message);
  }
};

// ─── 6. SERVER & CRON ─────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.send('🎵 Spotify Tracker Bot is running 24/7!');
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot server đang chạy port ${PORT}`);
  // Chạy ngay lần đầu, sau đó mỗi 30 giây
  runBotLoop();
  setInterval(runBotLoop, 30000);
});