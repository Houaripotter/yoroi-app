import { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';

export function SkeletonLoader() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Animated.View style={[styles.skeletonCircle, { opacity }]} />
        <View style={styles.headerText}>
          <Animated.View style={[styles.skeletonText, styles.titleSkeleton, { opacity }]} />
          <Animated.View style={[styles.skeletonText, styles.subtitleSkeleton, { opacity }]} />
        </View>
      </View>

      <Animated.View style={[styles.skeletonCard, styles.largeCard, { opacity }]} />

      <View style={styles.grid}>
        <Animated.View style={[styles.skeletonCard, styles.smallCard, { opacity }]} />
        <Animated.View style={[styles.skeletonCard, styles.smallCard, { opacity }]} />
        <Animated.View style={[styles.skeletonCard, styles.smallCard, { opacity }]} />
        <Animated.View style={[styles.skeletonCard, styles.smallCard, { opacity }]} />
      </View>

      <Animated.View style={[styles.skeletonCard, styles.mediumCard, { opacity }]} />
      <Animated.View style={[styles.skeletonCard, styles.mediumCard, { opacity }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F0',
    padding: 20,
    paddingTop: 60,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerText: {
    flex: 1,
    gap: 8,
  },
  skeletonCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8E8E8',
  },
  skeletonText: {
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E8E8E8',
  },
  titleSkeleton: {
    width: '60%',
    height: 24,
  },
  subtitleSkeleton: {
    width: '40%',
    height: 16,
  },
  skeletonCard: {
    borderRadius: 24,
    backgroundColor: '#E8E8E8',
  },
  largeCard: {
    height: 320,
  },
  mediumCard: {
    height: 200,
  },
  smallCard: {
    flex: 1,
    aspectRatio: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
