import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import type { ThemeKey } from "@kytelink/schemas";
import { ogCardColorsFor } from "./theme-colors";
import { initialsFor } from "./initials-avatar";

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

type SatoriChild = SatoriNode | string;
interface SatoriNode {
  type: string;
  props: Record<string, unknown>;
}

function el(
  type: string,
  style: Record<string, string | number>,
  children?: SatoriChild | SatoriChild[],
  extra: Record<string, unknown> = {},
): SatoriNode {
  return { type, props: { style, children, ...extra } };
}

let cachedFont: Buffer | null = null;

function loadFont(): Buffer {
  if (cachedFont) return cachedFont;
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "fonts", "geist-regular.ttf"),
    join(here, "..", "assets", "fonts", "geist-regular.ttf"),
    join(process.cwd(), "src", "assets", "fonts", "geist-regular.ttf"),
    join(process.cwd(), "fonts", "geist-regular.ttf"),
  ];
  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    throw new Error(
      "og-image font not found — expected src/assets/fonts/geist-regular.ttf next to the running module",
    );
  }
  cachedFont = readFileSync(found);
  return cachedFont;
}

export interface OgCardInput {
  displayName: string;
  username: string;
  theme: ThemeKey;
  avatarPngBase64?: string;
}

function avatarNode(input: OgCardInput): SatoriNode {
  if (input.avatarPngBase64) {
    return el(
      "img",
      { width: 140, height: 140, borderRadius: 70 },
      undefined,
      { src: `data:image/png;base64,${input.avatarPngBase64}`, width: 140, height: 140 },
    );
  }
  return el(
    "div",
    {
      width: 140,
      height: 140,
      borderRadius: 70,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.15)",
      fontSize: 56,
      color: "#ffffff",
      fontWeight: 700,
    },
    initialsFor(input.displayName),
  );
}

function buildCard(input: OgCardInput): SatoriNode {
  const colors = ogCardColorsFor(input.theme);
  return el(
    "div",
    {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: colors.background,
      fontFamily: "Geist",
    },
    [
      avatarNode(input),
      el("div", { marginTop: 32, fontSize: 56, fontWeight: 700, color: colors.nameColor }, input.displayName),
      el("div", { marginTop: 12, fontSize: 32, color: colors.usernameColor }, `@${input.username}`),
    ],
  );
}

export async function renderOgImagePng(input: OgCardInput): Promise<Buffer> {
  const svg = await satori(buildCard(input) as unknown as Parameters<typeof satori>[0], {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    fonts: [{ name: "Geist", data: loadFont(), weight: 600, style: "normal" }],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: "original" } });
  return resvg.render().asPng();
}
