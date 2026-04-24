import { ReportsTable } from "@/components/dashboard/reports-table";
import { getAllReports } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function RecycleBinPage() {
  const reports = await getAllReports({ deleted: true });

  return (
    <div className="space-y-6">
      <ReportsTable
        reports={reports}
        title="Recycle Bin"
        description="Reports you remove will stay here until you choose to bring them back."
        deletedView
      />
    </div>
  );
}
