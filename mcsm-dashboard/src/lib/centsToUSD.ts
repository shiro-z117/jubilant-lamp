export default function centsToUSD(cents: number): string {
    if (!Number.isInteger(cents)) {
        throw new Error("cents must be an integer");
    }

    const sign = cents < 0 ? "-" : "";
    return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}