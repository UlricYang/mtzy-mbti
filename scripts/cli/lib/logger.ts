import {
  configure,
  getLogger,
  type Logger,
  type LogLevel,
  getConsoleSink,
  getAnsiColorFormatter,
  getJsonLinesFormatter,
} from "@logtape/logtape";
import { getFileSink } from "@logtape/file";
import { resolve } from "path";
import { mkdirSync, existsSync } from "fs";

let isConfigured = false;

export type { Logger, LogLevel };

export interface LoggerConfig {
  verbose?: boolean;
  logDir?: string;
  environment?: "development" | "production";
}

export function getIsProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function ensureLogDir(logDir: string): void {
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
}

export async function initLogger(config: LoggerConfig = {}): Promise<void> {
  if (isConfigured) {
    return;
  }

  const {
    verbose = false,
    logDir = "logs",
    environment = getIsProduction() ? "production" : "development",
  } = config;

  const isProduction = environment === "production";
  const lowestLevel: LogLevel = verbose ? "debug" : "info";

  const sinks: Record<string, ReturnType<typeof getConsoleSink>> = {
    console: getConsoleSink({
      formatter: isProduction ? getJsonLinesFormatter() : getAnsiColorFormatter(),
    }),
  };

  const loggers: Array<{
    category: string[];
    lowestLevel: LogLevel;
    sinks: string[];
    filters?: string[];
  }> = [];

  const absLogDir = resolve(logDir);
  ensureLogDir(absLogDir);

  sinks.file = getFileSink(resolve(absLogDir, "app.log"));
  sinks.errorFile = getFileSink(resolve(absLogDir, "error.log"));

    loggers.push({
      category: ["mtzy"],
      lowestLevel,
      sinks: ["console", "file"],
    },
    {
      category: ["mtzy", "error"],
      lowestLevel: "error",
      sinks: ["errorFile", "console"],
    }
  );

  await configure({
    sinks,
    loggers,
  });

  isConfigured = true;
}

export function createLogger(tag: string, category?: string[]): Logger {
  const fullCategory = category || ["mtzy", tag];
  return getLogger(fullCategory);
}

export const cliLogger = getLogger(["mtzy", "cli"]);
export const serverLogger = getLogger(["mtzy", "server"]);
export const httpLogger = getLogger(["mtzy", "server", "http"]);
export const previewLogger = getLogger(["mtzy", "preview"]);
export const exportLogger = getLogger(["mtzy", "export"]);
export const reportLogger = getLogger(["mtzy", "report"]);
export const errorLogger = getLogger(["mtzy", "error"]);

export { getLogger };
