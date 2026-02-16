import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { Activity, Dumbbell, Droplet, Target, IconNode } from 'lucide-react-native';

interface StatItem {
  label: string;
  value: string;
  trend: string;
  trendType: "positive" | "negative";
  icon: keyof typeof icons;
}

interface StatsGridProps {
  stats: StatItem[];
}

const icons = {
  Activity,
  Dumbbell,
  Droplet,
  Target,
};

// Composant StatItem memoize pour eviter les re-renders
const StatItemComponent = memo(({ stat }: { stat: StatItem }) => {
  const IconComponent = icons[stat.icon];
  return (
    <View
      className="w-[48%] mb-4 bg-[#1A1A1A] border border-[#333333] rounded-2xl p-4 shadow-xl"
      style={{
        shadowColor: '#06b6d4',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
      }}
      accessible={true}
      accessibilityLabel={`${stat.label}: ${stat.value}, tendance ${stat.trend}`}
      accessibilityRole="text"
    >
      {IconComponent && <IconComponent size={24} color="#06b6d4" />}
      <Text className="text-white text-xs uppercase tracking-widest mt-2">{stat.label}</Text>
      <Text className="text-white text-3xl font-black mt-1">{stat.value}</Text>
      <Text className={stat.trendType === "positive" ? "text-green-500 text-sm mt-1" : "text-red-500 text-sm mt-1"}>
        {stat.trend}
      </Text>
    </View>
  );
});

export const StatsGrid = memo<StatsGridProps>(({ stats }) => {
  return (
    <View className="flex-row flex-wrap justify-between p-4">
      {stats.map((stat, index) => (
        <StatItemComponent key={`stat-${index}-${stat.label}`} stat={stat} />
      ))}
    </View>
  );
});
