// TorchModule.m — pont Objective-C pour exposer TorchModule à React Native
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(TorchModule, NSObject)

RCT_EXTERN_METHOD(setTorch:(BOOL)on)
RCT_EXTERN_METHOD(strobe:(NSInteger)count interval:(double)interval)

@end
