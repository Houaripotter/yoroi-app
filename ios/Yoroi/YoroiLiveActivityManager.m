//
//  YoroiLiveActivityManager.m
//  Yoroi
//
//  YOROI - Bridge Objective-C pour exposer le module natif à React Native
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(YoroiLiveActivityManager, NSObject)

RCT_EXTERN_METHOD(startActivity:(NSDictionary *)data
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(updateActivity:(NSDictionary *)data
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stopActivity:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isActivityRunning:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(areActivitiesEnabled:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

@end
