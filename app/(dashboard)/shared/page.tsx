import { SharedFilesTable } from "@/components/dashboard/shared-files-table";
import { getAllSharedFiles } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SharedFilesPage() {
  const sharedFiles = await getAllSharedFiles();

  return (
    <div className="space-y-6">
      <SharedFilesTable files={sharedFiles} />
    </div>
  );
}
