import { HeadContent, Outlet, Scripts, createRootRoute, Link } from "@tanstack/react-router";
import { posts } from "../posts";
import "../styles.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Typst blog" },
    ],
  }),
  notFoundComponent: () => (
    <section className="rounded-md border border-stone-300 bg-white p-5">
      <h2 className="text-xl font-semibold text-stone-950">Post not found</h2>
      <p className="mt-2 text-sm text-stone-600">No blog post has that slug.</p>
    </section>
  ),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
            <nav className="rounded-md border border-stone-300 bg-white p-3">
              <h1 className="mb-3 text-sm font-semibold text-stone-950">
                <Link to="/">Typst blog</Link>
              </h1>
              <div className="grid gap-2">
                {posts.map((post) => (
                  <Link
                    activeProps={{ className: "border-stone-950 bg-stone-950 text-white" }}
                    className="rounded border border-stone-300 bg-white px-3 py-2 text-left text-sm text-stone-800"
                    key={post.slug}
                    params={{ slug: post.slug }}
                    to="/posts/$slug"
                  >
                    {post.document.metadata?.title ?? post.slug}
                  </Link>
                ))}
              </div>
            </nav>
            <Outlet />
          </div>
        </main>
        <Scripts />
      </body>
    </html>
  );
}
