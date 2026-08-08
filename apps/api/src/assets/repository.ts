import type { AssetKind } from "@kytelink/schemas";
import type { Store, StoredAsset } from "../store/store";

export type AssetRow = StoredAsset;

export interface PendingUpload {
  assetId: string;
  kyteId: string;
  uploadedById: string;
  kind: Extract<AssetKind, "AVATAR" | "LINK_IMAGE">;
  contentType: string;
  declaredSizeBytes: number;
  rawKey: string;
  createdAt: Date;
}

/**
 * Persistent Asset rows live in Postgres via the Store's asset CRUD. Only
 * in-flight pre-finalize uploads — which are
 * ephemeral and never need to survive a restart — are held in memory here,
 * keyed by Store identity so each seeded/test store gets an isolated view.
 */
export class AssetsRepository {
  private readonly pendingUploads = new Map<string, PendingUpload>();

  constructor(private readonly store: Store) {}

  createPendingUpload(input: PendingUpload): void {
    this.pendingUploads.set(input.assetId, input);
  }

  peekPendingUpload(assetId: string): PendingUpload | undefined {
    return this.pendingUploads.get(assetId);
  }

  takePendingUpload(assetId: string): PendingUpload | undefined {
    const found = this.pendingUploads.get(assetId);
    if (found) this.pendingUploads.delete(assetId);
    return found;
  }

  async insertAsset(row: AssetRow): Promise<void> {
    await this.store.insertAsset(row);
  }

  async removeAsset(assetId: string): Promise<AssetRow | undefined> {
    return (await this.store.removeAsset(assetId)) ?? undefined;
  }

  async getAsset(assetId: string): Promise<AssetRow | undefined> {
    return (await this.store.getAsset(assetId)) ?? undefined;
  }

  async listForKyte(kyteId: string): Promise<AssetRow[]> {
    return this.store.listAssetsForKyte(kyteId);
  }

  async findOgAssetForKyte(kyteId: string): Promise<AssetRow | undefined> {
    return (await this.store.findOgAsset(kyteId)) ?? undefined;
  }

  async sumSizeBytesForOrg(orgId: string): Promise<number> {
    return this.store.sumAssetSizeForOrg(orgId);
  }
}

const repositoriesByStore = new WeakMap<Store, AssetsRepository>();

export function repositoryFor(store: Store): AssetsRepository {
  let repository = repositoriesByStore.get(store);
  if (!repository) {
    repository = new AssetsRepository(store);
    repositoriesByStore.set(store, repository);
  }
  return repository;
}
