import type { Booking } from "@/types/booking";
import { ConflictError, ForbiddenError } from "@/lib/apiResponse";

type Status = Booking["status"];
type Actor = "admin" | "staff" | "system"; // system = automatic changes

/**
 * notes on booking statuses:
 * the admin can manually change a booking's status to a previous step, but cannot skip forward (e.g. from Pending to Assigned) or cancel a Completed booking
 * the staff can only change a booking's status to In Progress or Completed, and only if they have an accepted assignment on that booking
 * the system can only change a booking's status from Quoted to Confirmed or Cancelled (when a customer accepts or rejects a quote), or from Confirmed to Assigned (when enough staff members accept an assignment)
 *
 * "Pending" is the default status for a new booking
 * "Quoted" is automatically set when the admin creates a quote for a booking (this counts as being done by the admin, not the system)
 * "Confirmed" is automatically set by the system when the customer accepts a quote
 * "Assigned" is automatically set by the system when enough staff members accept an assignment
 * "In Progress" is set by a staff member when they start work on a booking
 * "Completed" is set by a staff member when they finish work on a booking
 * "Cancelled" is set by the system when a customer declines a quote
 * "Rejected" is set by the admin when they reject a customer's booking request
 * */

// the normal order of a booking's life
const FLOW: Status[] = ["Pending", "Quoted", "Confirmed", "Assigned", "In Progress", "Completed"];
// or if it's been closed
const CLOSED: Status[] = ["Cancelled", "Rejected"];
const ALL: Status[] = [...FLOW, ...CLOSED];

const STAFF_CAN_SET: Status[] = ["In Progress", "Completed"];
const CANCELLABLE: Status[] = ["Pending", "Quoted", "Confirmed", "Assigned", "In Progress"];

type TypeOfMove = "forward" | "backward" | "cancel" | "reject" | "reopen";

// contextualizes status changes
function classifyMove(from: Status, to: Status): TypeOfMove | null {
    const f = FLOW.indexOf(from);
    const t = FLOW.indexOf(to);

    if (f !== -1 && t !== -1) {
        if (t === f + 1) return "forward";
        if (t < f) return "backward";
        return null;
    }
    if (to === "Cancelled" && CANCELLABLE.includes(from)) return "cancel";
    if (to === "Rejected" && from === "Pending") return "reject";
    if (to === "Pending" && CLOSED.includes(from)) return "reopen";
    return null;
}

function actorCan(moveType: TypeOfMove, from: Status, to: Status, actor: Actor): boolean {
    if (actor === "system") {
        return (
            (from === "Quoted" && (to === "Confirmed" || to === "Cancelled")) ||
            (from === "Confirmed" && to === "Assigned")
        );
    }
    switch (moveType) {
        case "forward":
            return actor !== "staff" || STAFF_CAN_SET.includes(to);
        case "cancel":
            return actor !== "staff";
        default:
            return actor === "admin";
    }
}

// throws ConflictError for invalid moves, and ForbiddenError for unpermitted moves. also logs status changes
export function assertTransition(from: Status, to: Status, actor: Actor): string {
    const moveType = classifyMove(from, to);
    if (moveType === null) {
        throw new ConflictError(`A booking cannot move from ${from} to ${to}`);
    }
    if (!actorCan(moveType, from, to, actor)) {
        throw new ForbiddenError(`You are not allowed to move a booking from ${from} to ${to}`);
    }

    return `${from} -> ${to}`;
}

// lists the statuses this actor could move a booking to right now
export function allowedNext(from: Status, actor: Actor): Status[] {
    return ALL.filter((to) => {
        const moveType = classifyMove(from, to);
        return moveType !== null && actorCan(moveType, from, to, actor);
    });
}

