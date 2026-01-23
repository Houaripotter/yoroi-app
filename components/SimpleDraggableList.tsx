import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

interface DraggableItem {
  id: string;
  name: string;
  description: string;
  visible: boolean;
  mandatory?: boolean;
  order: number;
  icon?: string;
}

interface SimpleDraggableListProps {
  items: DraggableItem[];
  onReorder: (items: DraggableItem[]) => void;
  renderIcon: (iconName: string, visible: boolean) => React.ReactNode;
  onToggleVisibility: (id: string) => void;
  colors: any;
}

export const SimpleDraggableList: React.FC<SimpleDraggableListProps> = ({
  items,
  onReorder,
  renderIcon,
  onToggleVisibility,
  colors,
}) => {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);

  const handleDragStart = (id: string) => {
    impactAsync(ImpactFeedbackStyle.Heavy);
    setDraggedItem(id);
  };

  const handleDragOver = (id: string) => {
    if (draggedItem && draggedItem !== id) {
      setDragOverItem(id);
    }
  };

  const handleDrop = () => {
    if (draggedItem && dragOverItem && draggedItem !== dragOverItem) {
      const newItems = [...items];
      const draggedIndex = newItems.findIndex(item => item.id === draggedItem);
      const targetIndex = newItems.findIndex(item => item.id === dragOverItem);

      // Échanger les éléments
      const [removed] = newItems.splice(draggedIndex, 1);
      newItems.splice(targetIndex, 0, removed);

      // Réattribuer les order
      const reordered = newItems.map((item, idx) => ({ ...item, order: idx }));

      impactAsync(ImpactFeedbackStyle.Light);
      onReorder(reordered);
    }

    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragCancel = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {items.map((item, index) => {
        const isDragging = draggedItem === item.id;
        const isDragOver = dragOverItem === item.id;
        const isFirst = index === 0;
        const isLast = index === items.length - 1;

        return (
          <Pressable
            key={item.id}
            onLongPress={() => handleDragStart(item.id)}
            onPressIn={() => handleDragOver(item.id)}
            onPressOut={handleDrop}
            delayLongPress={500}
            style={[
              styles.item,
              { backgroundColor: colors.backgroundCard },
              !item.visible && { opacity: 0.5 },
              isDragging && styles.itemDragging,
              isDragOver && styles.itemDragOver,
            ]}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${colors.accent}15` }]}>
              {renderIcon(item.icon || 'grid', item.visible)}
            </View>

            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, { color: item.visible ? colors.textPrimary : colors.textMuted }]}>
                {item.name}
              </Text>
              <Text style={[styles.itemDesc, { color: colors.textMuted }]} numberOfLines={1}>
                {item.description}
              </Text>
              {item.mandatory && (
                <Text style={[styles.mandatoryLabel, { color: colors.accent }]}>
                  Obligatoire
                </Text>
              )}
            </View>

            {isDragging && (
              <View style={styles.dragIndicator}>
                <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '700' }}>
                  Glisse ici ↕️
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  itemDragging: {
    opacity: 0.6,
    transform: [{ scale: 1.05 }],
    borderWidth: 2,
    borderColor: '#10B981',
  },
  itemDragOver: {
    borderWidth: 2,
    borderColor: '#10B981',
    borderStyle: 'dashed',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemDesc: {
    fontSize: 12,
  },
  mandatoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  dragIndicator: {
    padding: 8,
  },
});
