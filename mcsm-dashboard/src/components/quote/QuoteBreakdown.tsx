import centsToUSD from "@/lib/centsToUSD";
import type { getQuotation } from "@/services/quotationService";

type Breakdown = Awaited<ReturnType<typeof getQuotation>>["breakdown"];

function Row({
  label,
  amount,
  strong = false,
}: {
  label: string;
  amount: string;
  strong?: boolean;
}) {
  return (
    <tr className={strong ? "border-t border-border font-semibold" : ""}>
      <th scope="row" className="py-2 pr-4 text-left font-normal">
        {label}
      </th>
      <td className={`py-2 text-right ${strong ? "text-lg" : ""}`}>{amount}</td>
    </tr>
  );
}

export default function QuoteBreakdown({
  breakdown: b,
}: {
  breakdown: Breakdown;
}) {
  return (
    <table className="w-full">
      <caption className="sr-only">Quote breakdown</caption>
      <tbody>
        {b.services.map((s) => (
          <Row key={s.serviceId} label={s.title} amount={centsToUSD(s.price)} />
        ))}
        {b.addOns.map((a, i) => (
          <Row
            key={`${a.description}-${i}`}
            label={a.description}
            amount={centsToUSD(a.amount)}
          />
        ))}
        <Row label="Subtotal" amount={centsToUSD(b.subtotal)} strong />
        {b.appliedDiscount > 0 && (
          <Row label="Discount" amount={centsToUSD(-b.appliedDiscount)} />
        )}
        <Row
          label={`Tax (${+(b.taxRate * 100).toFixed(2)}%)`}
          amount={centsToUSD(b.tax)}
        />
        <Row label="Total" amount={centsToUSD(b.total)} strong />
      </tbody>
    </table>
  );
}
