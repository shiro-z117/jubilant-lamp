type PricingType = "fixed" | "hourly" | "quote";

export type Service = {
    id: string;
    title: string;
    pricingType: PricingType;
    basePrice: number | null; // in US cents (e.g. $10.00 is 1000 cents); null should only be for when pricingType is "quote"
};