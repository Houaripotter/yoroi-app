/**
 * YoroiLiveActivityManager.m
 * Objective-C Bridge pour exposer le module Swift à React Native
 *
 * IMPORTANT: Ce fichier doit être ajouté dans Xcode avec YoroiLiveActivityManager.swift
 */

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(YoroiLiveActivityManager, NSObject)

/**
 * Démarrer une Live Activity pour le timer
 * @param timerName - Nom du timer (ex: "Combat Timer", "Musculation")
 * @param mode - Mode du timer (ex: "combat", "musculation", "tabata")
 * @param totalTime - Durée totale en secondes
 */
RCT_EXTERN_METHOD(
  startLiveActivity:(NSString *)timerName
  mode:(NSString *)mode
  totalTime:(nonnull NSNumber *)totalTime
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

/**
 * Mettre à jour la Live Activity avec le temps restant
 * @param remainingTime - Temps restant en secondes
 * @param isResting - Est-ce une phase de repos ?
 * @param roundNumber - Numéro du round actuel (optionnel)
 * @param totalRounds - Total de rounds (optionnel)
 */
RCT_EXTERN_METHOD(
  updateLiveActivity:(nonnull NSNumber *)remainingTime
  isResting:(BOOL)isResting
  roundNumber:(NSNumber *)roundNumber
  totalRounds:(NSNumber *)totalRounds
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

/**
 * Arrêter la Live Activity
 */
RCT_EXTERN_METHOD(
  endLiveActivity:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

/**
 * Vérifier si une Live Activity est active
 */
RCT_EXTERN_METHOD(
  isLiveActivityActive:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

@end
