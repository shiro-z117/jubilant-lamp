import Link from "next/link";

type Props = {
  page: number;
  limit: number;
  total: number;
  basePath: string;
  params: Record<string, string>;
};

const linkClass =
  "rounded-md border border-input px-3 py-1.5 text-sm hover:border-primary";
const disabledClass =
  "rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground opacity-60";

export default function Pagination({
  page,
  limit,
  total,
  basePath,
  params,
}: Props) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;

  const href = (p: number) => {
    const query = new URLSearchParams(params);
    query.set("page", String(p));
    return `${basePath}?${query}`;
  };

  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex items-center justify-between gap-3"
    >
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkClass}>
          Previous
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClass}>
          Previous
        </span>
      )}
      <span className="text-sm text-muted-foreground">
        Page {page} of {pages} ({total} total)
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className={linkClass}>
          Next
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClass}>
          Next
        </span>
      )}
    </nav>
  );
}
