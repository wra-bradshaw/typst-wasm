import { createFileRoute, notFound } from "@tanstack/react-router";
import { posts } from "../posts";

export const Route = createFileRoute("/posts/$slug")({
  loader: ({ params }) => {
    const post = posts.find((candidate) => candidate.slug === params.slug);
    if (!post) throw notFound();
    return post;
  },
  component: PostPage,
});

function PostPage() {
  const post = Route.useLoaderData();
  const title = post.document.metadata?.title ?? post.slug;
  const description = post.document.metadata?.description;

  return (
    <article className="rounded-md border border-stone-300 bg-white">
      <header className="border-b border-stone-200 px-5 py-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500">
          Built with vite-plugin-typst
        </p>
        <h2 className="text-xl font-semibold text-stone-950">{title}</h2>
        {description ? <p className="mt-1 text-sm text-stone-600">{description}</p> : null}
      </header>
      <div
        className="prose prose-stone max-w-none p-5 [&_svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: post.document.html }}
      />
    </article>
  );
}
