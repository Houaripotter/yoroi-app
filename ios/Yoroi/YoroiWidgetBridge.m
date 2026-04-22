// YoroiWidgetBridge.m
// Expose YoroiWidgetBridge (Swift) au bridge React Native.

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(YoroiWidgetBridge, NSObject)

RCT_EXTERN_METHOD(updateStats:(nonnull NSNumber *)weeklyTrainings
                  streakDays:(nonnull NSNumber *)streakDays
                  latestWeightKg:(nonnull NSNumber *)latestWeightKg
                  weightTrend:(NSString *)weightTrend
                  weeklyMinutes:(nonnull NSNumber *)weeklyMinutes
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isAvailable:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(reloadWidgets:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
