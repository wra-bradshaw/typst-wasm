import { registerHostFetch } from "@typst-wasm/engine-wasm/bridge";
import {
  SharedMemoryCommunication,
  SharedMemoryCommunicationStatus,
} from "./protocol";
import {
  isMainToWorkerMessage,
  type MainToWorkerMessage,
  type WorkerToMainMessage,
} from "./messages";
import {
  loadWasmModule,
  type InitOutput,
  type TypstCompilerInstance,
} from "./wasm";

export type { MainToWorkerMessage, WorkerToMainMessage } from "./messages";

type WorkerRpcErrorCode =
  | "COMPILER_NOT_INITIALIZED"
  | "INIT_FAILED"
  | "COMMAND_FAILED";

type WorkerRpcError = {
  code: WorkerRpcErrorCode;
  message: string;
  cause?: unknown;
};

type WorkerRpcResponse = Extract<WorkerToMainMessage, { requestId: number }>;

class WorkerCommandError extends Error {
  constructor(
    readonly requestId: number,
    readonly code: WorkerRpcErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "WorkerCommandError";
  }
}

const toWorkerCommandError = (
  error: unknown,
  requestId: number,
): WorkerCommandError =>
  error instanceof WorkerCommandError
    ? error
    : new WorkerCommandError(
        requestId,
        "COMMAND_FAILED",
        "Unhandled worker command failure",
        error,
      );

let compiler: TypstCompilerInstance | null = null;
let sharedMemoryCommunication: SharedMemoryCommunication | null = null;
let wasmExports: InitOutput | null = null;

const MAX_FETCH_ATTEMPTS = 3;
const textDecoder = new TextDecoder();
const WORKER_HOST_ID = 1;

const writeResultLength = (resultLenPtr: number, len: number): void => {
  if (!wasmExports) {
    throw new Error("WASM exports not initialized");
  }

  new DataView(wasmExports.memory.buffer).setUint32(resultLenPtr, len, true);
};

const pathFromWasm = (pathPtr: number, pathLen: number): string => {
  if (!wasmExports) {
    throw new Error("WASM exports not initialized");
  }

  return textDecoder.decode(
    new Uint8Array(wasmExports.memory.buffer, pathPtr, pathLen),
  );
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

const hostFetch = (
  pathPtr: number,
  pathLen: number,
  resultLenPtr: number,
): number => {
  if (!sharedMemoryCommunication) {
    throw new Error("Communication buffer not initialized");
  }

  const path = pathFromWasm(pathPtr, pathLen);

  for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt += 1) {
    sharedMemoryCommunication.setStatus(
      SharedMemoryCommunicationStatus.Pending,
    );
    self.postMessage({
      kind: "web_fetch",
      payload: { path },
    } satisfies WorkerToMainMessage);

    const changed = sharedMemoryCommunication.waitForStatusChange(
      SharedMemoryCommunicationStatus.Pending,
      30000,
    );
    if (!changed) {
      continue;
    }

    if (
      sharedMemoryCommunication.getStatus() ===
      SharedMemoryCommunicationStatus.Success
    ) {
      return copyIntoWasm(sharedMemoryCommunication.getBuffer(), resultLenPtr);
    }
  }

  writeResultLength(resultLenPtr, 0);
  return 0;
};

const successResponse = (
  requestId: number,
  result: unknown,
): WorkerRpcResponse => ({
  requestId,
  result,
});

const errorResponse = (
  requestId: number,
  code: WorkerRpcErrorCode,
  message: string,
  cause?: unknown,
): WorkerRpcResponse => ({
  requestId,
  error: { code, message, cause } satisfies WorkerRpcError,
});

const ensureCompiler = (requestId: number): TypstCompilerInstance => {
  if (compiler) return compiler;
  throw new WorkerCommandError(
    requestId,
    "COMPILER_NOT_INITIALIZED",
    "Compiler not initialized",
  );
};

const runCompilerCommand = <T>(
  requestId: number,
  commandName: string,
  run: (readyCompiler: TypstCompilerInstance) => T,
): T => {
  const readyCompiler = ensureCompiler(requestId);
  try {
    return run(readyCompiler);
  } catch (cause) {
    throw new WorkerCommandError(
      requestId,
      "COMMAND_FAILED",
      `Worker command failed: ${commandName}`,
      cause,
    );
  }
};

const handleRequest = async (
  request: MainToWorkerMessage,
): Promise<WorkerRpcResponse> => {
  switch (request.kind) {
    case "init": {
      sharedMemoryCommunication = SharedMemoryCommunication.hydrateObj(
        request.payload.sharedMemoryCommunication,
      );
      let wasmModule: Awaited<ReturnType<typeof loadWasmModule>>;
      try {
        wasmModule = await loadWasmModule();
      } catch (cause) {
        throw new WorkerCommandError(
          request.requestId,
          "INIT_FAILED",
          "Failed to load WASM module",
          cause,
        );
      }

      try {
        registerHostFetch(WORKER_HOST_ID, hostFetch);
        void request.payload.moduleOrPath;
        wasmExports = wasmModule;
        compiler = new wasmModule.TypstCompiler(WORKER_HOST_ID);
      } catch (cause) {
        throw new WorkerCommandError(
          request.requestId,
          "INIT_FAILED",
          "Failed to initialize WASM worker",
          cause,
        );
      }

      return successResponse(request.requestId, undefined);
    }
    case "add_file":
      runCompilerCommand(request.requestId, "add_file", (readyCompiler) => {
        readyCompiler.add_file(request.payload.path, request.payload.data);
      });
      return successResponse(request.requestId, undefined);
    case "add_source":
      runCompilerCommand(request.requestId, "add_source", (readyCompiler) => {
        readyCompiler.add_source(request.payload.path, request.payload.text);
      });
      return successResponse(request.requestId, undefined);
    case "add_font":
      runCompilerCommand(request.requestId, "add_font", (readyCompiler) => {
        readyCompiler.add_font(request.payload.data);
      });
      return successResponse(request.requestId, undefined);
    case "remove_file":
      runCompilerCommand(request.requestId, "remove_file", (readyCompiler) => {
        readyCompiler.remove_file(request.payload.path);
      });
      return successResponse(request.requestId, undefined);
    case "clear_files":
      runCompilerCommand(request.requestId, "clear_files", (readyCompiler) => {
        readyCompiler.clear_files();
      });
      return successResponse(request.requestId, undefined);
    case "set_main":
      runCompilerCommand(request.requestId, "set_main", (readyCompiler) => {
        readyCompiler.set_main(request.payload.path);
      });
      return successResponse(request.requestId, undefined);
    case "compile":
      return successResponse(
        request.requestId,
        runCompilerCommand(request.requestId, "compile", (readyCompiler) =>
          readyCompiler.compile(request.payload.options),
        ),
      );
    case "list_files":
      return successResponse(
        request.requestId,
        runCompilerCommand(request.requestId, "list_files", (readyCompiler) =>
          readyCompiler.list_files(),
        ),
      );
    case "has_file":
      return successResponse(
        request.requestId,
        runCompilerCommand(request.requestId, "has_file", (readyCompiler) =>
          readyCompiler.has_file(request.payload.path),
        ),
      );
  }
};

self.onmessage = (event: MessageEvent) => {
  const data = event.data;
  if (!isMainToWorkerMessage(data)) {
    return;
  }

  void handleRequest(data)
    .catch((error) => {
      const commandError = toWorkerCommandError(error, data.requestId);
      return errorResponse(
        commandError.requestId,
        commandError.code,
        commandError.message,
        commandError.cause,
      );
    })
    .then((result) => {
      self.postMessage(result);
    });
};
