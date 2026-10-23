/**
 * /espace (vague 13) : Ton espace est fusionne dans Reglages, une seule porte d'entree.
 */
import React from 'react';
import { Redirect } from 'expo-router';

export default function EspaceIndex() {
  return <Redirect href={'/settings' as any} />;
}
