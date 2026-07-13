import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  return (
    <section className="rounded-md border border-stone-300 bg-white p-5">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500">
        Built with vite-plugin-typst
      </p>
      <h2 className="text-xl font-semibold text-stone-950">Typst blog</h2>
      <p className="mt-2 text-sm text-stone-600">Choose a post to read.</p>
    </section>
  );
}
