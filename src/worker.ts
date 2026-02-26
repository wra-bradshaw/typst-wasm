import { SharedMemoryCommunication, SharedMemoryCommunicationStatus } from "./protocol";
import { isMainToWorkerMessage, type MainToWorkerMessage, type WorkerToMainMessage } from "./messages";
import init, { TypstCompiler, type InitOutput } from "./wasm";
import { Data, Effect } from "effect";

export type { MainToWorkerMessage, WorkerToMainMessage } from "./messages";

type WorkerRpcErrorCode = "COMPILER_NOT_INITIALIZED" | "INIT_FAILED" | "COMMAND_FAILED";

type WorkerRpcError = {
  code: WorkerRpcErrorCode;
  message: string;
  cause?: unknown;
};

type WorkerRpcResponse = Extract<WorkerToMainMessage, { requestId: number }>;

class WorkerCommandError extends Data.TaggedError("WorkerCommandError")<{
  readonly requestId: number;
  readonly code: WorkerRpcErrorCode;
  readonly message: string;
  readonly cause?: unknown;
}> {}

let compiler: TypstCompiler | null = null;
let sharedMemoryCommunication: SharedMemoryCommunication | null = null;
let wasmExports: InitOutput | null = null;

const MAX_FETCH_ATTEMPTS = 3;
const textDecoder = new TextDecoder();

const writeResultLength = (resultLenPtr: number, len: number) => {
  if (!wasmExports) {
    throw new Error("WASM exports not initialized");
  }

  new DataView(wasmExports.memory.buffer).setUint32(resultLenPtr, len, true);
};

const pathFromWasm = (pathPtr: number, pathLen: number): string => {
  if (!wasmExports) {
    throw new Error("WASM exports not initialized");
  }

  return textDecoder.decode(new Uint8Array(wasmExports.memory.buffer, pathPtr, pathLen));
};

const copyIntoWasm = (bytes: Uint8Array, resultLenPtr: number): number => {
  if (!wasmExports) {
    throw new Error("WASM exports not initialized");
  }

  const resultPtr = wasmExports.__wbindgen_malloc(bytes.length, 1);
  new Uint8Array(wasmExports.memory.buffer, resultPtr, bytes.length).set(bytes);
  writeResultLength(resultLenPtr, bytes.length);
  return resultPtr;
};

const hostFetch = (pathPtr: number, pathLen: number, resultLenPtr: number): number => {
  if (!sharedMemoryCommunication) {
    throw new Error("Communication buffer not initialized");
  }

  const path = pathFromWasm(pathPtr, pathLen);

  for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt += 1) {
    sharedMemoryCommunication.setStatus(SharedMemoryCommunicationStatus.Pending);
    self.postMessage({
      kind: "web_fetch",
      payload: { path },
    } as WorkerToMainMessage);

    const changed = sharedMemoryCommunication.waitForStatusChange(SharedMemoryCommunicationStatus.Pending, 30000);
    if (!changed) {
      continue;
    }

    if (sharedMemoryCommunication.getStatus() === SharedMemoryCommunicationStatus.Success) {
      return copyIntoWasm(sharedMemoryCommunication.getBuffer(), resultLenPtr);
    }
  }

  writeResultLength(resultLenPtr, 0);
  return 0;
};

const successResponse = (requestId: number, result: unknown): WorkerRpcResponse => ({
  requestId,
  result,
});

const errorResponse = (requestId: number, code: WorkerRpcErrorCode, message: string, cause?: unknown): WorkerRpcResponse => ({
  requestId,
  error: { code, message, cause } satisfies WorkerRpcError,
});

const ensureCompiler = (requestId: number): Effect.Effect<TypstCompiler, WorkerCommandError> =>
  compiler
    ? Effect.succeed(compiler)
    : Effect.fail(
        new WorkerCommandError({
          requestId,
          code: "COMPILER_NOT_INITIALIZED",
          message: "Compiler not initialized",
        }),
      );

