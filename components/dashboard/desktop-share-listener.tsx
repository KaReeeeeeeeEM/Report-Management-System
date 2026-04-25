"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function DesktopShareListener() {
  const router = useRouter();

  useEffect(() => {
    if (!window.desktopApp?.isDesktop) {
      return undefined;
    }

    return window.desktopApp.onIncomingShare((payload) => {
      toast.success(`Received "${payload.reportTitle}" from ${payload.senderName}. Added to Shared.`);
      router.refresh();
    });
  }, [router]);

  return null;
}
