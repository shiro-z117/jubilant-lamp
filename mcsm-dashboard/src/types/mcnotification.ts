type NotificationType =
    | "BookingRequested"
    | "QuoteAccepted"
    | "PaymentReceived"
    | "StaffAccepted"
    | "StaffRejected"
    | "StaffAssigned" // "you have been assigned to a new booking: [booking]. please accept or reject it"
    | "BookingCompleted"
    | "BookingCancelled";

export type MCNotification = {
    id: string;
    userId: string; // recipient (notifications track read state, so if the same notification is sent to multiple people it should be duplicated for each recipient, exactly one recipient per notification item)
    type: NotificationType;
    bookingId: string; // all notifications are in some relation to a booking
    message: string;
    isRead: boolean;
    createdAt: string; // ISO date-time
};