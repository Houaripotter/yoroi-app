import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing, TouchableOpacity, Text } from 'react-native';
import { LongPressGestureHandler, State } from 'react-native-gesture-handler';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { HomeSection, saveHomeCustomization } from '@/lib/homeCustomizationService';
import { Check } from 'lucide-react-native';

interface EditableHomeContainerProps {
  sections: HomeSection[];
  onSectionsChange: (sections: HomeSection[]) => void;
  renderSection: (section: HomeSection, editMode: boolean) => React.ReactNode;
}

export const EditableHomeContainer: React.FC<EditableHomeContainerProps> = ({
  sections,
  onSectionsChange,
  renderSection,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);

  // Animations pour le mode édition
  const shakeAnims = useRef<{ [key: string]: Animated.Value }>({}).current;

  // Initialiser les animations
  useEffect(() => {
    sections.forEach(section => {
      if (!shakeAnims[section.id]) {
        shakeAnims[section.id] = new Animated.Value(0);
      }
    });
  }, [sections]);

  // Animation de tremblement
  useEffect(() => {
    if (editMode) {
      sections.forEach(section => {
        const anim = shakeAnims[section.id];
        if (anim) {
          Animated.loop(
            Animated.sequence([
              Animated.timing(anim, {
                toValue: 1,
                duration: 100,
                easing: Easing.linear,
                useNativeDriver: true,
              }),
              Animated.timing(anim, {
                toValue: -1,
                duration: 100,
                easing: Easing.linear,
                useNativeDriver: true,
              }),
              Animated.timing(anim, {
                toValue: 0,
                duration: 100,
                easing: Easing.linear,
                useNativeDriver: true,
              }),
            ])
          ).start();
        }
      });
    } else {
      sections.forEach(section => {
        const anim = shakeAnims[section.id];
        if (anim) {
          anim.stopAnimation();
          anim.setValue(0);
        }
      });
    }
  }, [editMode, sections]);

  const activateEditMode = () => {
    impactAsync(ImpactFeedbackStyle.Heavy);
    setEditMode(true);
  };

  const deactivateEditMode = async () => {
    impactAsync(ImpactFeedbackStyle.Medium);
    setEditMode(false);
    setDraggingSectionId(null);
    // Sauvegarder automatiquement
    await saveHomeCustomization(sections);
  };

  const onDragEnd = ({ data }: { data: HomeSection[] }) => {
    const updatedSections = data.map((section, index) => ({
      ...section,
      order: index,
    }));
    onSectionsChange(updatedSections);
    impactAsync(ImpactFeedbackStyle.Light);
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<HomeSection>) => {
    if (!item.visible) return null;

    if (!shakeAnims[item.id]) {
      shakeAnims[item.id] = new Animated.Value(0);
    }
    const shakeAnim = shakeAnims[item.id];

    const animatedStyle = {
      transform: [
        {
          rotate: editMode && !isActive
            ? shakeAnim.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: ['-1deg', '0deg', '1deg'],
              })
            : '0deg',
        },
        {
          scale: isActive ? 1.02 : 1,
        },
      ],
      opacity: isActive ? 0.95 : 1,
    };

    const sectionContent = renderSection(item, editMode);

    if (!editMode) {
      // Mode normal - avec appui long pour activer edit mode
      return (
        <LongPressGestureHandler
          onHandlerStateChange={(event) => {
            if (event.nativeEvent.state === State.ACTIVE) {
              activateEditMode();
              drag();
            }
          }}
          minDurationMs={800}
        >
          <Animated.View style={animatedStyle}>
            {sectionContent}
          </Animated.View>
        </LongPressGestureHandler>
      );
    }

    // Mode édition - draggable
    return (
      <ScaleDecorator>
        <LongPressGestureHandler
          onHandlerStateChange={(event) => {
            if (event.nativeEvent.state === State.ACTIVE) {
              drag();
            }
          }}
          minDurationMs={200}
        >
          <Animated.View style={animatedStyle}>
            {sectionContent}
          </Animated.View>
        </LongPressGestureHandler>
      </ScaleDecorator>
    );
  };

  // En mode normal, on affiche les sections normalement sans drag & drop
  if (!editMode) {
    return (
      <View style={styles.container}>
        {sections
          .sort((a, b) => a.order - b.order)
          .filter(section => section.visible)
          .map(section => (
            <LongPressGestureHandler
              key={section.id}
              onHandlerStateChange={(event) => {
                if (event.nativeEvent.state === State.ACTIVE) {
                  activateEditMode();
                }
              }}
              minDurationMs={800}
            >
              <Animated.View>
                {renderSection(section, false)}
              </Animated.View>
            </LongPressGestureHandler>
          ))}
      </View>
    );
  }

  // En mode édition, on affiche les sections avec animation de tremblement
  // Mais on garde le drag simple avec gesture handlers (pas de FlatList)
  return (
    <View style={styles.container}>
      {sections
        .sort((a, b) => a.order - b.order)
        .filter(section => section.visible)
        .map((section, index) => (
          <LongPressGestureHandler
            key={section.id}
            onHandlerStateChange={(event) => {
              if (event.nativeEvent.state === State.ACTIVE) {
                // Désactiver le mode édition
                deactivateEditMode();
              }
            }}
            minDurationMs={800}
          >
            <Animated.View style={{ transform: [{ rotate: shakeAnims[section.id]?.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: ['-1deg', '0deg', '1deg'],
            }) || '0deg' }] }}>
              {renderSection(section, true)}
            </Animated.View>
          </LongPressGestureHandler>
        ))}

      {/* Message pour sortir du mode édition */}
      <TouchableOpacity
        onPress={deactivateEditMode}
        style={{
          padding: 16,
          backgroundColor: '#10B98120',
          borderRadius: 12,
          margin: 16,
          alignItems: 'center',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Check size={14} color="#10B981" strokeWidth={3} />
          <Text style={{ color: '#10B981', fontWeight: '700', fontSize: 14 }}>
            Terminer la réorganisation
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
