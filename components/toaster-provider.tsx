"use client";

import { CheckCircle2, Info, TriangleAlert, XCircle } from "lucide-react";
import { Toaster, ToastBar, type Toast } from "react-hot-toast";

function ToastIcon({ toast }: { toast: Toast }) {
  const iconClassName = "h-4 w-4 text-foreground";

  if (toast.type === "success") return <CheckCircle2 className={iconClassName} />;
  if (toast.type === "error") return <XCircle className={iconClassName} />;
  if (toast.type === "loading") return <TriangleAlert className={iconClassName} />;
  return <Info className={iconClassName} />;
}

export function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: {
          borderRadius: "12px",
          border: "1px solid hsl(var(--border))",
          background: "hsl(var(--background))",
          color: "hsl(var(--foreground))",
          boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
          padding: "12px 14px",
        },
      }}
    >
      {(toast) => (
        <ToastBar toast={toast}>
          {({ message }) => (
            <div className="flex items-center gap-3">
              <ToastIcon toast={toast} />
              <div className="text-sm font-medium">{message}</div>
            </div>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}
