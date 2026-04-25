export {};

type NetworkDevice = {
  id: string;
  name: string;
  platform: string;
  address: string;
  transferPort: number;
  lastSeenAt: number;
};

type SharedFilePayload = {
  deviceId: string;
  fileName: string;
  mimeType: string;
  reportTitle: string;
  data: Uint8Array | ArrayBuffer;
};

type IncomingSharedFile = {
  sharedFileId: string;
  fileName: string;
  reportTitle: string;
  savedTo: string;
  senderName: string;
};

type DesktopInstallationState = {
  userDataPath: string;
  setupPath: string;
  databasePath: string;
  storagePath: string;
  appBundlePath: string;
  setupExists: boolean;
  databaseExists: boolean;
  storageExists: boolean;
  appBundleExists: boolean;
  canUninstall: boolean;
};

declare global {
  interface Window {
    desktopApp?: {
      isDesktop: boolean;
      platform: NodeJS.Platform;
      listNetworkDevices: () => Promise<NetworkDevice[]>;
      shareFile: (payload: SharedFilePayload) => Promise<{ savedTo?: string }>;
      getInstallationState: () => Promise<DesktopInstallationState>;
      resetInstallationData: () => Promise<DesktopInstallationState>;
      uninstallApp: () => Promise<{ ok: boolean }>;
      onIncomingShare: (callback: (payload: IncomingSharedFile) => void) => () => void;
    };
  }
}
