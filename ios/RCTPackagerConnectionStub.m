// Stubs pour les classes React Native supprimées dans RN 0.81+
// Requis par expo-dev-launcher et expo-dev-menu pour satisfaire le linker

#import <Foundation/Foundation.h>

// RCTPackagerConnection (expo-dev-launcher)
@interface RCTPackagerConnection : NSObject
+ (instancetype)sharedPackagerConnection;
- (void)setSocketConnectionURL:(NSURL *)url;
@end
@implementation RCTPackagerConnection
+ (instancetype)sharedPackagerConnection { return [[self alloc] init]; }
- (void)setSocketConnectionURL:(NSURL *)url {}
@end

// RCTPerfMonitor (expo-dev-menu)
@interface RCTPerfMonitor : NSObject
@end
@implementation RCTPerfMonitor
@end

// RCTReconnectingWebSocket (expo-dev-launcher)
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
