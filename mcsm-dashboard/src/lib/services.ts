import type { Service } from "@/types/service";
import centsToUSD from "./centsToUSD";

// these services are copied from the micro-clean booking site
// we could change it to instead have service types pulled from the api and allowing admins to add, modify, and enable/disable certain service types, but that is not within the scope of this project
// basePrice: null should only be for when pricingType is "quote"
// all basePrice values are in US cents (e.g. $10.00 is 1000 cents)
export const SERVICES: Service[] = [
    { id: "basic", title: "Basic Cleaning", pricingType: "hourly", basePrice: 4000 },
    { id: "deep", title: "Deep Cleaning", pricingType: "hourly", basePrice: 7000 },
    { id: "mattress", title: "Mattress Cleaning", pricingType: "hourly", basePrice: 3500 },
    { id: "sofa", title: "Sofa Cleaning", pricingType: "hourly", basePrice: 3000 },
    { id: "renovation", title: "Post-Renovation", pricingType: "quote", basePrice: null },
    { id: "move-in", title: "Move-In Cleaning", pricingType: "quote", basePrice: null },
    { id: "move-out", title: "Move-Out Cleaning", pricingType: "quote", basePrice: null },
    { id: "office", title: "Office / Commercial", pricingType: "hourly", basePrice: 9000 },
    { id: "other", title: "Other Cleaning", pricingType: "quote", basePrice: null },
];

export function getServiceById(id: string): Service | undefined {
    return SERVICES.find((s) => s.id === id);
}

export function formatServicePrice(service: Service): string {
    switch (service.pricingType) {
        case "fixed":
            // fallbacks are just to keep the compiler happy, they should never actually be used since the price data is already set right here
            return `From ${centsToUSD(service.basePrice ?? 0)}`;
        case "hourly":
            return `${centsToUSD(service.basePrice ?? 0)} / cleaner / hour`;
        case "quote":
            return "Quotation";
    }
}