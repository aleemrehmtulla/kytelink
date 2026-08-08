// D2 proving script (P4-FINDINGS.md), not part of the automated suite (hence
// `.manual.ts`, excluded from vitest's default *.test.ts glob): fetches one
// real JPEG over the network and runs it through the REAL sharp-normalize
// import that ./real-seams.ts wires into `backfill --execute`, side by side
// with the fixture-only StubNormalizeModule, to demonstrate the real module
// produces a genuine decodable webp while the stub produces fake hash bytes
// that aren't an image at all. Run with: npx tsx
// src/legacy-backfill/prove-real-normalize.manual.ts (from tools/seed/).
import { detectImageType } from "@kytelink/api/src/assets/magic-bytes";
import { sharpNormalizeModule } from "@kytelink/api/src/assets/sharp-normalize";
import { StubNormalizeModule } from "./seams";

async function fetchRealJpeg(): Promise<Uint8Array> {
  const response = await fetch("https://picsum.photos/id/237/1600/1200.jpg");
  if (!response.ok) throw new Error(`fixture image fetch failed: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function main(): Promise<void> {
  const input = await fetchRealJpeg();
  process.stdout.write(`fetched a real test JPEG: ${input.byteLength} bytes, magic=${detectImageType(input)}\n`);

  const real = await sharpNormalizeModule.normalizeImage(input, "avatar");
  const stub = await new StubNormalizeModule().normalizeImage(input, "avatar");

  const report = {
    real: {
      width: real.main.width,
      height: real.main.height,
      contentType: real.main.contentType,
      sizeBytes: real.main.sizeBytes,
      magicBytesDetected: detectImageType(real.main.buffer),
      lqipWidth: real.lqip.width,
      lqipSizeBytes: real.lqip.sizeBytes,
    },
    stub: {
      width: stub.main.width,
      height: stub.main.height,
      contentType: stub.main.contentType,
      sizeBytes: stub.main.sizeBytes,
      magicBytesDetected: detectImageType(stub.main.buffer),
      lqipWidth: stub.lqip.width,
      lqipSizeBytes: stub.lqip.sizeBytes,
    },
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.real.magicBytesDetected !== "webp") {
    throw new Error("expected the REAL normalizer to emit a genuine webp-magic-byte payload");
  }
  if (report.stub.magicBytesDetected !== null) {
    throw new Error("expected the STUB normalizer's fake bytes to fail an image-magic-byte check");
  }
  process.stdout.write(
    "PASS: real sharp-normalize (imported from apps/api) produced a genuine decodable webp; " +
      "the stub's hash-derived bytes are not a real image at all.\n",
  );
}

main().catch((error) => {
  process.stderr.write(`${String(error instanceof Error ? error.stack : error)}\n`);
  process.exit(1);
});
