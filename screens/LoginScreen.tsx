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
  const fadeIn = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(24)).current;
  const btnY = useRef(new Animated.Value(32)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(fadeIn, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(titleY, { toValue: 0, duration: 700, useNativeDriver: true }),
      Animated.timing(btnY, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Subtle radial glow top */}
      <View style={styles.glowTop} />
      {/* Subtle glow bottom */}
      <View style={styles.glowBottom} />

      {/* Thin horizontal rule accent */}
      <View style={styles.topRule} />

      <Animated.View style={[styles.content, { opacity: fadeIn }]}>

        {/* Wordmark / Logo */}
        <Animated.View style={[styles.logoArea, { transform: [{ translateY: titleY }] }]}>
          <View style={styles.logoMark}>
            <Text style={styles.logoGlyph}>♪</Text>
          </View>
          <Text style={styles.appName}>WRAPPED</Text>
          <Text style={styles.appSub}>YOUR MUSIC · YOUR STORY</Text>
        </Animated.View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerDot}>◆</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Feature list — clean, no emoji overload */}
        <Animated.View style={[styles.features, { transform: [{ translateY: btnY }] }]}>
          {[
            ['Top Tracks', 'Bài hát bạn nghe nhiều nhất'],
            ['Top Artists', 'Nghệ sĩ gắn liền với bạn'],
            ['Listening DNA', 'Phân tích thể loại cá nhân'],
            ['Live Tracker', 'Ghi nhận lượt nghe realtime'],
          ].map(([title, sub]) => (
            <View key={title} style={styles.featureRow}>
              <View style={styles.featureDot} />
              <View>
                <Text style={styles.featureTitle}>{title}</Text>
                <Text style={styles.featureSub}>{sub}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* CTA */}
        <Animated.View style={[styles.btnWrap, { transform: [{ translateY: btnY }] }]}>
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={onLogin}
            disabled={loading}
            style={styles.btn}
          >
            <LinearGradient
              colors={['#1DB954', '#17A349']}
              style={styles.btnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.btnText}>
                {loading ? 'Đang kết nối…' : 'Kết nối Spotify'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.footnote}>Cần tài khoản Spotify để tiếp tục</Text>
        </Animated.View>

      </Animated.View>

      {/* Bottom rule */}
      <View style={styles.bottomRule} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
  },
  glowTop: {
    position: 'absolute',
    top: -120,
    alignSelf: 'center',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: Colors.gold,
    opacity: 0.04,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -100,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#1DB954',
    opacity: 0.05,
  },
  topRule: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.border,
  },
  bottomRule: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.border,
  },
  content: {
    paddingHorizontal: 32,
    gap: 40,
  },
  logoArea: {
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoGlyph: {
    color: Colors.gold,
    fontSize: 30,
  },
  appName: {
    color: Colors.textPrimary,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 10,
  },
  appSub: {
    color: Colors.textMuted,
    fontSize: 10,
    letterSpacing: 4,
    fontWeight: '500',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerDot: {
    color: Colors.goldDim,
    fontSize: 8,
  },
  features: {
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  featureDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gold,
    marginTop: 6,
  },
  featureTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  featureSub: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  btnWrap: {
    gap: 16,
    alignItems: 'center',
  },
  btn: {
    alignSelf: 'stretch',
    borderRadius: 6,
    overflow: 'hidden',
  },
  btnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  errorBox: {
    backgroundColor: '#2A1010',
    borderWidth: 1,
    borderColor: '#5A2020',
    borderRadius: 6,
    padding: 12,
    alignSelf: 'stretch',
  },
  errorText: {
    color: '#D08080',
    fontSize: 12,
    textAlign: 'center',
  },
  footnote: {
    color: Colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.5,
  },
});