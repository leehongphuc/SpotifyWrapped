import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, set } from 'firebase/database';
import { db } from '../services/firebaseConfig';

WebBrowser.maybeCompleteAuthSession();

import { CLIENT_ID, SCOPES, discovery, TOKEN_KEY, REFRESH_KEY, EXPIRY_KEY } from '../constants/spotify';

// ─── Hook ─────────────────────────────────────────────────────
export function useSpotifyAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Khi app quay lại foreground → kiểm tra token còn không (thay vì polling interval)
  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (state: AppStateStatus) => {
      if (state === 'active') {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (!storedToken && tokenRef.current) {
          setToken(null);
        }
      }
    });
    return () => subscription.remove();
  }, []);

  // Redirect URI (tự động theo scheme trong app.json)
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'spotifywrapped',
    path: 'callback',
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: SCOPES.split(' '),
      redirectUri,
      usePKCE: true,
      responseType: AuthSession.ResponseType.Code,
    },
    discovery
  );

  // Khởi động — kiểm tra token đã lưu
  useEffect(() => {
    checkStoredToken();
  }, []);

  // Xử lý kết quả OAuth
  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      exchangeCodeForToken(code, request?.codeVerifier ?? '');
    } else if (response?.type === 'error') {
      const errDetail = response.error?.message || response.error?.code || JSON.stringify(response.error) || 'Unknown err';
      setError(`AuthError: ${errDetail}`);
      setLoading(false);
    } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
      setError('Bạn đã hủy đăng nhập.');
      setLoading(false);
    }
  }, [response]);

  /** Kiểm tra và load token đã lưu */
  async function checkStoredToken() {
    try {
      const [storedToken, expiry] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(EXPIRY_KEY),
      ]);

      if (storedToken && expiry) {
        const expiryTime = parseInt(expiry, 10);
        if (Date.now() < expiryTime - 60000) {

          // Token còn hạn → dùng luôn, thử verify sau
          setToken(storedToken);
          setLoading(false);

          // Verify + cập nhật Firebase trong nền (không block UI, không logout nếu lỗi mạng)
          verifyTokenInBackground(storedToken, expiryTime);
          return;

        } else {
          // Token hết hạn — thử refresh
          await tryRefreshToken(storedToken);
          return;
        }
      }
    } catch (e) {
      console.error('Error checking stored token:', e);
    }
    setLoading(false);
  }

  /** Xác minh token và cập nhật Firebase trong nền (không gây logout khi lỗi mạng) */
  async function verifyTokenInBackground(storedToken: string, expiryTime: number) {
    try {
      const profileRes = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${storedToken}` }
      });

      if (profileRes.status === 401 || profileRes.status === 403) {
        // Token thực sự không hợp lệ (không phải lỗi mạng) → mới logout
        await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY, EXPIRY_KEY]);
        setToken(null);
        return;
      }

      if (!profileRes.ok) {
        // Lỗi mạng / rate limit / server → giữ token cũ, không logout
        console.warn('verifyTokenInBackground: non-auth error, keeping token', profileRes.status);
        return;
      }

      const profileData = await profileRes.json();
      if (profileData?.id) {
        const refreshToken = await AsyncStorage.getItem(REFRESH_KEY);
        if (refreshToken) {
          const userRef = ref(db, `users/${profileData.id}/tokens`);
          await set(userRef, {
            refresh_token: refreshToken,
            access_token: storedToken,
            expires_at: expiryTime
          });
        }
      }
    } catch (e) {
      // Lỗi mạng hoàn toàn → giữ nguyên, không logout
      console.warn('verifyTokenInBackground: network error, keeping token', e);
    }
  }

  /** Đổi code → access token */
  async function exchangeCodeForToken(code: string, codeVerifier: string) {
    try {
      setLoading(true);
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: CLIENT_ID,
        code_verifier: codeVerifier,
      });

      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      const data = await res.json();

      if (data.access_token) {
        await saveToken(data.access_token, data.refresh_token, data.expires_in);
        setToken(data.access_token);
        setError(null);
        
        // Gọi Spotify API lấy UserId để cập nhật lên Firebase
        try {
          const profileRes = await fetch('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${data.access_token}` }
          });
          const profileData = await profileRes.json();
          if (profileData.id && data.refresh_token) {
            const userRef = ref(db, `users/${profileData.id}/tokens`);
            await set(userRef, {
              refresh_token: data.refresh_token,
              access_token: data.access_token,
              expires_at: Date.now() + (data.expires_in * 1000)
            });
            
            const profileRef = ref(db, `users/${profileData.id}/profile`);
            await set(profileRef, {
              display_name: profileData.display_name || 'Người dùng',
              updated_at: Date.now()
            });
          }
        } catch (dbErr) {
          console.error('Lỗi khi lưu token lên Firebase:', dbErr);
        }

      } else {
        setError('Không lấy được token từ Spotify.');
      }
    } catch (e) {
      setError('Lỗi kết nối. Vui lòng thử lại.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  /** Refresh token khi hết hạn */
  async function tryRefreshToken(fallbackToken?: string) {
    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_KEY);
      if (!refreshToken) {
        setLoading(false);
        return;
      }

      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
      });

      let res: Response;
      try {
        res = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });
      } catch (networkErr) {
        // Lỗi mạng — nếu có token cũ chưa hết hạn hản, dùng tạm
        console.warn('tryRefreshToken: network error, using fallback token if available');
        if (fallbackToken) {
          setToken(fallbackToken);
        }
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (data.access_token) {
        const finalRefreshToken = data.refresh_token ?? refreshToken;
        await saveToken(
          data.access_token,
          finalRefreshToken,
          data.expires_in
        );
        setToken(data.access_token);

        // Cập nhật Firebase ngay khi renew
        try {
          const profileRes = await fetch('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${data.access_token}` }
          });
          const profileData = await profileRes.json();
          if (profileData.id) {
            const userRef = ref(db, `users/${profileData.id}/tokens`);
            await set(userRef, {
              refresh_token: finalRefreshToken,
              access_token: data.access_token,
              expires_at: Date.now() + (data.expires_in * 1000)
            });
          }
        } catch (e) {}
      } else {
        // Refresh token hết hiệu lực (Spotify từ chối) → phải login lại
        console.error('tryRefreshToken: refresh rejected by Spotify', data);
        await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY, EXPIRY_KEY]);
      }
    } catch (e) {
      console.error('Refresh token error:', e);
    } finally {
      setLoading(false);
    }
  }

  /** Lưu token vào AsyncStorage */
  async function saveToken(
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ) {
    const expiryTime = Date.now() + expiresIn * 1000;
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, accessToken),
      AsyncStorage.setItem(REFRESH_KEY, refreshToken),
      AsyncStorage.setItem(EXPIRY_KEY, expiryTime.toString()),
    ]);
  }

  const queryClient = useQueryClient();

  /** Đăng xuất */
  const logout = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(REFRESH_KEY),
      AsyncStorage.removeItem(EXPIRY_KEY),
    ]);
    queryClient.clear(); // 👈 Xoá toàn bộ cache khi logout
    setToken(null);
  }, [queryClient]);

  /** Bắt đầu đăng nhập */
  const login = useCallback(async () => {
    setError(null);
    await promptAsync();
  }, [promptAsync]);

  return {
    token,
    loading,
    error,
    isAuthenticated: !!token,
    login,
    logout,
    request,
  };
}
