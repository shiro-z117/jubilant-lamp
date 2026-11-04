import assert from "node:assert";
import { db } from "../src/prisma/db";
import { listBookings, getBooking } from "../src/services/bookingService";
import { listBookingsSchema } from "../src/schemas/booking";
import { NotFoundError, ForbiddenError } from "../src/lib/apiResponse";

// run via npx tsx tests/testBookingServiceReads.ts

// parse() applies the defaults (page 1, limit 20), like a route would
const filters = (input: Record<string, unknown> = {}) => listBookingsSchema.parse(input);

async function main() {
    const adminUser = await db.orm.public.User.where({ role: "admin" }).first();
    assert.ok(adminUser, "no admin found: run the seed first");
    const admin = { userId: adminUser.id, role: "admin" as const, staffId: null };

    // a staff member who is on MC-1001 (from the seed)
    const mc1001 = await db.orm.public.Booking.where({ id: "MC-1001" }).include("assignments").first();
    assert.ok(mc1001 && mc1001.assignments.length > 0, "MC-1001 has no assignment: run the seed first");
    const staffRow = await db.orm.public.Staff.first({ id: mc1001.assignments[0].staffId });
    assert.ok(staffRow);
    const staff = { userId: staffRow.userId, role: "staff" as const, staffId: staffRow.id };

    // #region ----- listBookings tests -----
    const all = await listBookings(filters(), admin);
    assert.ok(all.total > 0);
    assert.ok(all.items.length <= 20);

    const page = await listBookings(filters({ limit: 5, page: 2 }), admin);
    assert.ok(page.items.length <= 5);
    assert.notStrictEqual(page.items[0]?.id, all.items[0]?.id); // page 2 differs from page 1

    const completed = await listBookings(filters({ status: "Completed" }), admin);
    assert.ok(completed.items.length > 0);
    assert.ok(completed.items.every((b) => b.status === "Completed"));

    const byId = await listBookings(filters({ search: "MC-1001" }), admin);
    assert.ok(byId.items.some((b) => b.id === "MC-1001"));

    const byName = await listBookings(filters({ search: "agnes" }), admin); // case-insensitive
    assert.ok(byName.items.length > 0);
    assert.ok(byName.items.every((b) => b.customer.name.toLowerCase().includes("agnes")));

    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    const today = await listBookings(filters({ startDate: start.toISOString(), endDate: end.toISOString() }), admin);
    assert.ok(today.items.length > 0);
    assert.ok(today.items.every((b) => b.scheduledAt >= start && b.scheduledAt <= end));

    const byStaff = await listBookings(filters({ staffId: staff.staffId }), admin);
    assert.ok(byStaff.items.every((b) => b.assignments.some((a) => a.staffId === staff.staffId)));

    // staff only see their own, even when asking for someone else's staffId
    const asStaff = await listBookings(filters({ staffId: "someone-else" }), staff);
    assert.ok(asStaff.items.length > 0);
    assert.ok(asStaff.items.every((b) => b.assignments.some((a) => a.staffId === staff.staffId)));
    // #endregion ----- listBookings tests -----

    // #region ----- getBooking tests -----
    const detail = await getBooking("MC-1001", admin);
    assert.strictEqual(detail.id, "MC-1001");
    assert.ok(detail.customer);
    assert.ok(detail.statusHistory.length > 0);
    for (let i = 1; i < detail.statusHistory.length; i++) {
        assert.ok(detail.statusHistory[i].changedAt >= detail.statusHistory[i - 1].changedAt); // oldest first
    }
    assert.ok(detail.services.length > 0);

    await assert.rejects(() => getBooking("MC-9999", admin), NotFoundError);

    const own = await getBooking("MC-1001", staff); // their own booking works
    assert.strictEqual(own.id, "MC-1001");

    // a booking this staff member is not assigned to
    const other = await db.orm.public.Booking
        .where((b) => b.assignments.none((a) => a.staffId.eq(staff.staffId)))
        .first();
    assert.ok(other);
    await assert.rejects(() => getBooking(other.id, staff), ForbiddenError);
    // #endregion ----- getBooking tests -----

    console.log("All bookingService checks passed");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .then(() => process.exit(0));