"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ConfirmActionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  confirmationLabel?: string;
  confirmationText?: string;
  confirmationHint?: string;
  confirmButtonClassName?: string;
  onConfirm: () => void;
};

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pending = false,
  confirmationLabel,
  confirmationText,
  confirmationHint,
  confirmButtonClassName,
  onConfirm,
}: ConfirmActionDialogProps) {
  const [typedConfirmation, setTypedConfirmation] = useState("");

  useEffect(() => {
    if (!open) {
      setTypedConfirmation("");
    }
  }, [open]);

  const confirmationMatches = useMemo(() => {
    if (!confirmationText) {
      return true;
    }

    return typedConfirmation.trim() === confirmationText;
  }, [confirmationText, typedConfirmation]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {confirmationText ? (
          <div className="space-y-2">
            <Label htmlFor="confirm-action-input">{confirmationLabel ?? "Type to confirm"}</Label>
            <Input
              id="confirm-action-input"
              value={typedConfirmation}
              onChange={(event) => setTypedConfirmation(event.target.value)}
              placeholder={confirmationText}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              {confirmationHint ?? `Type "${confirmationText}" to continue.`}
            </p>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={pending || !confirmationMatches} className={confirmButtonClassName}>
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
