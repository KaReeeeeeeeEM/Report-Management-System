"use client";

import { useEffect } from "react";
import toast from "react-hot-toast";

export function DesktopShareListener() {
  useEffect(() => {
    if (!window.desktopApp?.isDesktop) {
      return undefined;
    }

    return window.desktopApp.onIncomingShare((payload) => {
      toast.success(`Received "${payload.reportTitle}" from ${payload.senderName}.`);
    });
  }, []);

  return null;
}
