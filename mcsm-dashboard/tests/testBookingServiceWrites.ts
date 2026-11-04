// tests/testBookingWrites.ts
import assert from "node:assert";
import { db } from "../src/prisma/db";
import {
    rescheduleBooking, changeBookingStatus, assignStaff, unassignStaff, setStaffRequired, syncAssignedStatus,
} from "../src/services/bookingService";
import { ConflictError, ForbiddenError, NotFoundError } from "../src/lib/apiResponse";

// these tests are based on seeded data so use `npm run seed` before to ensure that the tests are actually testing against the expected data
// run via npx tsx tests/testBookingServiceWrites.ts

const load = (id: string) =>
    db.orm.public.Booking
        .where({ id })
        .include("assignments")
        .include("statusHistory", (h) => h.orderBy((x) => x.changedAt.asc()))
        .first();

const lastEntry = (b: NonNullable<Awaited<ReturnType<typeof load>>>) => b.statusHistory[b.statusHistory.length - 1];
const isAccepted = (status: string) => status === "Accepted" || status === "On the Way";

async function main() {
    const adminUser = await db.orm.public.User.where({ role: "admin" }).first();
    assert.ok(adminUser, "run the seed first");
    const admin = { userId: adminUser.id, role: "admin" as const, staffId: null };

    const staffRows = await db.orm.public.Staff.all();
    const activeStaff = staffRows.filter((s) => s.isActive);
    const inactive = staffRows.find((s) => !s.isActive);
    const asStaff = (s: (typeof staffRows)[number]) => ({ userId: s.userId, role: "staff" as const, staffId: s.id });

    const A = await db.orm.public.Booking.where({ status: "Assigned" }).include("assignments").first();
    assert.ok(A, "need an Assigned booking in the seed");
    const accepted = A.assignments.filter((a) => isAccepted(a.status));
    assert.ok(accepted.length >= A.staffRequired);

    const confirmed = await db.orm.public.Booking.where({ status: "Confirmed" }).include("assignments").all();
    const C = confirmed.find((b) => !b.assignments.some((a) => isAccepted(a.status)));
    assert.ok(C, "need a Confirmed booking with no accepted staff");

    const P = await db.orm.public.Booking.where({ status: "Pending" }).first();
    assert.ok(P, "need a Pending booking");
    assert.strictEqual((await db.orm.public.Quotation.where({ bookingId: P.id }).all()).length, 0);

    const D = await db.orm.public.Booking.where({ status: "Completed" }).first();
    assert.ok(D, "need a Completed booking");

    const s = activeStaff.find((x) => !C.assignments.some((a) => a.staffId === x.id));
    assert.ok(s, "need an active staff member not on the Confirmed booking");

    // rescheduleBooking
    const newDate = new Date(C.scheduledAt.getTime() + 24 * 3600 * 1000);
    await rescheduleBooking(C.id, newDate, admin);
    let c = await load(C.id);
    assert.strictEqual(c!.scheduledAt.getTime(), newDate.getTime());
    assert.match(lastEntry(c!).note ?? "", /^Rescheduled/);
    await assert.rejects(() => rescheduleBooking(D.id, newDate, admin), ConflictError); // finished job
    await assert.rejects(() => rescheduleBooking(C.id, newDate, asStaff(s)), ForbiddenError); // admin only
    await assert.rejects(() => rescheduleBooking("MC-9999", newDate, admin), NotFoundError);

    // changeBookingStatus
    await assert.rejects(() => changeBookingStatus(P.id, "Completed", admin), ConflictError); // forward skip
    await assert.rejects(() => changeBookingStatus(P.id, "Quoted", admin), ConflictError); // no quotation yet

    // assignStaff and unassignStaff
    await assignStaff(C.id, [s.id], admin);
    c = await load(C.id);
    assert.ok(c!.assignments.some((a) => a.staffId === s.id && a.status === "Assigned"));
    assert.match(lastEntry(c!).note ?? "", /^Assigned:/);
    await assert.rejects(() => assignStaff(C.id, [s.id], admin), ConflictError); // duplicate
    if (inactive) await assert.rejects(() => assignStaff(C.id, [inactive.id], admin), ConflictError);
    await assert.rejects(() => assignStaff(C.id, ["nope"], admin), NotFoundError);
    await assert.rejects(() => assignStaff(D.id, [s.id], admin), ConflictError); // wrong status
    await assert.rejects(() => assignStaff(C.id, [s.id], asStaff(s)), ForbiddenError); // admin only
    await assert.rejects(() => changeBookingStatus(C.id, "In Progress", asStaff(s)), ForbiddenError); // not accepted yet

    await unassignStaff(C.id, s.id, admin);
    c = await load(C.id);
    assert.ok(!c!.assignments.some((a) => a.staffId === s.id));
    await assert.rejects(() => unassignStaff(C.id, s.id, admin), NotFoundError);

    // assigned status rules
    await changeBookingStatus(A.id, "Confirmed", admin); // admin backward move
    let a = await load(A.id);
    assert.strictEqual(a!.status, "Confirmed");
    assert.match(lastEntry(a!).note ?? "", /^Booking status changed/);

    // enough staff accepted, so sync promotes it again
    assert.strictEqual(await db.transaction((tx) => syncAssignedStatus(tx, A.id)), true);
    a = await load(A.id);
    assert.strictEqual(a!.status, "Assigned");
    assert.strictEqual(lastEntry(a!).changedBy, "System");
    assert.strictEqual(await db.transaction((tx) => syncAssignedStatus(tx, A.id)), false); // already Assigned

    // setStaffRequired
    if (activeStaff.length > accepted.length) {
        await setStaffRequired(A.id, accepted.length + 1, admin);
        a = await load(A.id);
        assert.strictEqual(a!.status, "Confirmed"); // understaffed, so reverted

        await setStaffRequired(A.id, accepted.length, admin);
        a = await load(A.id);
        assert.strictEqual(a!.status, "Assigned"); // requirement met again
    }
    await assert.rejects(() => setStaffRequired(A.id, 999, admin), ConflictError);
    await assert.rejects(() => setStaffRequired(A.id, 1, asStaff(s)), ForbiddenError);

    // staff changing status
    const acceptedStaff = staffRows.find((x) => x.id === accepted[0].staffId)!;
    await changeBookingStatus(A.id, "In Progress", asStaff(acceptedStaff));
    a = await load(A.id);
    assert.strictEqual(a!.status, "In Progress");
    await assert.rejects(() => changeBookingStatus(A.id, "Pending", asStaff(acceptedStaff)), ForbiddenError); // no backward moves for staff

    console.log("All booking write checks passed. Run `npm run seed` to reset the data.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .then(() => process.exit(0));