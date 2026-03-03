// ============================================
// YOROI - WRAPPER POUR SECTIONS DRAGGABLES
// ============================================

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { HomeSection } from '@/lib/homeCustomizationService';

interface DraggableSectionProps {
  section: HomeSection;
  children: React.ReactNode;
  editMode?: boolean;
}

/**
 * Wrapper simple pour rendre une section draggable
 * Encapsule le contenu d'une section pour le drag & drop
 */
export const DraggableSection: React.FC<DraggableSectionProps> = ({
  section,
  children,
  editMode = false,
}) => {
  if (!section.visible) return null;

  return (
    <View style={styles.container} key={section.id}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
