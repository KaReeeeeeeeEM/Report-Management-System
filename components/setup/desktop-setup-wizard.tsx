"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Database, Eye, EyeOff, HardDrive, LaptopMinimal, LoaderCircle, RefreshCcw, ShieldCheck, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import type { DesktopSetupState } from "@/lib/desktop-setup";
import type { MongoDetectionResult } from "@/lib/mongodb-detection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DesktopSetupWizardProps = {
  initialState: DesktopSetupState;
  mongo: MongoDetectionResult;
  defaultDeviceName: string;
};

type InstallationState = Awaited<ReturnType<NonNullable<Window["desktopApp"]>["getInstallationState"]>>;

export function DesktopSetupWizard({
  initialState,
  mongo,
  defaultDeviceName,
}: DesktopSetupWizardProps) {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState(initialState.organizationName ?? "Tanzania Institute of Education");
  const [deviceName, setDeviceName] = useState(initialState.deviceName ?? defaultDeviceName);
  const [adminName, setAdminName] = useState(initialState.adminName ?? "");
  const [adminEmail, setAdminEmail] = useState(initialState.adminEmail ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [refreshingEnvironment, setRefreshingEnvironment] = useState(false);
  const [installationState, setInstallationState] = useState<InstallationState | null>(null);
  const [resettingInstallation, setResettingInstallation] = useState(false);
  const [uninstallingApp, setUninstallingApp] = useState(false);

  const mongoStatusLabel = useMemo(() => {
    if (mongo.installed && mongo.reachable) {
      return mongo.version ? `MongoDB ${mongo.version} ready` : "MongoDB ready";
    }

    if (mongo.installed) {
      return "MongoDB found, service not reachable";
    }

    return "MongoDB not detected";
  }, [mongo]);

  const hasExistingInstallationFiles = Boolean(
    installationState?.setupExists || installationState?.databaseExists || installationState?.storageExists,
  );

  useEffect(() => {
    async function loadInstallationState() {
      if (!window.desktopApp?.isDesktop) {
        return;
      }

      try {
        setInstallationState(await window.desktopApp.getInstallationState());
      } catch {
        toast.error("Could not inspect local installation files.");
      }
    }

    void loadInstallationState();
  }, []);

  async function handleRefreshEnvironment() {
    setRefreshingEnvironment(true);

    try {
      if (window.desktopApp?.isDesktop) {
        setInstallationState(await window.desktopApp.getInstallationState());
      }

      router.refresh();
      toast.success("Environment status refreshed.");
    } catch {
      toast.error("Could not refresh the local installation status.");
    } finally {
      setRefreshingEnvironment(false);
    }
  }

  async function handleResetInstallation() {
    if (!window.desktopApp?.isDesktop) {
      return;
    }

    const confirmed = window.confirm("Remove the saved setup, local accounts, and stored desktop files for this installation?");

    if (!confirmed) {
      return;
    }

    setResettingInstallation(true);

    try {
      const nextState = await window.desktopApp.resetInstallationData();
      setInstallationState(nextState);
      toast.success("Local installation data was removed.");
      router.push("/setup");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove the local installation data.");
    } finally {
      setResettingInstallation(false);
    }
  }

  async function handleUninstallApp() {
    if (!window.desktopApp?.isDesktop || !installationState?.canUninstall) {
      return;
    }

    const confirmed = window.confirm("Move this desktop app to Trash and remove its local installation data?");

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setPending(true);

    const response = await fetch("/api/setup/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationName,
        deviceName,
        adminName,
        adminEmail,
        password,
        databaseMode: "desktop-embedded",
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      toast.error(payload.message ?? "Desktop setup failed.");
      setPending(false);
      return;
    }

    toast.success("Desktop setup completed.");
    router.push("/overview");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
      <section className="space-y-6">
        <div className="space-y-3">
          <Badge className="w-fit rounded-full px-3 py-1">Desktop installer</Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Set up this workstation</h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Finish the local installation, choose the database mode, and create the first administrator for this computer.
            </p>
          </div>
        </div>

        <Card className="border-border/70">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <LaptopMinimal className="h-4 w-4 text-primary" />
              Environment
            </div>
            <CardDescription>Installer readiness for the current machine.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Device</p>
                <p className="mt-2 font-medium">{deviceName}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Database check</p>
                <p className="mt-2 font-medium">{mongoStatusLabel}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                <p className="font-medium">Local MongoDB</p>
              </div>
              <p className="mt-2 text-muted-foreground">
                {mongo.installed && mongo.reachable
                  ? "A local MongoDB service is already available on this device and can be used during setup."
                  : "MongoDB is not ready on this device yet, so the embedded desktop database is selected for this installation."}
              </p>
              {mongo.notes.length > 0 ? (
                <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                  {mongo.notes.map((note) => (
                    <li key={note} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/80" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-primary" />
                <p className="font-medium">Existing local installation files</p>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-background/80 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Setup state</p>
                  <p className="mt-2 font-medium">{installationState?.setupExists ? "Found" : "Not found"}</p>
                </div>
                <div className="rounded-lg border border-border bg-background/80 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Database</p>
                  <p className="mt-2 font-medium">{installationState?.databaseExists ? "Found" : "Not found"}</p>
                </div>
                <div className="rounded-lg border border-border bg-background/80 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Stored files</p>
                  <p className="mt-2 font-medium">{installationState?.storageExists ? "Found" : "Not found"}</p>
                </div>
              </div>
              {installationState ? (
                <p className="mt-3 break-all text-xs text-muted-foreground">
                  Data path: {installationState.userDataPath}
                </p>
              ) : null}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={() => void handleRefreshEnvironment()}
                  disabled={refreshingEnvironment || pending || resettingInstallation || uninstallingApp}
                >
                  {refreshingEnvironment ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  Recheck environment
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => void handleResetInstallation()}
                  disabled={!hasExistingInstallationFiles || refreshingEnvironment || pending || resettingInstallation || uninstallingApp}
                >
                  {resettingInstallation ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Clear local installation data
                </Button>
                {installationState?.canUninstall ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => void handleUninstallApp()}
                    disabled={pending || resettingInstallation || uninstallingApp}
                  >
                    {uninstallingApp ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Uninstall desktop app
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70 bg-card/95 shadow-panel">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Installation details</CardTitle>
          <CardDescription>Choose how this desktop stores data and define the first administrator account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="organizationName">Organization name</Label>
                <Input
                  id="organizationName"
                  value={organizationName}
                  onChange={(event) => setOrganizationName(event.target.value)}
                  placeholder="Enter organization name"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="deviceName">Device name</Label>
                <Input
                  id="deviceName"
                  value={deviceName}
                  onChange={(event) => setDeviceName(event.target.value)}
                  placeholder="Enter workstation name"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Database mode</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-primary bg-primary/10 p-4">
                    <p className="font-medium">Embedded desktop database</p>
                    <p className="mt-2 text-sm text-muted-foreground">This installer build uses the desktop-local data store for immediate deployment.</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="font-medium">Local MongoDB server</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {mongo.installed && mongo.reachable
                        ? "MongoDB is available on this machine, but the installer is not switching runtime storage over to it yet."
                        : "MongoDB installation detection is wired, but automated local MongoDB provisioning is still the next installer phase."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminName">Administrator name</Label>
                <Input
                  id="adminName"
                  value={adminName}
                  onChange={(event) => setAdminName(event.target.value)}
                  placeholder="Enter administrator name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail">Administrator email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  autoComplete="username"
                  value={adminEmail}
                  onChange={(event) => setAdminEmail(event.target.value)}
                  placeholder="admin@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 8 characters"
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat password"
                    className="pr-11"
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button disabled={pending} type="submit">
                {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Complete setup
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
