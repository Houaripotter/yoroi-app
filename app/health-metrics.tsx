/** Ancien tableau des mesures de sante : tout est dans Sante. Redirection pour les anciens liens. */
import React from 'react';
import { Redirect } from 'expo-router';

export default function HealthMetricsRedirect() {
  return <Redirect href={'/sante' as any} />;
}
