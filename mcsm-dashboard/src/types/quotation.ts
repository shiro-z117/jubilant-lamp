type QuotationStatus = "Draft" | "Sent" | "Accepted" | "Rejected" | "Expired";

type QuoteServiceLine = {
    serviceId: string; // references Service.id
    price: number; // in US cents (e.g. $10.00 is 1000 cents); this is manually input for quotation-priced services, and autofilled if there is a preset base price
};

// basically the same as QuoteServiceLine but for extra stuff not covered by the service types
type QuoteLineItem = {
    description: string;
    amount: number; // in US cents (e.g. $10.00 is 1000 cents)
};

export type Quotation = {
    id: string;
    bookingId: string;
    token: string; // unguessable string used in the public quote-acceptance URL
    services: QuoteServiceLine[];
    addOns: QuoteLineItem[];
    discount: number; // in US cents (e.g. $10.00 is 1000 cents); subtracted from the subtotal; actual discount amount, not a percentage
    taxRate: number; // a decimal representing a percentage which is then calculated towards the total, after the discount
    total: number; // in US cents (e.g. $10.00 is 1000 cents)
    expiresAt: string; // ISO date-time
    notes: string | null;
    status: QuotationStatus;
    createdAt: string; // ISO date-time
};