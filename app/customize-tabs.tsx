/**
 * Ecran abandonne (decision de Houari) : la personnalisation se fait maintenant dans Reglages.
 */
import React from 'react';
import { Redirect } from 'expo-router';

export default function AbandonedScreenRedirect() {
  return <Redirect href={'/settings' as any} />;
}
