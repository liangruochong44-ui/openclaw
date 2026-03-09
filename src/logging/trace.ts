import { AsyncLocalStorage } from "node:async_hooks";

export interface TraceContext {
  traceId: string;
  requestId?: string;
  spanId?: string;
}

const traceStorage = new AsyncLocalStorage<TraceContext>();

/**
 * Generate a unique trace ID (16 char hex string)
 */
export function generateTraceId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Get current trace context, returns undefined if not in a traced context
 */
export function getCurrentTrace(): TraceContext | undefined {
  return traceStorage.getStore();
}

/**
 * Get current trace ID or generate a new one if not in a traced context
 */
export function getTraceId(): string {
  const ctx = traceStorage.getStore();
  return ctx?.traceId ?? generateTraceId();
}

/**
 * Run a function within a new trace context
 */
export function runWithTrace<T>(fn: () => T): T;
export function runWithTrace<T>(traceId: string, fn: () => T): T;
export function runWithTrace<T>(traceOrFn: (() => T) | string, fn?: () => T): T {
  const traceId = typeof traceOrFn === "string" ? traceOrFn : generateTraceId();
  const runFn = typeof traceOrFn === "function" ? traceOrFn : fn!;

  return traceStorage.run({ traceId }, runFn);
}

/**
 * Run a function within an existing trace context (propagated from parent)
 */
export function runInTrace<T>(ctx: TraceContext, fn: () => T): T {
  return traceStorage.run(ctx, fn);
}

/**
 * Get all log fields for current trace (for inclusion in log output)
 */
export function getTraceFields(): Record<string, string> {
  const ctx = traceStorage.getStore();
  if (!ctx) {
    return {};
  }
  return {
    traceId: ctx.traceId,
    ...(ctx.requestId && { requestId: ctx.requestId }),
    ...(ctx.spanId && { spanId: ctx.spanId }),
  };
}
