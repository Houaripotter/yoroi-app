/** Ancien ecran : remplace par Ta forme (/readiness-detail). Redirection pour les anciens liens. */
import React from 'react';
import { Redirect } from 'expo-router';

export default function ReadinessRedirect() {
  return <Redirect href={'/readiness-detail' as any} />;
}
