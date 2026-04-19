export interface Logger {
  verbose: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function createLogger(verbose: boolean, tag: string): Logger {
  const timestamp = () => {
    const now = new Date();
    return now.toLocaleTimeString('zh-CN', { hour12: false });
  };

  const prefix = (level: string) => `\x1b[90m[${timestamp()}]\x1b[0m \x1b[1m[${tag}]\x1b[0m ${level}`;

  return {
    verbose: (...args: unknown[]) => {
      if (verbose) {
        console.log(prefix('\x1b[90m[verbose]\x1b[0m'), ...args);
      }
    },
    info: (...args: unknown[]) => {
      console.log(prefix('\x1b[34m[info]\x1b[0m'), ...args);
    },
    warn: (...args: unknown[]) => {
      console.warn(prefix('\x1b[33m[warn]\x1b[0m'), ...args);
    },
    error: (...args: unknown[]) => {
      console.error(prefix('\x1b[31m[error]\x1b[0m'), ...args);
    }
  };
}


