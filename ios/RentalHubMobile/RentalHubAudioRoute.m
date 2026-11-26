#import "RentalHubAudioRoute.h"

#import <AVFoundation/AVAudioSession.h>

@implementation RentalHubAudioRoute

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[@"RentalHubAudioRouteChanged"];
}

- (void)startObserving
{
  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(handleRouteChange:)
                                               name:AVAudioSessionRouteChangeNotification
                                             object:nil];
}

- (void)stopObserving
{
  [[NSNotificationCenter defaultCenter] removeObserver:self
                                                  name:AVAudioSessionRouteChangeNotification
                                                object:nil];
}

- (void)handleRouteChange:(NSNotification *)notification
{
  [self sendEventWithName:@"RentalHubAudioRouteChanged" body:[self routeState]];
}

- (BOOL)hasBluetoothOutput
{
  for (AVAudioSessionPortDescription *port in AVAudioSession.sharedInstance.currentRoute.outputs) {
    if ([port.portType isEqualToString:AVAudioSessionPortBluetoothA2DP] ||
        [port.portType isEqualToString:AVAudioSessionPortBluetoothHFP] ||
        [port.portType isEqualToString:AVAudioSessionPortBluetoothLE]) {
      return YES;
    }
  }
  return NO;
}

- (NSDictionary *)routeState
{
  AVAudioSession *session = AVAudioSession.sharedInstance;
  NSMutableArray *available = [NSMutableArray arrayWithArray:@[@"earpiece", @"speaker"]];
  if ([self hasBluetoothOutput]) [available addObject:@"bluetooth"];

  NSString *route = @"earpiece";
  for (AVAudioSessionPortDescription *port in session.currentRoute.outputs) {
    if ([port.portType isEqualToString:AVAudioSessionPortBuiltInSpeaker]) {
      route = @"speaker";
      break;
    }
    if ([port.portType isEqualToString:AVAudioSessionPortBluetoothA2DP] ||
        [port.portType isEqualToString:AVAudioSessionPortBluetoothHFP] ||
        [port.portType isEqualToString:AVAudioSessionPortBluetoothLE]) {
      route = @"bluetooth";
      break;
    }
    if ([port.portType isEqualToString:AVAudioSessionPortHeadphones] ||
        [port.portType isEqualToString:AVAudioSessionPortHeadsetMic] ||
        [port.portType isEqualToString:AVAudioSessionPortUSBAudio]) {
      route = @"wired";
      break;
    }
  }

  return @{
    @"route": route,
    @"available": available,
    @"supported": @YES,
  };
}

RCT_EXPORT_METHOD(getState:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  resolve([self routeState]);
}

RCT_EXPORT_METHOD(setRoute:(NSString *)route resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    AVAudioSession *session = AVAudioSession.sharedInstance;
    NSError *error = nil;
    AVAudioSessionCategoryOptions options = AVAudioSessionCategoryOptionAllowBluetooth |
      AVAudioSessionCategoryOptionAllowBluetoothA2DP;

    if ([route isEqualToString:@"speaker"]) {
      options |= AVAudioSessionCategoryOptionDefaultToSpeaker;
      [session setCategory:AVAudioSessionCategoryPlayAndRecord mode:AVAudioSessionModeVoiceChat options:options error:&error];
      if (!error) [session overrideOutputAudioPort:AVAudioSessionPortOverrideSpeaker error:&error];
    } else if ([route isEqualToString:@"earpiece"]) {
      [session setCategory:AVAudioSessionCategoryPlayAndRecord mode:AVAudioSessionModeVoiceChat options:options error:&error];
      if (!error) [session overrideOutputAudioPort:AVAudioSessionPortOverrideNone error:&error];
    } else if ([route isEqualToString:@"bluetooth"]) {
      if (![self hasBluetoothOutput]) {
        reject(@"NO_BLUETOOTH_DEVICE", @"Connect a Bluetooth audio device first.", nil);
        return;
      }
      [session setCategory:AVAudioSessionCategoryPlayAndRecord mode:AVAudioSessionModeVoiceChat options:options error:&error];
      if (!error) [session overrideOutputAudioPort:AVAudioSessionPortOverrideNone error:&error];
    } else {
      reject(@"UNKNOWN_ROUTE", @"Unsupported audio route.", nil);
      return;
    }

    if (error) {
      reject(@"AUDIO_ROUTE_FAILED", error.localizedDescription, error);
      return;
    }

    [self sendEventWithName:@"RentalHubAudioRouteChanged" body:[self routeState]];
    resolve([self routeState]);
  });
}

RCT_EXPORT_METHOD(restore:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    AVAudioSession *session = AVAudioSession.sharedInstance;
    NSError *error = nil;
    [session setCategory:AVAudioSessionCategoryPlayback
                    mode:AVAudioSessionModeDefault
                 options:AVAudioSessionCategoryOptionMixWithOthers
                   error:&error];
    if (!error) [session overrideOutputAudioPort:AVAudioSessionPortOverrideNone error:&error];
    if (error) {
      reject(@"AUDIO_ROUTE_FAILED", error.localizedDescription, error);
      return;
    }
    resolve([self routeState]);
  });
}

@end
