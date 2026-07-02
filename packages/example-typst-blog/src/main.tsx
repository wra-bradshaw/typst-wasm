import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { posts } from "./posts";
import "./styles.css";

function App() {
  const [slug, setSlug] = useState(posts[0]?.slug ?? "");
  const selected = useMemo(
    () => posts.find((post) => post.slug === slug) ?? posts[0],
    [slug],
  );

  if (!selected) return null;

  const title = selected.document.metadata?.title ?? selected.slug;
  const description = selected.document.metadata?.description;

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav className="rounded-md border border-stone-300 bg-white p-3">
          <h1 className="mb-3 text-sm font-semibold text-stone-950">
            Typst blog
          </h1>
          <div className="grid gap-2">
            {posts.map((post) => {
              const postTitle = post.document.metadata?.title ?? post.slug;
              return (
                <button
                  className={`rounded border px-3 py-2 text-left text-sm ${
                    post.slug === selected.slug
                      ? "border-stone-950 bg-stone-950 text-white"
                      : "border-stone-300 bg-white text-stone-800"
                  }`}
                  key={post.slug}
                  type="button"
                  onClick={() => setSlug(post.slug)}
                >
                  {postTitle}
                </button>
              );
            })}
          </div>
        </nav>

        <article className="rounded-md border border-stone-300 bg-white">
          <header className="border-b border-stone-200 px-5 py-4">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500">
              Built with vite-plugin-typst
            </p>
            <h2 className="text-xl font-semibold text-stone-950">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-stone-600">{description}</p>
            ) : null}
          </header>
          <div
            className="post-body p-5"
            dangerouslySetInnerHTML={{ __html: selected.document.html }}
          />
        </article>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
