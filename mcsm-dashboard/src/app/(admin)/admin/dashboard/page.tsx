import {
  Book,
  BookAlert,
  BookCheck,
  Check,
  DollarSign,
  Users,
} from "lucide-react";
import Card from "@/components/ui/Card";
import KpiCard from "@/components/ui/KpiCard";
import centsToUSD from "@/lib/centsToUSD";
import { requireRole } from "@/services/authService";
import BookingsChart from "@/components/dashboard/charts/BookingsChart";
import RevenueChart from "@/components/dashboard/charts/RevenueChart";
import StatusChart from "@/components/dashboard/charts/StatusChart";
import TopServicesChart from "@/components/dashboard/charts/TopServicesChart";
import TodaysOperations from "@/components/dashboard/TodaysOperations";
import {
  getDashboardCharts,
  getDashboardKpis,
  getTodaysOperations,
} from "@/services/dashboardService";

export default async function AdminDashboard() {
  const session = await requireRole("admin");
  const [kpis, charts, operations] = await Promise.all([
    getDashboardKpis(session),
    getDashboardCharts(session),
    getTodaysOperations(session),
  ]);

  return (
    <div className="content">
      <Card title="Today's operations">
        <TodaysOperations operations={operations} />
      </Card>

      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Total Bookings"
          value={kpis.totalBookings}
          icon={Book}
        />
        <KpiCard
          label="Pending Requests"
          value={kpis.pendingRequests}
          icon={BookAlert}
        />
        <KpiCard
          label="Confirmed Bookings"
          value={kpis.confirmedBookings}
          icon={BookCheck}
        />
        <KpiCard
          label="Completed Jobs"
          value={kpis.completedJobs}
          icon={Check}
        />
        <KpiCard
          label="Total Revenue"
          value={centsToUSD(kpis.totalRevenue)}
          icon={DollarSign}
        />
        <KpiCard
          label="Active Cleaning Staff"
          value={kpis.activeStaff}
          icon={Users}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Bookings over time (last 90 days)">
          <BookingsChart data={charts.bookingsOverTime} />
        </Card>
        <Card title="Monthly revenue (last 90 days)">
          <RevenueChart data={charts.monthlyRevenue} />
        </Card>
        <Card title="Booking status breakdown">
          <StatusChart data={charts.statusBreakdown} />
        </Card>
        <Card title="Most requested services">
          <TopServicesChart data={charts.topServices} />
        </Card>
      </div>
    </div>
  );
}
