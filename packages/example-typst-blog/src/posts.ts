import type { TypstCompiledModule } from "@typst-wasm/vite-plugin-typst";
import { z } from "zod";

const postModules = import.meta.glob<TypstCompiledModule>("./posts/*.typ", {
  eager: true,
  import: "default",
});

const slugMetadataSchema = z
  .array(
    z.object({
      label: z.literal("slug"),
      value: z
        .string()
        .regex(
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
          "use lowercase letters, numbers, and hyphens",
        ),
    }),
  )
  .length(1, "define exactly one slug")
  .transform(([entry]) => entry.value);

const getSlug = (file: string, document: TypstCompiledModule): string => {
  const result = slugMetadataSchema.safeParse(
    document.metadata?.custom.filter(
      (entry: { label?: string; value: unknown }) => entry.label === "slug",
    ) ?? [],
  );

  if (!result.success) {
    throw new Error(`${file}: ${z.prettifyError(result.error)}`);
  }

  return result.data;
};

export const posts = Object.entries(postModules).map(([file, document]) => ({
  slug: getSlug(file, document),
  document,
}));
