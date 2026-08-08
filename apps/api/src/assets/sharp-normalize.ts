import sharp from "sharp";
import { assertIsImage } from "./magic-bytes";

export type NormalizeKind = "avatar" | "link_image";

type NormalizedImage = {
  buffer: Uint8Array;
  contentType: string;
  ext: string;
  width: number;
  height: number;
  sizeBytes: number;
};

export type NormalizeResult = {
  main: NormalizedImage;
  lqip: NormalizedImage;
};

export interface SharpNormalizeModule {
  normalizeImage(input: Uint8Array, kind: NormalizeKind): Promise<NormalizeResult>;
}

const MAX_INPUT_PIXELS = 100_000_000;
const AVATAR_DIMENSION = 512;
const LINK_IMAGE_MAX_DIMENSION = 256;
const LQIP_DIMENSION = 24;
const MAIN_WEBP_OPTIONS = { quality: 82, effort: 4 } as const;
const LQIP_WEBP_OPTIONS = { quality: 50, effort: 4 } as const;

async function encodeMain(input: Uint8Array, kind: NormalizeKind): Promise<{ data: Buffer; width: number; height: number }> {
  const pipeline = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).rotate();
  const resized =
    kind === "avatar"
      ? pipeline.resize(AVATAR_DIMENSION, AVATAR_DIMENSION, { fit: "cover", position: "centre" })
      : pipeline.resize(LINK_IMAGE_MAX_DIMENSION, LINK_IMAGE_MAX_DIMENSION, {
          fit: "inside",
          withoutEnlargement: true,
        });

  const { data, info } = await resized.webp(MAIN_WEBP_OPTIONS).toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function encodeLqip(mainBuffer: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(mainBuffer)
    .resize(LQIP_DIMENSION, LQIP_DIMENSION, { fit: "inside" })
    .webp(LQIP_WEBP_OPTIONS)
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

export class SharpImageNormalizer implements SharpNormalizeModule {
  async normalizeImage(input: Uint8Array, kind: NormalizeKind): Promise<NormalizeResult> {
    assertIsImage(input);

    let main: { data: Buffer; width: number; height: number };
    try {
      main = await encodeMain(input, kind);
    } catch (error) {
      throw new Error(`failed to decode/normalize image: ${(error as Error).message}`, { cause: error });
    }

    const lqip = await encodeLqip(main.data);

    return {
      main: {
        buffer: new Uint8Array(main.data),
        contentType: "image/webp",
        ext: "webp",
        width: main.width,
        height: main.height,
        sizeBytes: main.data.byteLength,
      },
      lqip: {
        buffer: new Uint8Array(lqip.data),
        contentType: "image/webp",
        ext: "webp",
        width: lqip.width,
        height: lqip.height,
        sizeBytes: lqip.data.byteLength,
      },
    };
  }
}

export const sharpNormalizeModule: SharpNormalizeModule = new SharpImageNormalizer();
