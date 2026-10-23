/**
 * Ancienne route des defis : les quetes a cocher sont supprimees. Le Dojo propose
 * a la place un prochain objectif concret, calcule sur tes vraies donnees.
 */
import React from 'react';
import { Redirect } from 'expo-router';

export default function ChallengesRedirect() {
  return <Redirect href={'/(tabs)/dojo' as any} />;
}
