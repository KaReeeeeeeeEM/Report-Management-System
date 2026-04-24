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
  fileName: string;
  reportTitle: string;
  savedTo: string;
  senderName: string;
};

declare global {
  interface Window {
    desktopApp?: {
      isDesktop: boolean;
      platform: NodeJS.Platform;
      listNetworkDevices: () => Promise<NetworkDevice[]>;
      shareFile: (payload: SharedFilePayload) => Promise<{ savedTo?: string }>;
      onIncomingShare: (callback: (payload: IncomingSharedFile) => void) => () => void;
    };
  }
}
