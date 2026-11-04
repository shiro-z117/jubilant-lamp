import assert from "node:assert";
import { assertTransition, allowedNext } from "../src/lib/bookingStatus";

// run via npx tsx tests/testBookingStatus.ts

// should NOT throw
assert.strictEqual(assertTransition("Pending", "Quoted", "admin"), null);
assert.strictEqual(assertTransition("Assigned", "In Progress", "staff"), null);
assert.strictEqual(assertTransition("Pending", "Cancelled", "admin"), null);
assert.strictEqual(assertTransition("Completed", "Pending", "admin"), "Booking status changed: Completed -> Pending");
assert.strictEqual(assertTransition("Cancelled", "Pending", "admin"), "Booking status changed: Cancelled -> Pending");
assert.strictEqual(assertTransition("Quoted", "Confirmed", "system"), null);
assert.strictEqual(assertTransition("Confirmed", "Assigned", "system"), null);

// SHOULD throw
assert.throws(() => assertTransition("Pending", "Completed", "admin"));
assert.throws(() => assertTransition("Pending", "Pending", "admin"));
assert.throws(() => assertTransition("Completed", "Cancelled", "admin"));
assert.throws(() => assertTransition("Pending", "Confirmed", "staff"));
assert.throws(() => assertTransition("Completed", "In Progress", "staff"));
assert.throws(() => assertTransition("Pending", "Rejected", "staff"));
assert.throws(() => assertTransition("Pending", "Quoted", "system"));
assert.throws(() => assertTransition("Confirmed", "In Progress", "staff"));
assert.throws(() => assertTransition("Confirmed", "Assigned", "staff"));

// allowedNext
assert.deepStrictEqual(allowedNext("Assigned", "staff"), ["In Progress"]);
assert.ok(!allowedNext("Pending", "admin").includes("Completed"));

console.log("All bookingStatus checks passed");