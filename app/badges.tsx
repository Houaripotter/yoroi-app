/**
 * Ancienne route des badges : remplacee par les 36 sceaux du Dojo.
 */
import React from 'react';
import { Redirect } from 'expo-router';

export default function BadgesRedirect() {
  return <Redirect href={'/dojo/sceaux' as any} />;
}
