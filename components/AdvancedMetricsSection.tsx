import { useState, useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, Animated } from 'react-native';
import { ChevronDown, Droplet, Zap, Droplets, Activity } from 'lucide-react-native';

interface AdvancedMetricsSectionProps {
  bodyFat: string;
  setBodyFat: (value: string) => void;
  muscleMass: string;
  setMuscleMass: (value: string) => void;
  water: string;
  setWater: (value: string) => void;
  visceralFat: string;
  setVisceralFat: (value: string) => void;
  metabolicAge: string;
  setMetabolicAge: (value: string) => void;
  waist: string;
  setWaist: (value: string) => void;
  chest: string;
  setChest: (value: string) => void;
  arms: string;
  setArms: (value: string) => void;
  thighs: string;
  setThighs: (value: string) => void;
  disabled?: boolean;
}

export function AdvancedMetricsSection({
  bodyFat,
  setBodyFat,
  muscleMass,
  setMuscleMass,
  water,
  setWater,
  visceralFat,
  setVisceralFat,
  metabolicAge,
  setMetabolicAge,
  waist,
  setWaist,
  chest,
  setChest,
  arms,
  setArms,
  thighs,
  setThighs,
  disabled = false,
}: AdvancedMetricsSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const height = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const toggleExpanded = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    Animated.timing(height, {
      toValue: newExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
    Animated.timing(rotation, {
      toValue: newExpanded ? 180 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={toggleExpanded}
        onPressIn={() => {
          Animated.spring(scale, {
            toValue: 0.98,
            useNativeDriver: true,
          }).start();
        }}
        onPressOut={() => {
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
          }).start();
        }}
      >
        <Animated.View style={[styles.header, { transform: [{ scale }] }]}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Activity size={20} color="#007AFF" strokeWidth={2.5} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Composition Corporelle & Mensurations</Text>
              <Text style={styles.headerSubtitle}>Optionnel • Balance impédancemètre</Text>
            </View>
          </View>
          <Animated.View
            style={{
              transform: [
                {
                  rotate: rotation.interpolate({
                    inputRange: [0, 180],
                    outputRange: ['0deg', '180deg'],
                  }),
                },
              ],
            }}
          >
            <ChevronDown size={24} color="#636E72" strokeWidth={2.5} />
          </Animated.View>
        </Animated.View>
      </Pressable>

      <Animated.View
        style={[
          styles.content,
          {
            maxHeight: height.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 2000],
            }),
            opacity: height,
            overflow: 'hidden',
          },
        ]}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>COMPOSITION CORPORELLE</Text>

          <View style={styles.row}>
            <View style={styles.field}>
              <View style={styles.fieldHeader}>
                <Droplet size={16} color="#FF9500" strokeWidth={2.5} />
                <Text style={styles.fieldLabel}>Graisse</Text>
              </View>
              <View style={styles.fieldInput}>
                <TextInput
                  style={styles.input}
                  placeholder="0.0"
                  placeholderTextColor="#C7C7CC"
                  keyboardType="decimal-pad"
                  value={bodyFat}
                  onChangeText={setBodyFat}
                  editable={!disabled}
                />
                <Text style={styles.unit}>%</Text>
              </View>
            </View>

            <View style={styles.field}>
              <View style={styles.fieldHeader}>
                <Zap size={16} color="#5856D6" strokeWidth={2.5} />
                <Text style={styles.fieldLabel}>Muscle</Text>
              </View>
              <View style={styles.fieldInput}>
                <TextInput
                  style={styles.input}
                  placeholder="0.0"
                  placeholderTextColor="#C7C7CC"
                  keyboardType="decimal-pad"
                  value={muscleMass}
                  onChangeText={setMuscleMass}
                  editable={!disabled}
                />
                <Text style={styles.unit}>kg</Text>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.field}>
              <View style={styles.fieldHeader}>
                <Droplets size={16} color="#32ADE6" strokeWidth={2.5} />
                <Text style={styles.fieldLabel}>Eau</Text>
              </View>
              <View style={styles.fieldInput}>
                <TextInput
                  style={styles.input}
                  placeholder="0.0"
                  placeholderTextColor="#C7C7CC"
                  keyboardType="decimal-pad"
                  value={water}
                  onChangeText={setWater}
                  editable={!disabled}
                />
                <Text style={styles.unit}>%</Text>
              </View>
            </View>

            <View style={styles.field}>
              <View style={styles.fieldHeader}>
                <Activity size={16} color="#FF3B30" strokeWidth={2.5} />
                <Text style={styles.fieldLabel}>Viscéral</Text>
              </View>
              <View style={styles.fieldInput}>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#C7C7CC"
                  keyboardType="number-pad"
                  value={visceralFat}
                  onChangeText={setVisceralFat}
                  editable={!disabled}
                />
                <Text style={styles.unit}>1-59</Text>
              </View>
            </View>
          </View>

          <View style={styles.fullWidthField}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Âge Métabolique</Text>
            </View>
            <View style={styles.fieldInput}>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#C7C7CC"
                keyboardType="number-pad"
                value={metabolicAge}
                onChangeText={setMetabolicAge}
                editable={!disabled}
              />
              <Text style={styles.unit}>ans</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MENSURATIONS</Text>

          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Tour de taille</Text>
              <View style={styles.fieldInput}>
                <TextInput
                  style={styles.input}
                  placeholder="0.0"
                  placeholderTextColor="#C7C7CC"
                  keyboardType="decimal-pad"
                  value={waist}
                  onChangeText={setWaist}
                  editable={!disabled}
                />
                <Text style={styles.unit}>cm</Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Poitrine</Text>
              <View style={styles.fieldInput}>
                <TextInput
                  style={styles.input}
                  placeholder="0.0"
                  placeholderTextColor="#C7C7CC"
                  keyboardType="decimal-pad"
                  value={chest}
                  onChangeText={setChest}
                  editable={!disabled}
                />
                <Text style={styles.unit}>cm</Text>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Bras</Text>
              <View style={styles.fieldInput}>
                <TextInput
                  style={styles.input}
                  placeholder="0.0"
                  placeholderTextColor="#C7C7CC"
                  keyboardType="decimal-pad"
                  value={arms}
                  onChangeText={setArms}
                  editable={!disabled}
                />
                <Text style={styles.unit}>cm</Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Cuisses</Text>
              <View style={styles.fieldInput}>
                <TextInput
                  style={styles.input}
                  placeholder="0.0"
                  placeholderTextColor="#C7C7CC"
                  keyboardType="decimal-pad"
                  value={thighs}
                  onChangeText={setThighs}
                  editable={!disabled}
                />
                <Text style={styles.unit}>cm</Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#636E72',
    letterSpacing: 1,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  field: {
    flex: 1,
    gap: 8,
  },
  fullWidthField: {
    gap: 8,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.2,
  },
  fieldInput: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  input: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.5,
    flex: 1,
    padding: 0,
  },
  unit: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8E8E93',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginVertical: 24,
  },
});
