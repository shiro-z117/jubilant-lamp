export default function Home() {
  return (
    <div>
      <main>
        "mock customer quote-acceptance screen". this page should be ignored by
        authGuard. the [token] matches the internal token associated with a
        particular quotation, so that a user may access this page without a
        login while still maintaining security via the token (and therefore the
        URL) being functionally unguessable.
      </main>
    </div>
  );
}
