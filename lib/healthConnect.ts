// ============================================
// YOROI - SERVICE HEALTH CONNECT (Platform Agnostic)
// ============================================
// Point d'entrée qui redirige vers la version iOS ou Android
// ============================================
// Note: React Native utilisera automatiquement .ios.ts, .android.ts ou .web.ts
// Ce fichier sert de fallback


// Fallback - utilise iOS par défaut (ne devrait jamais être appelé en pratique)
export * from './healthConnect.ios';
export { default } from './healthConnect.ios';
