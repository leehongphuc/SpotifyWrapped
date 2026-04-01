const express = require('express');
const admin = require('firebase-admin');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

// --- 1. SETUP FIREBASE ADMIN ---
// Bạn CẦN tải file google-credentials.json từ Firebase Console (Project Settings -> Service Accounts)
// Đặt nó vào thư mục render-bot và cấu hình biến môi trường FIREBASE_CREDENTIALS nếu đẩy lên Render
let serviceAccount;
try {
  serviceAccount = require('./google-credentials.json');
} catch (e) {
  console.log("Cảnh báo: Không tìm thấy google-credentials.json, đang thử đọc từ biến môi trường...");
  if (process.env.FIREBASE_CREDENTIALS) {
    serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
  } else {
    console.error("LỖI: Chưa có chứng chỉ Firebase Admin.");
  }
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // THAY BẰNG URL FIREBASE CỦA BẠN
    databaseURL: process.env.FIREBASE_DB_URL || "https://nghenhac-53b05-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}

const db = admin.database();

// --- 2. SPOTIFY APP CREDENTIALS ---
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || 'd80501e40c4d45adb2b11a05f0f36102';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || 'c86a8c794f354f3396ae5d69eaf89460'; // Phải lấy từ Spotify Dashboard

// --- 3. CORE BOT LOGIC ---
const refreshAccessToken = async (userId, refreshToken) => {
  try {
    const authString = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);

    const res = await axios.post('https://accounts.spotify.com/api/token', params.toString(), {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const newAccessToken = res.data.access_token;
    const expiresIn = res.data.expires_in;

    // Ghi lại vào DB
    await db.ref(`users/${userId}/tokens/access_token`).set(newAccessToken);
    await db.ref(`users/${userId}/tokens/expires_at`).set(Date.now() + expiresIn * 1000);

    return newAccessToken;
  } catch (error) {
    console.error(`Lỗi refresh token cho user ${userId}:`, error.response?.data || error.message);
    return null;
  }
};

const checkAndLogPlaycount = async (userId, accessToken) => {
  try {
    const res = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // Trả về 204 nghĩa là đang không nghe gì
    if (res.status === 204 || !res.data || !res.data.is_playing || !res.data.item) return;

    const currentTrack = res.data.item;
    const newProgressMs = res.data.progress_ms;

    // Lấy thông tin bài hát cuối cùng từ Firebase (bản lưu cục bộ để so sánh)
    const playingRef = db.ref(`users/${userId}/current_playing`);
    const snap = await playingRef.once('value');
    const lastState = snap.val() || {};

    const isNewSong = lastState.track_id !== currentTrack.id;
    const isRepeated = lastState.track_id === currentTrack.id && newProgressMs < (lastState.progress_ms || 0) - 10000;

    // Nếu bài vừa đổi hoặc lặp lại -> Tính 1 lượt nghe mới
    if (isNewSong || isRepeated) {
      console.log(`[+] User ${userId} bắt đầu nghe bài: ${currentTrack.name}`);

      // ─────────────────────────────────────────────────────────
      // NEW: Cập nhật THỜI GIAN NGHE CHÍNH XÁC cho bài hát TRƯỚC ĐÓ
      // ─────────────────────────────────────────────────────────
      if (lastState.track_id && lastState.progress_ms) {
        const lastTrackRef = db.ref(`users/${userId}/tracks/${lastState.track_id}`);
        await lastTrackRef.transaction((trackData) => {
          if (trackData) {
            trackData.total_listened_ms = (trackData.total_listened_ms || 0) + lastState.progress_ms;
          }
          return trackData;
        });

        // Cập nhật tổng thống kê (minutes & plays)
        const statsRef = db.ref(`users/${userId}/stats`);
        await statsRef.transaction((stats) => {
          if (stats) {
            const addedMinutes = lastState.progress_ms / 60000;
            const newTotal = (stats.total_minutes || 0) + addedMinutes;
            stats.total_minutes = Math.round(newTotal * 100) / 100;
            
            // CHỈ CỘNG 1 LƯỢT NẾU NGHE TRÊN 30 GIÂY
            if (lastState.progress_ms >= 30000) {
              stats.total_plays = (stats.total_plays || 0) + 1;
            }
            
            stats.last_updated = Date.now();
          }
          return stats;
        });

        // ─────────────────────────────────────────────────────────
        // Tăng Play Count cho bài hát VỪA KẾT THÚC (Nếu đủ 30s)
        // ─────────────────────────────────────────────────────────
        if (lastState.progress_ms >= 30000) {
          const lastTrackRef = db.ref(`users/${userId}/tracks/${lastState.track_id}`);
          await lastTrackRef.transaction((trackData) => {
            if (trackData) {
              trackData.play_count = (trackData.play_count || 0) + 1;
            }
            return trackData;
          });

          // Tăng Play Count cho nghệ sĩ
          // (Lưu ý: Nghệ sĩ hiện lưu theo chuỗi tên trong history, hoặc ta duyệt qua artists hiện tại)
          // Tốt nhất là duyệt qua artists của lastState (cần lưu lại list artist_ids trong current_playing)
          if (lastState.artist_ids) {
            for (const artistId of lastState.artist_ids) {
               const artistRef = db.ref(`users/${userId}/artists/${artistId}`);
               await artistRef.transaction((aData) => {
                 if (aData) aData.play_count = (aData.play_count || 0) + 1;
                 return aData;
               });
            }
          }
        }
      }

      // Khởi tạo thông tin cho bài hát HIỆN TẠI (Không tăng play_count ngay)
      const trackRef = db.ref(`users/${userId}/tracks/${currentTrack.id}`);
      await trackRef.transaction((trackData) => {
        if (!trackData) {
          return {
            name: currentTrack.name,
            artist: currentTrack.artists.map(a => a.name).join(', '),
            album_image: currentTrack.album?.images[0]?.url || '',
            duration_ms: currentTrack.duration_ms,
            play_count: 0, // Đợi kết thúc mới tính nếu đủ 30s
            last_played: Date.now(),
            total_listened_ms: 0
          };
        }
        trackData.last_played = Date.now();
        return trackData;
      });

      // Stats (Chỉ đảm bảo nút stats tồn tại)
      const globalStatsRef = db.ref(`users/${userId}/stats`);
      await globalStatsRef.transaction((stats) => {
        if (!stats) return { total_plays: 0, total_minutes: 0, last_updated: Date.now() };
        return stats;
      });

      // Đảm bảo thông tin Nghệ sĩ (Lấy ảnh nếu cần)
      for (const artist of currentTrack.artists) {
        const artistRef = db.ref(`users/${userId}/artists/${artist.id}`);
        await artistRef.transaction(async (aData) => {
          if (!aData) {
            try {
              const artistRes = await axios.get(`https://api.spotify.com/v1/artists/${artist.id}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
              });
              return { 
                name: artist.name, 
                play_count: 0,
                image_url: artistRes.data.images?.[0]?.url || '' 
              };
            } catch (e) {
              return { name: artist.name, play_count: 0, image_url: '' };
            }
          }
          if (!aData.image_url) {
             try {
              const artistRes = await axios.get(`https://api.spotify.com/v1/artists/${artist.id}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
              });
              aData.image_url = artistRes.data.images?.[0]?.url || '';
            } catch (e) {}
          }
          return aData;
        });
      }

      // ─────────────────────────────────────────────────────────
      // Ghi log lịch sử (History) cho bài hát VỪA KẾT THÚC
      // ─────────────────────────────────────────────────────────
      if (lastState.track_id && lastState.progress_ms) {
        const historyRef = db.ref(`users/${userId}/history`);
        await historyRef.push({
          track_id: lastState.track_id,
          played_at: admin.database.ServerValue.TIMESTAMP,
          listened_ms: lastState.progress_ms // Lưu thời gian thực tế đã nghe
        });
      }
      // ─────────────────────────────────────────────────────────
    }

    // Cập nhật trạng thái "Đang phát" (Liên tục cập nhật progress_ms)
    await playingRef.set({
      track_id: currentTrack.id,
      track_name: currentTrack.name,
      artist_name: currentTrack.artists.map(a => a.name).join(', '),
      artist_ids: currentTrack.artists.map(a => a.id), // Lưu lại để sau này cộng play_count cho chính xác
      album_image: currentTrack.album?.images[0]?.url || '',
      progress_ms: newProgressMs,
      started_at: isNewSong ? Date.now() : (lastState.started_at || Date.now()),
      is_playing: true
    });

  } catch (error) {
    console.error(`Lỗi lấy Bài hát hiện tại cho user ${userId}:`, error.response?.data || error.message);
  }
};

const runBotLoop = async () => {
  try {
    const usersSnap = await db.ref('users').once('value');
    const users = usersSnap.val();
    if (!users) return;

    for (const userId in users) {
      const user = users[userId];
      if (user.tokens && user.tokens.refresh_token) {

        // Kiểm tra xem Access Token còn hạn không
        let accessToken = user.tokens.access_token;
        const expiresAt = user.tokens.expires_at || 0;

        // Nếu hết hạn hoặc sắp hết hạn (dưới 5 phút), yêu cầu gia hạn
        if (!accessToken || Date.now() > expiresAt - 300000) {
          accessToken = await refreshAccessToken(userId, user.tokens.refresh_token);
        }

        if (accessToken) {
          await checkAndLogPlaycount(userId, accessToken);
        }
      }
    }
  } catch (err) {
    console.error('Lỗi Bot Loop:', err);
  }
};

// --- 4. START SERVER & CRON ---
app.get('/', (req, res) => {
  res.send('Spotify Tracker Bot is running 24/7! 🎵');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot server đang chạy port ${PORT}`);

  // Chạy Bot mỗi 30 giây để quét nhạc
  setInterval(runBotLoop, 30000);
});
