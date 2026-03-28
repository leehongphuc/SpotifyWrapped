import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';

interface TimeFilterProps {
  current: 'short_term' | 'medium_term' | 'long_term';
  onChange: (v: 'short_term' | 'medium_term' | 'long_term') => void;
}

const OPTIONS = [
  { key: 'short_term' as const, label: '4 Tuần' },
  { key: 'medium_term' as const, label: '6 Tháng' },
  { key: 'long_term' as const, label: 'Mọi Lúc' },
];

export function TimeFilter({ current, onChange }: TimeFilterProps) {
  return (
    <View style={styles.filterRow}>
      {OPTIONS.map((o) => (
        <TouchableOpacity
          key={o.key}
          onPress={() => onChange(o.key)}
          activeOpacity={0.8}
          style={styles.filterBtn}
        >
          {current === o.key ? (
            <LinearGradient
              colors={Colors.gradientPink as [string, string]}
              style={styles.filterActive}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.filterTextActive}>{o.label}</Text>
            </LinearGradient>
          ) : (
            <View style={styles.filterInactive}>
              <Text style={styles.filterText}>{o.label}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  emoji?: string;
}

export function SectionHeader({ title, subtitle, emoji }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      {emoji && <Text style={styles.sectionEmoji}>{emoji}</Text>}
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  filterBtn: {
    flex: 1,
  },
  filterActive: {
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  filterInactive: {
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTextActive: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  filterText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  sectionEmoji: {
    fontSize: 24,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
