const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApp", {
  isDesktop: true,
  platform: process.platform,
  listNetworkDevices: () => ipcRenderer.invoke("network-share:list-devices"),
  shareFile: (payload) => ipcRenderer.invoke("network-share:send-file", payload),
  onIncomingShare: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("network-share:received", listener);

    return () => {
      ipcRenderer.removeListener("network-share:received", listener);
    };
  },
});
