import { getDb } from "@kytelink/db";
import { getRedis } from "../redis";
import { PrismaStore } from "./prisma-store";

let store: PrismaStore | undefined;

export function getRealStore(): PrismaStore {
  store ??= new PrismaStore(getDb(), getRedis());
  return store;
}
