import { PrismaClient } from "./generated/client/index.js";

let client: PrismaClient | undefined;

export function getDb(): PrismaClient {
  client ??= new PrismaClient();
  return client;
}
