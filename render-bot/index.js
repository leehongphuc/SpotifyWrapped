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
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || 'NHẬP_SECRET_CỦA_BẠN'; // Phải lấy từ Spotify Dashboard

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
      
      const trackRef = db.ref(`users/${userId}/tracks/${currentTrack.id}`);
      await trackRef.transaction((trackData) => {
        if (!trackData) {
          return {
            name: currentTrack.name,
            artist: currentTrack.artists.map(a => a.name).join(', '),
            album_image: currentTrack.album?.images[0]?.url || '',
            duration_ms: currentTrack.duration_ms,
            play_count: 1,
            last_played: Date.now()
          };
        }
        trackData.play_count = (trackData.play_count || 0) + 1;
        trackData.last_played = Date.now();
        return trackData;
      });

      const statsRef = db.ref(`users/${userId}/stats`);
      await statsRef.transaction((stats) => {
        if (!stats) return { total_plays: 1, total_minutes: Math.round(currentTrack.duration_ms/60000), last_updated: Date.now() };
        stats.total_plays = (stats.total_plays || 0) + 1;
        stats.total_minutes = (stats.total_minutes || 0) + Math.round(currentTrack.duration_ms / 60000);
        stats.last_updated = Date.now();
        return stats;
      });

      // Ghi nhận lượt nghe cho Nghệ sĩ (hỗ trợ nhiều nghệ sĩ trên một bài)
      currentTrack.artists.forEach(async (artist) => {
        const artistRef = db.ref(`users/${userId}/artists/${artist.id}`);
        await artistRef.transaction((aData) => {
          if (!aData) return { name: artist.name, play_count: 1 };
          aData.play_count = (aData.play_count || 0) + 1;
          return aData;
        });
      });
    }

    // Cập nhật trạng thái "Đang phát" (kể cả không tăng playcount)
    await playingRef.set({
      track_id: currentTrack.id,
      track_name: currentTrack.name,
      artist_name: currentTrack.artists.map(a => a.name).join(', '),
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
