// BackgroundTaskModule.m — pont Objective-C
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(BackgroundTaskModule, NSObject)

RCT_EXTERN_METHOD(beginTask)
RCT_EXTERN_METHOD(endTask)
RCT_EXTERN_METHOD(remainingTime:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
