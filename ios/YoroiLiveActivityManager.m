//
//  YoroiLiveActivityManager.m
//  Yoroi
//
//  Bridge Objective-C pour YoroiLiveActivityManager
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(YoroiLiveActivityManager, NSObject)

// Check if Live Activities are enabled
RCT_EXTERN_METHOD(areActivitiesEnabled:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Start a Live Activity
RCT_EXTERN_METHOD(startActivity:(NSDictionary *)data
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Update a Live Activity
RCT_EXTERN_METHOD(updateActivity:(NSDictionary *)data
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Stop a Live Activity
RCT_EXTERN_METHOD(stopActivity:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Check if an activity is running
RCT_EXTERN_METHOD(isActivityRunning:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
