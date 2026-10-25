import KpiCard from "@/components/ui/KpiCard";
import {
  Book,
  BookAlert,
  BookCheck,
  Check,
  DollarSign,
  PersonStanding,
} from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <KpiCard
        label={"Total Bookings"}
        value={"value"}
        icon={Book}
        hint={"hint"}
      />
      <KpiCard
        label={"Pending Requests"}
        value={"value"}
        icon={BookAlert}
        hint={"hint"}
      />
      <KpiCard
        label={"Confirmed Bookings"}
        value={"value"}
        icon={BookCheck}
        hint={"hint"}
      />
      <KpiCard
        label={"Completed Jobs"}
        value={"value"}
        icon={Check}
        hint={"hint"}
      />
      <KpiCard
        label={"Total Revenue"}
        value={"value"}
        icon={DollarSign}
        hint={"hint"}
      />
      <KpiCard
        label={"Active Cleaning Staff"}
        value={"value"}
        icon={PersonStanding}
        hint={"hint"}
      />
      /admin/dashboard
      <div
        style={{ width: "10rem", height: "100rem", backgroundColor: "blue" }}
      />
    </div>
  );
}
