// Stub complet RCTPackagerConnection pour expo-dev-menu + expo-dev-launcher
// Evite le crash de duplication de classe React.framework / Yoroi.debug.dylib
// expo-dev-menu appelle: [RCTPackagerConnection shared] puis addNotificationHandler:queue:forMethod:

#import <Foundation/Foundation.h>
#import <dispatch/dispatch.h>

// RCTPackagerConnection - stub complet
@interface RCTPackagerConnection : NSObject
+ (instancetype)shared;
+ (instancetype)sharedPackagerConnection;
- (void)setSocketConnectionURL:(NSURL *)url;
- (void)addNotificationHandler:(id)handler queue:(dispatch_queue_t)queue forMethod:(NSString *)method;
- (void)removeNotificationHandler:(id)handler queue:(dispatch_queue_t)queue forMethod:(NSString *)method;
- (void)stop;
@end

@implementation RCTPackagerConnection

+ (instancetype)shared {
  static RCTPackagerConnection *instance;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{ instance = [[self alloc] init]; });
  return instance;
}

+ (instancetype)sharedPackagerConnection {
  return [self shared];
}

- (void)setSocketConnectionURL:(NSURL *)url {}

- (void)addNotificationHandler:(id)handler
                         queue:(dispatch_queue_t)queue
                     forMethod:(NSString *)method {}

- (void)removeNotificationHandler:(id)handler
                            queue:(dispatch_queue_t)queue
                        forMethod:(NSString *)method {}

- (void)stop {}

@end

// RCTPerfMonitor - stub
@interface RCTPerfMonitor : NSObject
@end
@implementation RCTPerfMonitor
@end

// RCTReconnectingWebSocket - stub
@interface RCTReconnectingWebSocket : NSObject
- (instancetype)initWithURL:(NSURL *)url;
- (void)start;
- (void)stop;
@end
@implementation RCTReconnectingWebSocket
- (instancetype)initWithURL:(NSURL *)url { return [super init]; }
- (void)start {}
- (void)stop {}
@end
