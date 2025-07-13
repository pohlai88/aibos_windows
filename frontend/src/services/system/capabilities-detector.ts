import { SystemCapabilities } from './types.ts';

export class CapabilitiesDetector {
  detect(): SystemCapabilities {
    return {
      notifications: 'Notification' in window,
      fileSystem: 'showDirectoryPicker' in window || 'showOpenFilePicker' in window,
      clipboard: 'clipboard' in navigator,
      powerManagement: 'getBattery' in navigator,
      networkAccess: 'navigator' in window,
      audio: 'AudioContext' in window || 'webkitAudioContext' in window,
      video: 'getUserMedia' in navigator,
      sensors: 'DeviceOrientationEvent' in window || 'DeviceMotionEvent' in window,
    };
  }
}