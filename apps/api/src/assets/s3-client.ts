import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface S3Env {
  AWS_ENDPOINT_URL?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
  AWS_S3_BUCKET?: string;
}

let cachedClient: S3Client | null = null;
let cachedBucket: string | null = null;

function readEnv(): S3Env {
  return process.env;
}

export function isUploadsConfigured(env: S3Env = readEnv()): boolean {
  return Boolean(
    env.AWS_ENDPOINT_URL &&
      env.AWS_ACCESS_KEY_ID &&
      env.AWS_SECRET_ACCESS_KEY &&
      env.AWS_S3_BUCKET,
  );
}

/** @public consumed via deep import by tools/seed/src/legacy-backfill (knip-ignored) */
export function getS3Client(): S3Client {
  if (cachedClient) return cachedClient;
  const env = readEnv();
  if (!isUploadsConfigured(env)) {
    throw new Error("S3 client requested but AWS_* env is not configured");
  }
  cachedClient = new S3Client({
    endpoint: env.AWS_ENDPOINT_URL,
    region: env.AWS_REGION ?? "auto",
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });
  cachedBucket = env.AWS_S3_BUCKET!;
  return cachedClient;
}

/** @public consumed via deep import by tools/seed/src/legacy-backfill (knip-ignored) */
export function getBucketName(): string {
  if (cachedBucket) return cachedBucket;
  const env = readEnv();
  if (!env.AWS_S3_BUCKET) throw new Error("AWS_S3_BUCKET is not configured");
  cachedBucket = env.AWS_S3_BUCKET;
  return cachedBucket;
}

export async function createPresignedPutUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 300,
): Promise<string> {
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export interface HeadResult {
  sizeBytes: number;
  contentType: string | null;
}

export async function headObject(key: string): Promise<HeadResult> {
  const client = getS3Client();
  const result = await client.send(new HeadObjectCommand({ Bucket: getBucketName(), Key: key }));
  return {
    sizeBytes: result.ContentLength ?? 0,
    contentType: result.ContentType ?? null,
  };
}

async function collectStream(stream: NodeJS.ReadableStream): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk as Uint8Array));
  }
  return new Uint8Array(Buffer.concat(chunks));
}

export async function getObjectBuffer(key: string): Promise<Uint8Array> {
  const client = getS3Client();
  const result = await client.send(new GetObjectCommand({ Bucket: getBucketName(), Key: key }));
  const body = result.Body;
  if (!body) throw new Error(`object ${key} has no body`);
  return collectStream(body as NodeJS.ReadableStream);
}

export interface ObjectWithMeta {
  body: Uint8Array;
  contentType: string | null;
}

export async function getObjectWithMeta(key: string): Promise<ObjectWithMeta> {
  const client = getS3Client();
  const result = await client.send(new GetObjectCommand({ Bucket: getBucketName(), Key: key }));
  const body = result.Body;
  if (!body) throw new Error(`object ${key} has no body`);
  return {
    body: await collectStream(body as NodeJS.ReadableStream),
    contentType: result.ContentType ?? null,
  };
}

export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  const client = getS3Client();
  await client.send(new DeleteObjectCommand({ Bucket: getBucketName(), Key: key }));
}

export async function copyObject(sourceKey: string, destinationKey: string): Promise<void> {
  const client = getS3Client();
  const bucket = getBucketName();
  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: destinationKey,
      CopySource: `${bucket}/${encodeURIComponent(sourceKey)}`,
    }),
  );
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    await headObject(key);
    return true;
  } catch {
    return false;
  }
}

export async function listObjectsByPrefix(prefix: string): Promise<string[]> {
  const client = getS3Client();
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: getBucketName(),
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    for (const object of page.Contents ?? []) {
      if (object.Key) keys.push(object.Key);
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}
