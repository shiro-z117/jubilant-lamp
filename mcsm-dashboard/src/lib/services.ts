import type { Service } from "@/types/service";

const CURRENCY = "$";

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

// TODO: change this to convert the cents values into dollar format (e.g. 1000 -> $10.00)
export function formatServicePrice(service: Service): string {
    switch (service.pricingType) {
        case "fixed":
            return `From ${CURRENCY}${service.basePrice}`;
        case "hourly":
            return `${CURRENCY}${service.basePrice} / cleaner / hour`;
        case "quote":
            return "Quotation";
    }
}