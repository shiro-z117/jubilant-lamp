import Card from "@/components/ui/Card";
import CalendarView from "@/components/calendar/CalendarView";
import { requireRole } from "@/services/authService";

export default async function CalendarPage() {
  await requireRole("admin");

  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="text-2xl font-semibold">Calendar</h1>
      <Card>
        <CalendarView />
      </Card>
    </div>
  );
}
