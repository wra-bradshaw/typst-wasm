import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from "@tanstack/react-start";

const crossOriginIsolationMiddleware = createMiddleware().server(
  async ({ next }) => {
    const result = await next();

    result.response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    result.response.headers.set("Cross-Origin-Embedder-Policy", "require-corp");

    return result;
  },
);

const csrfMiddleware = createCsrfMiddleware({
  filter: ({ handlerType }) => handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [crossOriginIsolationMiddleware, csrfMiddleware],
}));
