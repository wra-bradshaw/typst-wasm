import { expect } from "@std/expect";
import type { CanonicalCase } from "../types.ts";
// Every matrix cell intentionally runs both backend-selection cases. This
// validates the complete cross-backend contract, while unsupported backends
// report a passing rejection for hosts that cannot provide them.
export const backendCases: readonly CanonicalCase[] = [
  {
    id: "backend.forced-worker",
    isolation: "fresh",
    run: async (context) => {
      // Workerd intentionally has no worker backend; this case verifies the
      // explicit rejection rather than allowing an automatic fallback.
      if (context.runtime === "workerd") {
        let rejected = false;
        try {
          await context.createCompiler({ backend: "worker" });
        } catch {
          rejected = true;
        }
        expect(rejected).toBe(true);
        return;
      }
      // Selection is observed from the runtime's selector, not assigned by
      // the adapter. Construction below then proves the selected path works.
      expect(context.selectBackend({ backend: "worker" })).toBe("worker");
      const compiler = await context.createCompiler({ backend: "worker" });
      try {
        await compiler.addSource("main.typ", "= Backend");
        await compiler.setMain("main.typ");
        const result = await compiler.compile({
          main: "main.typ",
          format: "svg",
        });
        expect(result.pages.length).toBeGreaterThan(0);
      } finally {
        await compiler.dispose();
      }
    },
  },
  {
    id: "backend.forced-jspi",
    isolation: "fresh",
    run: async (context) => {
      if (context.selectBackend({ backend: "jspi" }) !== "jspi") {
        await context.expectUnsupportedBackend();
        return;
      }
      expect(context.selectBackend({ backend: "jspi" })).toBe("jspi");
      await context.withCompiler(
        async (compiler) => {
          await compiler.addSource("main.typ", "= JSPI");
          await compiler.setMain("main.typ");
          expect(
            (await compiler.compile({ format: "svg" })).pages.length,
          ).toBeGreaterThan(0);
        },
        { backend: "jspi" },
      );
    },
  },
  {
    id: "backend.no-fallback",
    isolation: "fresh",
    run: async (context) => {
      expect(context.selectBackend({ backend: context.backend })).toBe(
        context.backend,
      );
      if (context.runtime === "workerd") {
        await context.expectUnsupportedBackend();
      }
    },
  },
];
