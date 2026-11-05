import { handle, ok } from "@/lib/apiResponse";
import { requireApiRole } from "@/services/authService";
import { getDashboardCharts, getDashboardKpis, getTodaysOperations } from "@/services/dashboardService";

export const GET = handle(async () => {
    const session = await requireApiRole("admin");
    const [kpis, charts, todaysOperations] = await Promise.all([
        getDashboardKpis(session),
        getDashboardCharts(session),
        getTodaysOperations(session),
    ]);
    return ok({ kpis, charts, todaysOperations });
});