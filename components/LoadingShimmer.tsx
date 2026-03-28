import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';

interface LoadingShimmerProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function LoadingShimmer({
  width = '100%',
  height = 70,
  borderRadius = 16,
  style,
}: LoadingShimmerProps) {
  const translateX = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(translateX, {
        toValue: 300,
        duration: 1400,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View
      style={[
        styles.container,
        { width: width as any, height, borderRadius },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { transform: [{ translateX }] },
        ]}
      >
        <LinearGradient
          colors={[
            'transparent',
            Colors.surfaceLight + '80',
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}

/** Skeleton cho màn hình đang tải */
export function TrackSkeleton() {
  return (
    <View style={styles.skeletonRow}>
      <LoadingShimmer width={32} height={32} borderRadius={8} />
      <LoadingShimmer width={56} height={56} borderRadius={10} />
      <View style={styles.skeletonInfo}>
        <LoadingShimmer width="70%" height={14} borderRadius={7} />
        <LoadingShimmer width="50%" height={11} borderRadius={5} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceLight,
    overflow: 'hidden',
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  skeletonInfo: {
    flex: 1,
    gap: 6,
  },
});
