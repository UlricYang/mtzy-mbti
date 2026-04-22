import { AsyncLocalStorage } from "node:async_hooks";

interface RequestContext {
  requestId: string;
  startTime: number;
  studentId?: string;
}

const requestContext = new AsyncLocalStorage<RequestContext>();

export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

export function setRequestContext(
  requestId: string,
  studentId?: string
): RequestContext {
  return {
    requestId,
    startTime: Date.now(),
    studentId,
  };
}

export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}

export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

export function getRequestDuration(): number | undefined {
  const ctx = requestContext.getStore();
  if (!ctx) return undefined;
  return Date.now() - ctx.startTime;
}

export function getLogContext(): Record<string, unknown> {
  const ctx = requestContext.getStore();
  if (!ctx) return {};

  const result: Record<string, unknown> = {
    requestId: ctx.requestId,
    durationMs: Date.now() - ctx.startTime,
  };

  if (ctx.studentId) {
    result.studentId = ctx.studentId;
  }

  return result;
}

export { requestContext };
