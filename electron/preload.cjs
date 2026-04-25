const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApp", {
  isDesktop: true,
  platform: process.platform,
  listNetworkDevices: () => ipcRenderer.invoke("network-share:list-devices"),
  shareFile: (payload) => ipcRenderer.invoke("network-share:send-file", payload),
  getInstallationState: () => ipcRenderer.invoke("desktop-app:get-installation-state"),
  resetInstallationData: () => ipcRenderer.invoke("desktop-app:reset-installation-data"),
  uninstallApp: () => ipcRenderer.invoke("desktop-app:uninstall"),
  onIncomingShare: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("network-share:received", listener);

    return () => {
      ipcRenderer.removeListener("network-share:received", listener);
    };
  },
});
