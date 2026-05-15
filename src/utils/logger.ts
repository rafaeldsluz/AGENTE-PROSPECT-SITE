import pino from "pino";
import { config } from "../config/index.js";

export const logger = pino({
  level: config.app.logLevel,
  transport: config.app.isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:HH:MM:ss",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});

export function createModuleLogger(module: string) {
  return logger.child({ module });
}