const runCompilerCommand = <T>(requestId: number, commandName: string, run: (readyCompiler: TypstCompiler) => T): Effect.Effect<T, WorkerCommandError> =>
  Effect.gen(function* () {
    const readyCompiler = yield* ensureCompiler(requestId);
    return yield* Effect.try({
      try: () => run(readyCompiler),
      catch: (cause) =>
        new WorkerCommandError({
          requestId,
          code: "COMMAND_FAILED",
          message: `Worker command failed: ${commandName}`,
          cause,
        }),
    });
  });

self.onmessage = (e: MessageEvent) => {
  const data = e.data;
  if (!isMainToWorkerMessage(data)) {
    return;
  }

  const handleRequest = (request: MainToWorkerMessage): Effect.Effect<WorkerRpcResponse, WorkerCommandError> =>
    Effect.gen(function* () {
      switch (request.kind) {
        case "init": {
          sharedMemoryCommunication = SharedMemoryCommunication.hydrateObj(request.payload.sharedMemoryCommunication);

          wasmExports = yield* Effect.tryPromise({
            try: () =>
              init({
                module_or_path: request.payload.moduleOrPath,
                imports: {
                  bridge: {
                    host_fetch: hostFetch,
                  },
                },
              } as unknown as Parameters<typeof init>[0]),
            catch: (cause) =>
              new WorkerCommandError({
                requestId: request.requestId,
                code: "INIT_FAILED",
                message: "Failed to initialize WASM worker",
                cause,
              }),
          });

          compiler = new TypstCompiler();
          self.postMessage({ kind: "ready" } as WorkerToMainMessage);
          return successResponse(request.requestId, undefined);
        }
        case "add_file":
          yield* runCompilerCommand(request.requestId, "add_file", (readyCompiler) => {
            readyCompiler.add_file(request.payload.path, request.payload.data);
            return undefined;
          });
          return successResponse(request.requestId, undefined);
        case "add_source":
          yield* runCompilerCommand(request.requestId, "add_source", (readyCompiler) => {
            readyCompiler.add_source(request.payload.path, request.payload.text);
            return undefined;
          });
          return successResponse(request.requestId, undefined);
        case "add_font":
          yield* runCompilerCommand(request.requestId, "add_font", (readyCompiler) => {
            readyCompiler.add_font(request.payload.data);
            return undefined;
          });
          return successResponse(request.requestId, undefined);
        case "remove_file":
          yield* runCompilerCommand(request.requestId, "remove_file", (readyCompiler) => {
            readyCompiler.remove_file(request.payload.path);
            return undefined;
          });
          return successResponse(request.requestId, undefined);
        case "clear_files":
          yield* runCompilerCommand(request.requestId, "clear_files", (readyCompiler) => {
            readyCompiler.clear_files();
            return undefined;
          });
          return successResponse(request.requestId, undefined);
        case "set_main":
          yield* runCompilerCommand(request.requestId, "set_main", (readyCompiler) => {
            readyCompiler.set_main(request.payload.path);
            return undefined;
          });
          return successResponse(request.requestId, undefined);
        case "compile":
          return successResponse(
            request.requestId,
            yield* runCompilerCommand(request.requestId, "compile", (readyCompiler) => {
              const result = readyCompiler.compile();
              return {
                svg: result.svg ?? "",
                diagnostics: result.diagnostics,
              };
            }),
          );
        case "list_files":
          return successResponse(request.requestId, yield* runCompilerCommand(request.requestId, "list_files", (readyCompiler) => readyCompiler.list_files()));
        case "has_file":
          return successResponse(request.requestId, yield* runCompilerCommand(request.requestId, "has_file", (readyCompiler) => readyCompiler.has_file(request.payload.path)));
      }
    });

  Effect.runFork(
    handleRequest(data).pipe(
      Effect.match({
        onFailure: (error) => errorResponse(error.requestId, error.code, error.message, error.cause),
        onSuccess: (result) => result,
      }),
      Effect.tap((result) => Effect.sync(() => self.postMessage(result as WorkerToMainMessage))),
    ),
  );
};
