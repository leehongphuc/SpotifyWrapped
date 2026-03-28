import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';

const { width, height } = Dimensions.get('window');

interface LoginScreenProps {
  onLogin: () => void;
  loading: boolean;
  error: string | null;
}

export default function LoginScreen({ onLogin, loading, error }: LoginScreenProps) {
  // Animations
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(40)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(0.8)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Sequence: Logo → Title → Button
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 50, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleY, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(btnScale, { toValue: 1, tension: 60, useNativeDriver: true }),
        Animated.timing(btnOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    // Pulse animation cho nút
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    setTimeout(() => pulse.start(), 1500);
    return () => pulse.stop();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0D0D1A', '#1A0E2E', '#0D0D1A']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Background blobs */}
      <View style={[styles.blob, { top: -100, left: -80, backgroundColor: Colors.neonPink + '20' }]} />
      <View style={[styles.blob, { bottom: 100, right: -80, backgroundColor: Colors.neonCyan + '15' }]} />
      <View style={[styles.blob, { top: height * 0.4, left: width * 0.3, backgroundColor: Colors.neonPurple + '15' }]} />

      <View style={styles.content}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            { transform: [{ scale: logoScale }], opacity: logoOpacity },
          ]}
        >
          <LinearGradient
            colors={Colors.gradientPink as [string, string]}
            style={styles.logoGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.logoEmoji}>🎵</Text>
          </LinearGradient>
        </Animated.View>

        {/* Title */}
        <Animated.View
          style={{
            transform: [{ translateY: titleY }],
            opacity: titleOpacity,
            alignItems: 'center',
          }}
        >
          <Text style={styles.appName}>Spotify Wrapped</Text>
          <Text style={styles.subtitle}>
            Khám phá âm nhạc{'\n'}của chính bạn 🎧
          </Text>
        </Animated.View>

        {/* Feature bullets */}
        <Animated.View style={[styles.features, { opacity: titleOpacity }]}>
          {[
            { icon: '🎵', text: 'Top bài hát yêu thích' },
            { icon: '🎤', text: 'Top nghệ sĩ hàng đầu' },
            { icon: '📊', text: 'Thống kê âm nhạc cá nhân' },
            { icon: '🎭', text: 'Phân tích thể loại nhạc' },
          ].map((f, i) => (
            <View key={i} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Login Button */}
        <Animated.View
          style={[
            styles.btnWrapper,
            {
              transform: [{ scale: btnScale }, { scale: pulseAnim }],
              opacity: btnOpacity,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onLogin}
            disabled={loading}
          >
            <LinearGradient
              colors={Colors.gradientSpotify as [string, string]}
              style={styles.loginBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <Text style={styles.loginBtnText}>Đang đăng nhập...</Text>
              ) : (
                <>
                  <Text style={styles.spotifyIcon}>🎧</Text>
                  <Text style={styles.loginBtnText}>Đăng nhập với Spotify</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Footnote */}
        <Animated.Text style={[styles.footnote, { opacity: btnOpacity }]}>
          Cần tài khoản Spotify để tiếp tục
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  blob: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    filter: 'blur(80px)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  logoContainer: {
    shadowColor: Colors.neonPink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 48,
  },
  appName: {
    color: Colors.textPrimary,
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
  features: {
    alignSelf: 'stretch',
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureIcon: {
    fontSize: 20,
  },
  featureText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  btnWrapper: {
    alignSelf: 'stretch',
    shadowColor: Colors.neonGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 50,
    gap: 10,
  },
  spotifyIcon: {
    fontSize: 22,
  },
  loginBtnText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  errorBox: {
    backgroundColor: '#FF2D7820',
    borderWidth: 1,
    borderColor: Colors.neonPink,
    borderRadius: 12,
    padding: 12,
    alignSelf: 'stretch',
  },
  errorText: {
    color: Colors.neonPink,
    fontSize: 13,
    textAlign: 'center',
  },
  footnote: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
});
