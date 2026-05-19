"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, LoaderCircle, LogIn, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changeEmail, setChangeEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePending, setChangePending] = useState(false);
  const [recoverPasswordOpen, setRecoverPasswordOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryAccountUsername, setRecoveryAccountUsername] = useState("");
  const [recoveryNewPassword, setRecoveryNewPassword] = useState("");
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState("");
  const [recoveryPending, setRecoveryPending] = useState(false);
  const [installationState, setInstallationState] = useState<Awaited<
    ReturnType<NonNullable<Window["desktopApp"]>["getInstallationState"]>
  > | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [resettingInstallation, setResettingInstallation] = useState(false);
  const [uninstallingApp, setUninstallingApp] = useState(false);

  useEffect(() => {
    async function loadInstallationState() {
      if (!window.desktopApp?.isDesktop) {
        return;
      }

      setIsDesktop(true);

      try {
        setInstallationState(await window.desktopApp.getInstallationState());
      } catch {
        toast.error("Could not inspect local installation files.");
      }
    }

    void loadInstallationState();
  }, []);

  function resetChangePasswordForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setChangePending(false);
  }

  function handleChangePasswordOpenChange(open: boolean) {
    setChangePasswordOpen(open);

    if (!open) {
      resetChangePasswordForm();
    }
  }

  function resetRecoveryPasswordForm() {
    setRecoveryAccountUsername("");
    setRecoveryNewPassword("");
    setRecoveryConfirmPassword("");
    setRecoveryPending(false);
  }

  function handleRecoverPasswordOpenChange(open: boolean) {
    setRecoverPasswordOpen(open);

    if (!open) {
      resetRecoveryPasswordForm();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      toast.error(payload.message ?? "Login failed.");
      setPending(false);
      return;
    }

    const userName = payload?.user?.name?.trim() || "Admin";
    toast.success(`Welcome back, ${userName}.`);
    router.push("/overview");
    router.refresh();
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!changeEmail.trim()) {
      toast.error("Email is required.");
      return;
    }

    if (!currentPassword) {
      toast.error("Current password is required.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    setChangePending(true);

    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: changeEmail.trim(),
        currentPassword,
        newPassword,
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      toast.error(payload.message ?? "Password change failed.");
      setChangePending(false);
      return;
    }

    setEmail(changeEmail.trim().toLowerCase());
    setPassword("");
    setShowPassword(false);
    toast.success("Password changed successfully. Sign in with the new password.");
    handleChangePasswordOpenChange(false);
  }

  async function handleRecoverPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!recoveryEmail.trim()) {
      toast.error("Admin email is required.");
      return;
    }

    if (!recoveryAccountUsername.trim()) {
      toast.error("Local computer account username is required.");
      return;
    }

    if (recoveryNewPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }

    if (recoveryNewPassword !== recoveryConfirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    setRecoveryPending(true);

    const response = await fetch("/api/auth/recover-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: recoveryEmail.trim().toLowerCase(),
        accountUsername: recoveryAccountUsername.trim(),
        newPassword: recoveryNewPassword,
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      toast.error(payload.message ?? "Password recovery failed.");
      setRecoveryPending(false);
      return;
    }

    setEmail(recoveryEmail.trim().toLowerCase());
    setPassword("");
    setShowPassword(false);
    toast.success("Password reset completed on this device. Sign in with the new password.");
    handleRecoverPasswordOpenChange(false);
  }

  async function handleResetInstallation() {
    if (!window.desktopApp?.isDesktop) {
      toast.error("This reset option is only available in the desktop app.");
      return;
    }

    const confirmed = window.confirm(
      "Remove the saved setup and local user accounts for this installation, but keep the reports and stored files?",
    );

    if (!confirmed) {
      return;
    }

    setResettingInstallation(true);

    try {
      const nextState = await window.desktopApp.resetInstallationData();
      setInstallationState(nextState);
      toast.success("Setup and user data were removed. Reports were kept.");
      router.push("/setup");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reset the local setup data.");
    } finally {
      setResettingInstallation(false);
    }
  }

  async function handleUninstallApp() {
    if (!window.desktopApp?.isDesktop) {
      toast.error("This uninstall option is only available in the desktop app.");
      return;
    }

    if (!installationState?.canUninstall) {
      toast.error("Automatic uninstall is not available in this build.");
      return;
    }

    const confirmed = window.confirm(
      "Move this desktop app to Trash and remove only the local setup and user data? Stored reports will be preserved on this computer.",
    );

    if (!confirmed) {
      return;
    }

    setUninstallingApp(true);

    try {
      await window.desktopApp.uninstallApp();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not uninstall the desktop app.");
      setUninstallingApp(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="border-border/70 bg-card/85 shadow-panel backdrop-blur">
          <CardHeader className="space-y-3">
            <div className="flex justify-center pb-2">
              <Image
                src="/tie.png"
                alt="TIE logo"
                width={96}
                height={96}
                className="h-20 w-auto object-contain"
                priority
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Report Management System</p>
              <CardTitle className="text-2xl">Welcome back</CardTitle>
            </div>
            <CardDescription>Enter your details below to open your reports dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pr-11"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button className="w-full" disabled={pending} type="submit">
                {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                Continue
              </Button>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setChangeEmail(email.trim().toLowerCase());
                    setCurrentPassword(password);
                    setNewPassword("");
                    setConfirmPassword("");
                    setChangePasswordOpen(true);
                  }}
                >
                  Change password
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setRecoveryEmail(email.trim().toLowerCase());
                    setRecoveryAccountUsername("");
                    setRecoveryNewPassword("");
                    setRecoveryConfirmPassword("");
                    setRecoverPasswordOpen(true);
                  }}
                >
                  Forgot password?
                </Button>
              </div>

              <div className="space-y-2 border-t border-border/70 pt-4">
                <p className="text-center text-xs text-muted-foreground">
                  Device maintenance options for this installation.
                </p>
                {!isDesktop ? (
                  <p className="text-center text-[11px] text-muted-foreground">
                    These actions work in the desktop app and preserve stored reports.
                  </p>
                ) : null}
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => void handleResetInstallation()}
                    disabled={resettingInstallation || uninstallingApp}
                  >
                    {resettingInstallation ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Reset setup only
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => void handleUninstallApp()}
                    disabled={resettingInstallation || uninstallingApp}
                  >
                    {uninstallingApp ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Uninstall app only
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={changePasswordOpen} onOpenChange={handleChangePasswordOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Enter the current password first. The new password is only saved after that verification succeeds.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleChangePassword}>
            <div className="space-y-2">
              <Label htmlFor="change-email">Email</Label>
              <Input
                id="change-email"
                type="email"
                autoComplete="username"
                value={changeEmail}
                onChange={(event) => setChangeEmail(event.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Enter current password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="At least 8 characters"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter new password"
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleChangePasswordOpenChange(false)} disabled={changePending}>
                Cancel
              </Button>
              <Button type="submit" disabled={changePending}>
                {changePending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Save new password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={recoverPasswordOpen} onOpenChange={handleRecoverPasswordOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Recover forgotten password</DialogTitle>
            <DialogDescription>
              This offline recovery only works on the original configured workstation. Enter the admin email and the current local
              computer account username to reset the password locally.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleRecoverPassword}>
            <div className="space-y-2">
              <Label htmlFor="recovery-email">Admin email</Label>
              <Input
                id="recovery-email"
                type="email"
                autoComplete="username"
                value={recoveryEmail}
                onChange={(event) => setRecoveryEmail(event.target.value)}
                placeholder="Registered admin email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recovery-account-username">Local computer account username</Label>
              <Input
                id="recovery-account-username"
                value={recoveryAccountUsername}
                onChange={(event) => setRecoveryAccountUsername(event.target.value)}
                placeholder="Current macOS account username"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recovery-new-password">New password</Label>
              <Input
                id="recovery-new-password"
                type="password"
                autoComplete="new-password"
                value={recoveryNewPassword}
                onChange={(event) => setRecoveryNewPassword(event.target.value)}
                placeholder="At least 8 characters"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recovery-confirm-password">Confirm new password</Label>
              <Input
                id="recovery-confirm-password"
                type="password"
                autoComplete="new-password"
                value={recoveryConfirmPassword}
                onChange={(event) => setRecoveryConfirmPassword(event.target.value)}
                placeholder="Re-enter new password"
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleRecoverPasswordOpenChange(false)}
                disabled={recoveryPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={recoveryPending}>
                {recoveryPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Reset password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
