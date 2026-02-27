import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

interface TabSelectorProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const TabSelector: React.FC<TabSelectorProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#E8EDF2' },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              isActive && [
                styles.tabActive,
                {
                  backgroundColor: isDark ? isDark ? 'rgba(100,116,139,0.10)' : '#F0F4F8' : '#FFFFFF',
                },
              ],
            ]}
            onPress={() => onTabChange(tab)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                { color: isDark ? colors.textMuted : '#9BB0BF' },
                isActive && { color: colors.text },
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default TabSelector;
