#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WidgetModule, NSObject)

RCT_EXTERN_METHOD(updateWidgetData:(double)weight delta:(double)delta timestamp:(double)timestamp)
RCT_EXTERN_METHOD(clearWidgetData)
RCT_EXTERN_METHOD(reloadWidget)

@end
