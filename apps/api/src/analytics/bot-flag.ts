import { isBot } from "ua-parser-js/bot-detection";
import type { BotFlag } from "@kytelink/clickhouse";

export function resolveBotFlag(userAgent: string | undefined): BotFlag {
  if (!userAgent) return 1;
  return isBot(userAgent) ? 1 : 0;
}
