//
//  WatchBridge.m
//  Yoroi
//
//  Objective-C bridge for React Native
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(WatchBridge, RCTEventEmitter)

RCT_EXTERN_METHOD(syncDataToWatch:(NSDictionary *)data)

RCT_EXTERN_METHOD(isWatchReachable:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
