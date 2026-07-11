import type { TypstLogLevel, TypstLogger } from "./compiler/types";

const consoleLogger: TypstLogger = {
  log(level, message, context) {
    const method = level === "error" ? "error" : "debug";
    globalThis.console[method](message, context);
  },
};

export type ResolvedLogger = {
  readonly error: (message: string, context?: unknown) => void;
  readonly debug: (message: string, context?: unknown) => void;
};

export const resolveLogger = (
  logger: TypstLogger | undefined,
  logLevel: TypstLogLevel = "error",
): ResolvedLogger => {
  const target = logger ?? consoleLogger;
  const write = (level: TypstLogLevel, message: string, context?: unknown) => {
    if (level === "debug" && logLevel !== "debug") return;
    try {
      target.log(level, message, context);
    } catch (cause) {
      if (target === consoleLogger) return;
      try {
        globalThis.console.error("Typst logger failed", {
          cause,
          message,
          context,
        });
      } catch {
        // A hostile console must not obscure the original library error.
      }
    }
  };
  return {
    error: (message, context) => write("error", message, context),
    debug: (message, context) => write("debug", message, context),
  };
};
