type PaymentMethod = "Card" | "Cash" | "Bank Transfer";

type PaymentStatus = "Pending" | "Paid" | "Failed" | "Refunded";

export type Payment = {
    id: string;
    bookingId: string;
    amount: number; // in US cents (e.g. $10.00 is 1000 cents)
    method: PaymentMethod;
    status: PaymentStatus;
    paidAt: string | null; // ISO date-time, null until paid
    createdAt: string; // ISO date-time
};