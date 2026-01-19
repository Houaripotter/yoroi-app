//
//  WatchConnectivityBridge.m
//  Yoroi
//
//  Objective-C bridge pour exposer WatchConnectivityBridge à React Native
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(WatchConnectivityBridge, RCTEventEmitter)

// Vérifie si la Watch est disponible
RCT_EXTERN_METHOD(isWatchAvailable:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Vérifie si la Watch est à portée
RCT_EXTERN_METHOD(isWatchReachable:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Envoie un message à la Watch
RCT_EXTERN_METHOD(sendMessageToWatch:(NSDictionary *)message
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Met à jour le contexte applicatif
RCT_EXTERN_METHOD(updateApplicationContext:(NSDictionary *)context
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Transfert de fichier
RCT_EXTERN_METHOD(transferFile:(NSString *)fileURL
                  metadata:(NSDictionary *)metadata
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Transfert de UserInfo
RCT_EXTERN_METHOD(transferUserInfo:(NSDictionary *)userInfo
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Récupère le contexte reçu
RCT_EXTERN_METHOD(getReceivedApplicationContext:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Active la session
RCT_EXTERN_METHOD(activateSession:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
