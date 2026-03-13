import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, DeviceEventEmitter } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Activity } from 'lucide-react-native';

export const ImportProgressBanner: React.FC = () => {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState('');
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(7);
  const opacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const onStart = DeviceEventEmitter.addListener('YOROI_IMPORT_START', () => {
      setStep('Démarrage...');
      setCurrent(0);
      setVisible(true);
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: false }).start();
    });

    const onProgress = DeviceEventEmitter.addListener('YOROI_IMPORT_PROGRESS', (data: { step: string; current: number; total: number }) => {
      setStep(data.step);
      setCurrent(data.current);
      setTotal(data.total);
      Animated.timing(progress, {
        toValue: data.current / data.total,
        duration: 400,
        useNativeDriver: false,
      }).start();
    });

    const onDone = DeviceEventEmitter.addListener('YOROI_IMPORT_DONE', () => {
      setStep('Import terminé !');
      Animated.timing(progress, { toValue: 1, duration: 300, useNativeDriver: false }).start(() => {
        setTimeout(() => {
          Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
            setVisible(false);
          });
        }, 1500);
      });
    });

    return () => {
      onStart.remove();
      onProgress.remove();
      onDone.remove();
    };
  }, []);

  if (!visible) return null;

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.banner, { backgroundColor: colors.backgroundCard, opacity }]}>
      <View style={styles.row}>
        <View style={[styles.iconCircle, { backgroundColor: '#10B98120' }]}>
          <Activity size={14} color="#10B981" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Import Apple Santé en cours...
          </Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>
            {step}{current > 0 ? ` (${current}/${total})` : ''}
          </Text>
        </View>
        <Text style={[styles.percent, { color: '#10B981' }]}>
          {total > 0 ? Math.round((current / total) * 100) : 0}%
        </Text>
      </View>

      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <Animated.View style={[styles.fill, { width: progressWidth }]} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
  },
  sub: {
    fontSize: 11,
    marginTop: 1,
  },
  percent: {
    fontSize: 13,
    fontWeight: '800',
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
  },
});
