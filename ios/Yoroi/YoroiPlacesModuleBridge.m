// YoroiPlacesModuleBridge.m
// Expose YoroiPlacesModule (Swift) au bridge React Native.

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(YoroiPlacesModule, NSObject)

RCT_EXTERN_METHOD(searchPlaces:(NSString *)query
                  regionLat:(double)regionLat
                  regionLon:(double)regionLon
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
