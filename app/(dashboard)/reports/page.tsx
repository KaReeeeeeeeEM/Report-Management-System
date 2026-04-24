import { ReportsTable } from "@/components/dashboard/reports-table";
import { getAllReports } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const reports = await getAllReports({ deleted: false });

  return (
    <div className="space-y-6">
      <ReportsTable
        reports={reports}
        title="Reports"
        description="View your reports, open any PDF, and keep every project update easy to follow."
        allowCreate
        enableSearchAndSort
      />
    </div>
  );
}
