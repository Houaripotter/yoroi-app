import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

interface Step {
  weight: number;
  completed: boolean;
}

interface ProgressStepsProps {
  steps: Step[];
  current: number;
}

export function ProgressSteps({ steps, current }: ProgressStepsProps) {
  const totalSteps = steps.length;
  const completedSteps = steps.filter(s => s.completed).length;

  return (
    <View style={styles.container}>
      <View style={styles.stepsContainer}>
        <Svg height="60" width="100%" style={styles.svg}>
          <Line
            x1="10%"
            y1="30"
            x2="90%"
            y2="30"
            stroke="#E8E8E8"
            strokeWidth="4"
          />
          {steps.map((step, index) => {
            const xPos = 10 + (80 / (totalSteps - 1)) * index;
            let color = '#E8E8E8';

            if (step.completed) {
              color = '#00C4B4';
            } else if (Math.abs(step.weight - current) < 0.5) {
              color = '#FFA502';
            }

            return (
              <Circle
                key={index}
                cx={`${xPos}%`}
                cy="30"
                r={step.completed ? "8" : "6"}
                fill={color}
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            );
          })}
        </Svg>
      </View>
      <View style={styles.labelsContainer}>
        <Text style={styles.labelText}>Départ</Text>
        <Text style={styles.labelText}>Objectif</Text>
      </View>
      <Text style={styles.progressText}>
        {completedSteps} étapes terminées sur {totalSteps}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  stepsContainer: {
    height: 60,
    justifyContent: 'center',
  },
  svg: {
    overflow: 'visible',
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: '10%',
    marginTop: 8,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#636E72',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
    textAlign: 'center',
    marginTop: 12,
  },
});
