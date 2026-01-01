import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import logger from '@/lib/security/logger';

// Test simple pour voir si le problème vient du TextInput
export default function TestInput() {
  const [weight, setWeight] = useState(0);
  const [inputValue, setInputValue] = useState('');

  return (
    <View style={styles.container}>
      <Text>Poids actuel: {weight} kg</Text>

      <TextInput
        style={styles.input}
        value={inputValue}
        onChangeText={(text) => {
          logger.info('Text changed:', text);
          setInputValue(text);
          const num = parseFloat(text);
          if (!isNaN(num)) {
            setWeight(num);
          }
        }}
        keyboardType="decimal-pad"
        placeholder="Entrez votre poids"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginTop: 10,
    fontSize: 18,
  },
});
