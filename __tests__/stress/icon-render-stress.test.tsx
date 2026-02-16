import React from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';
import {
  Check,
  X,
  Star,
  Target,
  Flame,
  Trophy,
  Zap,
  Heart,
  Shield,
  Sword,
  Calendar,
  Clock,
  BookOpen,
  Users,
  Plus,
  Minus,
  Sparkles,
  Lock,
  Unlock,
  ChevronRight,
} from 'lucide-react-native';

// ============================================
// STRESS TEST: Icon render performance
// ============================================
// Compares rendering N Lucide SVG icons vs N <Text> elements

const ICONS = [
  Check, X, Star, Target, Flame,
  Trophy, Zap, Heart, Shield, Sword,
  Calendar, Clock, BookOpen, Users, Plus,
  Minus, Sparkles, Lock, Unlock, ChevronRight,
];

const COUNTS = [50, 100, 200, 500];
const MAX_RATIO = 10; // SVG max 10x slower than Text
const MAX_ABSOLUTE_MS = 5000; // Max 5s for 500 icons

/**
 * Render N icons and measure time
 */
function measureIconRender(count: number): number {
  const elements = Array.from({ length: count }, (_, i) => {
    const IconComponent = ICONS[i % ICONS.length];
    return <IconComponent key={i} size={24} color="#FFFFFF" />;
  });

  const start = performance.now();
  render(<View>{elements}</View>);
  const elapsed = performance.now() - start;
  return elapsed;
}

/**
 * Render N Text elements and measure time (baseline)
 */
function measureTextRender(count: number): number {
  const elements = Array.from({ length: count }, (_, i) => (
    <Text key={i}>Icon {i}</Text>
  ));

  const start = performance.now();
  render(<View>{elements}</View>);
  const elapsed = performance.now() - start;
  return elapsed;
}

describe('Icon render stress test', () => {
  const results: { count: number; iconMs: number; textMs: number; ratio: number }[] = [];

  COUNTS.forEach((count) => {
    it(`renders ${count} icons within performance budget`, () => {
      const textMs = measureTextRender(count);
      const iconMs = measureIconRender(count);
      const ratio = iconMs / Math.max(textMs, 0.1); // avoid divide by zero

      results.push({ count, iconMs, textMs, ratio });

      // Performance assertions
      expect(ratio).toBeLessThan(MAX_RATIO);
      if (count <= 500) {
        expect(iconMs).toBeLessThan(MAX_ABSOLUTE_MS);
      }
    });
  });

  afterAll(() => {
    // Print performance report
    console.log('\n========== STRESS TEST RESULTS ==========');
    console.log('Count  | Icons (ms) | Text (ms) | Ratio');
    console.log('-------|------------|-----------|------');
    results.forEach(({ count, iconMs, textMs, ratio }) => {
      console.log(
        `${count.toString().padStart(6)} | ${iconMs.toFixed(1).padStart(10)} | ${textMs.toFixed(1).padStart(9)} | ${ratio.toFixed(2)}x`
      );
    });
    console.log('=========================================\n');
  });
});
