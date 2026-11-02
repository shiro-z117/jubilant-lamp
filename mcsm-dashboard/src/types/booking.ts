type BookingStatus =
    | "Pending"
    | "Quoted"
    | "Confirmed"
    | "Assigned"
    | "In Progress"
    | "Completed"
    | "Cancelled" // Cancelled represents that the customer has cancelled the booking (typically via declining their quote)
    | "Rejected"; // Rejected represents that an admin has rejected the customer's request

type StatusHistoryEntry = {
    status: BookingStatus;
    changedAt: string; // ISO date-time
    changedBy: string;
    note?: string;
};

type AssignmentStatus = "Assigned" | "Accepted" | "On the Way" | "Rejected";

// this should be a m:m join/relation table between staff and bookings in the database
type BookingAssignment = {
    staffId: string;
    status: AssignmentStatus;
};

/**
 * bookings are directly related to the following types:
 * Customer (customerId)
 * Service (serviceIds)
 * Staff (assignments)
 *
 * these types are related to bookings, but not directly:
 * MCNotification
 * Quotation
 * Payment
 */
export type Booking = {
    id: string;
    customerId: string;
    serviceIds: string[]; // references Service.id from the service types; array should never be empty
    assignments: BookingAssignment[]; // empty means no one is assigned
    staffRequired: number; // how many staff are needed for this booking; default 1
    scheduledAt: string; // ISO date-time
    address: string;
    propertySize: number; // by square feet
    accessNotes: string | null; // where to park and stuff like that
    specialNotes: string | null; // e.g. "give extra attention to the kitchen"
    pets: boolean;
    status: BookingStatus;
    statusHistory: StatusHistoryEntry[];
    createdAt: string; // ISO date-time
};