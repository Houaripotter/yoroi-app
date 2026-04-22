// YoroiLiveActivityBridge.m
// Expose YoroiLiveActivityBridge (Swift) au bridge React Native.

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(YoroiLiveActivityBridge, NSObject)

RCT_EXTERN_METHOD(startSession:(NSString *)sportName
                  sportIcon:(NSString *)sportIcon
                  sportColorHex:(NSString *)sportColorHex
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(updateSession:(nonnull NSNumber *)elapsedSeconds
                  heartRate:(nonnull NSNumber *)heartRate
                  calories:(nonnull NSNumber *)calories
                  rounds:(nonnull NSNumber *)rounds
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(endSession:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isAvailable:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
