import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const createRouter = () =>
  createTanStackRouter({
    routeTree,
    scrollRestoration: true,
  });

export const getRouter = async () => createRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
