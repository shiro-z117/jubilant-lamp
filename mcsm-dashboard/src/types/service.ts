type PricingType = "fixed" | "hourly" | "quote";

export type Service = {
    id: string;
    title: string;
    pricingType: PricingType;
    basePrice: number | null; // null should only be for when pricingType is "quote"
};