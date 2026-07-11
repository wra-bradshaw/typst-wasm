import { describe, expect, it, vi } from "vitest";
import { resolveLogger } from "./logging";

describe("logging", () => {
  it("reports errors by default and filters debug messages", () => {
    const log = vi.fn();
    const logger = resolveLogger({ log });

    logger.error("failure");
    logger.debug("details");

    expect(log).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith("error", "failure", undefined);
  });

  it("enables debug messages at the debug level", () => {
    const log = vi.fn();
    const logger = resolveLogger({ log }, "debug");

    logger.debug("details", { requestId: 1 });

    expect(log).toHaveBeenCalledWith("debug", "details", { requestId: 1 });
  });

  it("falls back to the console when a custom logger throws", () => {
    const error = vi
      .spyOn(globalThis.console, "error")
      .mockImplementation(() => undefined);
    const logger = resolveLogger({
      log: () => {
        throw new Error("logger failed");
      },
    });

    logger.error("failure");

    expect(error).toHaveBeenCalledWith("Typst logger failed", {
      cause: expect.any(Error),
      message: "failure",
      context: undefined,
    });
    error.mockRestore();
  });
});
