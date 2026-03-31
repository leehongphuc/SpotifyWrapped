import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { TimeRange } from '../services/spotifyApi';

// ── StatCard ─────────────────────────────────────────────────────

interface StatCardProps {
  emoji: string;
  value: string;
  label: string;
  gradientColors?: [string, string];
  delay?: number;
}

export function StatCard({
  emoji, value, label,
  gradientColors = [Colors.surface, Colors.surfaceLight],
  delay = 0,
}: StatCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[statStyles.wrapper, { opacity, transform: [{ translateY }] }]}>
      <LinearGradient
        colors={gradientColors}
        style={statStyles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={statStyles.value}>{value}</Text>
        <Text style={statStyles.label}>{label}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const statStyles = StyleSheet.create({
  wrapper: { flex: 1 },
  card: {
    borderRadius: 4,
    padding: 18,
    gap: 6,
    minHeight: 90,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  value: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});

// ── TimeFilter ───────────────────────────────────────────────────

const TIME_OPTIONS = [
  { key: '1_day' as const, label: '1 Day' },
  { key: '1_week' as const, label: '1 Week' },
  { key: 'short_term' as const, label: '4 Weeks' },
  { key: 'medium_term' as const, label: '6 Months' },
  { key: 'long_term' as const, label: 'All Time' },
];

interface TimeFilterProps {
  current: TimeRange;
  onChange: (v: TimeRange) => void;
}

export function TimeFilter({ current, onChange }: TimeFilterProps) {
  return (
    <View style={filterStyles.row}>
      {TIME_OPTIONS.map((o) => (
        <TouchableOpacity
          key={o.key}
          onPress={() => onChange(o.key)}
          activeOpacity={0.7}
          style={[filterStyles.btn, current === o.key && filterStyles.btnActive]}
        >
          <Text style={[filterStyles.btnLabel, current === o.key && filterStyles.btnLabelActive]}>
            {o.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const filterStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnActive: {
    borderColor: Colors.gold,
    backgroundColor: Colors.gold + '15',
  },
  btnLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  btnLabelActive: {
    color: Colors.gold,
  },
});

// ── SectionHeader ────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  emoji?: string;
}

export function SectionHeader({ title, subtitle, emoji }: SectionHeaderProps) {
  return (
    <View style={headerStyles.container}>
      <Text style={headerStyles.title}>{title}</Text>
      {subtitle && <Text style={headerStyles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 0.5,
  },
});