import { AnimatedSection } from "@/components/dashboard/animated-section";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ReportsTrendChart } from "@/components/dashboard/reports-trend-chart";
import { StatusDistributionChart } from "@/components/dashboard/status-distribution-chart";
import { ReportsTable } from "@/components/dashboard/reports-table";
import { getDashboardSnapshot } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const snapshot = await getDashboardSnapshot();
  const latestReports = snapshot.recentReports.slice(0, 5);

  return (
    <div className="space-y-6">
      <AnimatedSection className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" dataTour="overview-metrics">
        <MetricCard
          title="Total Reports"
          value={snapshot.metrics.totalReports}
          helper={`${snapshot.metrics.monthlyGrowth > 0 ? "+" : ""}${snapshot.metrics.monthlyGrowth}% vs last month`}
          iconName="reports"
        />
        <MetricCard
          title="Stored Files"
          value={snapshot.metrics.totalStorageLabel}
          helper="Saved on server device storage"
          iconName="storage"
        />
        <MetricCard
          title="Reviewed Reports"
          value={snapshot.metrics.reviewedReports}
          helper={`${snapshot.metrics.reviewRate}% review completion`}
          iconName="reviewed"
        />
        <MetricCard
          title="This Month"
          value={snapshot.metrics.thisMonthUploads}
          helper="New uploads across all categories"
          iconName="trending"
        />
      </AnimatedSection>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.75fr]" data-tour="overview-charts">
        <ReportsTrendChart data={snapshot.monthlyTrend} />
        <StatusDistributionChart data={snapshot.statusBreakdown} />
      </div>

      <ReportsTable reports={latestReports} title="Latest Reports" description="Most recent files saved in the system." />
    </div>
  );
}
