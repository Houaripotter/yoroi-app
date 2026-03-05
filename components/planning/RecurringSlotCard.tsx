import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Check, X, Clock, RefreshCw } from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '@/lib/ThemeContext';
import { getSportIcon, getSportColor, getSportName } from '@/lib/sports';
import { WeeklySlotWithStatus } from '@/hooks/useWeeklySlots';

interface RecurringSlotCardProps {
  slot: WeeklySlotWithStatus;
  onPress?: () => void;
  onSwipeValidate?: () => void;
  onSwipeCancel?: () => void;
  compact?: boolean;
  showAttendance?: boolean;
  injuryWarning?: string;
}

const formatTime = (time?: string): string => {
  if (!time) return '--:--';
  return time;
};

const formatEndTime = (startTime?: string, durationMinutes?: number): string => {
  if (!startTime || !durationMinutes) return '';
  const [h, m] = startTime.split(':').map(Number);
  const totalMin = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
};

export const RecurringSlotCard: React.FC<RecurringSlotCardProps> = ({
  slot,
  onPress,
  onSwipeValidate,
  onSwipeCancel,
  compact = false,
  showAttendance = true,
  injuryWarning,
}) => {
  const { colors } = useTheme();
  const swipeableRef = useRef<Swipeable>(null);
  const sportColor = getSportColor(slot.sport);
  const sportIcon = getSportIcon(slot.sport);
  const sportName = getSportName(slot.sport);

  const statusColor = slot.isValidated
    ? colors.success
    : slot.isCancelled
    ? colors.error
    : colors.textMuted;

  const statusLabel = slot.isValidated
    ? 'Fait'
    : slot.isCancelled
    ? 'Annule'
    : 'En attente';

  const endTime = formatEndTime(slot.time, slot.duration_minutes);

  const canSwipe = slot.isPending;

  const renderLeftActions = useCallback((_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [0.5, 1],
      extrapolate: 'clamp',
    });
    const opacity = dragX.interpolate({
      inputRange: [0, 60],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
    return (
      <Animated.View style={[styles.swipeAction, styles.swipeLeft, { backgroundColor: colors.success, opacity }]}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Check size={24} color="#FFFFFF" strokeWidth={3} />
        </Animated.View>
        <Text style={styles.swipeActionText}>Valider</Text>
      </Animated.View>
    );
  }, [colors.success]);

  const renderRightActions = useCallback((_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });
    const opacity = dragX.interpolate({
      inputRange: [-60, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    return (
      <Animated.View style={[styles.swipeAction, styles.swipeRight, { backgroundColor: colors.error, opacity }]}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <X size={24} color="#FFFFFF" strokeWidth={3} />
        </Animated.View>
        <Text style={styles.swipeActionText}>Annuler</Text>
      </Animated.View>
    );
  }, [colors.error]);

  const handleSwipeLeft = useCallback(() => {
    swipeableRef.current?.close();
    onSwipeValidate?.();
  }, [onSwipeValidate]);

  const handleSwipeRight = useCallback(() => {
    swipeableRef.current?.close();
    onSwipeCancel?.();
  }, [onSwipeCancel]);

  const cardContent = (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.backgroundCard,
          borderColor: slot.isPending
            ? colors.border
            : slot.isValidated
            ? colors.success + '40'
            : colors.error + '40',
          borderStyle: slot.isPending ? 'dashed' : 'solid',
          opacity: slot.isCancelled ? 0.6 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Left: sport icon */}
      <View style={[styles.iconContainer, { backgroundColor: sportColor + '20' }]}>
        <MaterialCommunityIcons
          name={sportIcon as any}
          size={compact ? 22 : 28}
          color={sportColor}
        />
        {slot.club_logo ? (
          <View style={[styles.clubBadge, { backgroundColor: slot.club_color || colors.primary }]}>
            <Text style={styles.clubBadgeText}>
              {(slot.club_name || '?')[0].toUpperCase()}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Center: info */}
      <View style={styles.infoContainer}>
        <Text
          style={[
            styles.title,
            { color: colors.textPrimary },
            slot.isCancelled && styles.strikethrough,
          ]}
          numberOfLines={1}
        >
          {slot.label || sportName}
        </Text>

        <View style={styles.timeRow}>
          <Clock size={12} color={colors.textMuted} />
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>
            {formatTime(slot.time)}
            {endTime ? ` - ${endTime}` : ''}
            {slot.duration_minutes ? ` (${slot.duration_minutes} min)` : ''}
          </Text>
        </View>

        {slot.club_name && (
          <Text style={[styles.clubText, { color: colors.textMuted }]} numberOfLines={1}>
            {slot.club_name}
          </Text>
        )}

        {injuryWarning && (
          <View style={[styles.injuryBanner, { backgroundColor: colors.warning + '15' }]}>
            <MaterialCommunityIcons name="bandage" size={12} color={colors.warning} />
            <Text style={[styles.injuryText, { color: colors.warning }]} numberOfLines={1}>
              {injuryWarning}
            </Text>
          </View>
        )}
      </View>

      {/* Right: status + attendance */}
      <View style={styles.rightSection}>
        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          {slot.isValidated ? (
            <Check size={14} color={colors.success} />
          ) : slot.isCancelled ? (
            <X size={14} color={colors.error} />
          ) : (
            <RefreshCw size={14} color={colors.textMuted} />
          )}
          {!compact && (
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          )}
        </View>

        {/* Attendance rate */}
        {showAttendance && slot.attendanceTotal != null && slot.attendanceTotal > 0 && (
          <View style={styles.attendanceContainer}>
            <Text style={[styles.attendanceText, { color: colors.textMuted }]}>
              {slot.attendanceValidated}/{slot.attendanceTotal} sem.
            </Text>
            <View style={[styles.attendanceBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.attendanceFill,
                  {
                    backgroundColor: (slot.attendanceRate || 0) >= 0.75
                      ? colors.success
                      : (slot.attendanceRate || 0) >= 0.5
                      ? colors.warning
                      : colors.error,
                    width: `${Math.round((slot.attendanceRate || 0) * 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (!canSwipe || (!onSwipeValidate && !onSwipeCancel)) {
    return cardContent;
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={onSwipeValidate ? renderLeftActions : undefined}
      renderRightActions={onSwipeCancel ? renderRightActions : undefined}
      onSwipeableOpen={(direction) => {
        if (direction === 'left') handleSwipeLeft();
        else if (direction === 'right') handleSwipeRight();
      }}
      leftThreshold={80}
      rightThreshold={80}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
    >
      {cardContent}
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
    marginBottom: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  clubBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  infoContainer: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  clubText: {
    fontSize: 11,
    fontWeight: '500',
  },
  injuryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  injuryText: {
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  attendanceContainer: {
    alignItems: 'flex-end',
    gap: 3,
  },
  attendanceText: {
    fontSize: 10,
    fontWeight: '500',
  },
  attendanceBar: {
    width: 50,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  attendanceFill: {
    height: '100%',
    borderRadius: 2,
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    marginBottom: 8,
    borderRadius: 14,
    gap: 4,
  },
  swipeLeft: {
    marginRight: 4,
  },
  swipeRight: {
    marginLeft: 4,
  },
  swipeActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
