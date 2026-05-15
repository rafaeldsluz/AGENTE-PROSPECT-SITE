import pino from "pino";
import { config } from "../config/index.js";

const pinoOptions = {
  level: config.app.logLevel,
  ...(config.app.isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:HH:MM:ss",
        ignore: "pid,hostname",
      },
    },
  }),
};

export const logger = pino(pinoOptions);

export function createModuleLogger(module: string) {
  return logger.child({ module });
}
