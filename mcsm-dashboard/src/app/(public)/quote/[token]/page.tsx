import { notFound } from "next/navigation";
import Card from "@/components/ui/Card";
import QuoteActions from "@/components/quote/QuoteActions";
import { NotFoundError } from "@/lib/apiResponse";
import centsToUSD from "@/lib/centsToUSD";
import { getQuoteByToken } from "@/services/quotationService";

// shown instead of the buttons once the quote is no longer waiting for an answer
const ANSWERED: Record<string, string> = {
  Accepted: "You accepted this quote. Your booking is confirmed.",
  Rejected: "You declined this quote, and the booking has been cancelled.",
  Expired: "This quote has expired. Please contact us for a new one.",
};

async function loadQuote(token: string) {
  try {
    return await getQuoteByToken(token);
  } catch (error) {
    if (error instanceof NotFoundError) notFound(); // an unknown token shows the 404 page
    throw error;
  }
}

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

const dateTime = (d: Date) =>
  d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export default async function QuotePage(props: PageProps<"/quote/[token]">) {
  const { token } = await props.params;
  const quote = await loadQuote(token);
  const b = quote.breakdown;

  return (
    <div className="flex flex-col gap-4">
      <Card title={`Quote for booking ${quote.bookingId}`}>
        <dl className="mb-6 grid gap-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
          <dt className="text-muted-foreground">Customer</dt>
          <dd>{quote.customerName}</dd>
          <dt className="text-muted-foreground">Address</dt>
          <dd>{quote.address}</dd>
          <dt className="text-muted-foreground">Scheduled</dt>
          <dd>{dateTime(quote.scheduledAt)}</dd>
          <dt className="text-muted-foreground">Quote valid until</dt>
          <dd>{dateTime(quote.expiresAt)}</dd>
        </dl>

        <table className="w-full">
          <caption className="sr-only">Quote breakdown</caption>
          <tbody>
            {b.services.map((s) => (
              <Row
                key={s.serviceId}
                label={s.title}
                amount={centsToUSD(s.price)}
              />
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

        {quote.notes && (
          <p className="mt-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Notes: </span>
            {quote.notes}
          </p>
        )}

        <div className="mt-6">
          {quote.status === "Sent" ? (
            <QuoteActions token={token} />
          ) : (
            <p role="status" className="rounded-md bg-muted px-3 py-2 text-sm">
              {ANSWERED[quote.status] ??
                `This quote is ${quote.status.toLowerCase()}.`}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
