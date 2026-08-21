import type { CSSProperties } from "react";
// Values come from the zod-free subpath: the package barrel would pull the zod
// runtime into the public profile's client bundle for four lookup tables.
// Types are erased at compile time, so those stay on the barrel.
import {
  classifyLinkEmoji,
  COLOR_HEX,
  FONT_FAMILIES,
  ICON_FA_KEYS,
} from "@kytelink/schemas/profile-data";
import type {
  ColorKey,
  FontKey,
  Icon,
  Link,
  ProfileContent,
  ThemeKey,
} from "@kytelink/schemas";
import { getCdnUrl } from "@kytelink/cdn";
import { THEME_EXTRAS, type ThemeExtras } from "../theme-extras";
import { getFaIcon } from "../fa-icons";

export interface ProfileViewProps {
  content: ProfileContent;
  username?: string;
  isPreview?: boolean;
  themeOverride?: ThemeKey;
  onLinkClick?: (link: Link) => void;
  onIconClick?: (icon: Icon) => void;
}

const WATERMARK_URL = "https://kytelink.com";
const USER_LINK_REL = "ugc nofollow noopener noreferrer";
const WATERMARK_TEXT = "made with kytelink";
const AVATAR_SIZE = 108;
const CONTENT_MAX_WIDTH = 420;

function resolveFont(customFont: FontKey | null): string {
  if (!customFont || customFont === "default") return "sans-serif";
  return FONT_FAMILIES[customFont] ?? "sans-serif";
}

// customColor is either a legacy Chakra preset token (resolved via COLOR_HEX) or
// a raw safe CSS color from the picker (used verbatim). Both are validated by
// safeCssColorSchema on save, so passing the raw value into inline styles is safe.
function resolveCustomColor(customColor: string | null): string | undefined {
  if (!customColor || customColor === "default") return undefined;
  return COLOR_HEX[customColor as ColorKey] ?? customColor;
}

function normalizeHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function resolveAsset(value: string): string {
  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:")) return value;
  return getCdnUrl(value);
}

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const second = words[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

function profileStyles(themeKey: string, extras: ThemeExtras): string {
  const scope = `[data-kytelink-profile-view][data-theme="${themeKey}"]`;
  return [
    `${scope}, ${scope} *{box-sizing:border-box;}`,
    `${scope} a{outline:none;}`,
    `${scope} .kyte-stack{padding-top:56px;}`,
    `@media (min-width:768px){${scope}:not([data-preview]) .kyte-stack{padding-top:88px;}}`,
    `${scope} .kyte-name{font-size:20px;}`,
    `@media (min-width:480px){${scope} .kyte-name{font-size:22px;}}`,
    `${scope} .kyte-description{font-size:14px;}`,
    `${scope} .kyte-link{transition:all .15s ease;}`,
    `${scope} .kyte-link:hover{background:${extras.link.hoverBackground} !important;border:${extras.link.hoverBorder} !important;color:${extras.link.hoverColor} !important;}`,
    `${scope} .kyte-icon{transition:color .15s ease, opacity .15s ease;}`,
    `${scope} .kyte-icon:hover{color:${extras.iconHoverColor} !important;}`,
    `${scope} .kyte-avatar-img{position:relative;z-index:1;}`,
    `${scope} .kyte-avatar-lqip{position:absolute;inset:0;background-size:cover;background-position:center;filter:blur(10px);transform:scale(1.15);z-index:0;}`,
    `@media (prefers-reduced-motion: reduce){${scope} .kyte-link,${scope} .kyte-icon{transition:none;}}`,
  ].join("");
}

function Avatar({
  url,
  lqip,
  name,
  extras,
}: {
  url: string | null;
  lqip: string | null;
  name: string;
  extras: ThemeExtras;
}) {
  const containerStyle: CSSProperties = {
    position: "relative",
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    aspectRatio: "1 / 1",
    borderRadius: "9999px",
    overflow: "hidden",
    flexShrink: 0,
  };

  if (!url) {
    const initials = initialsOf(name);
    return (
      <div style={containerStyle} data-kytelink-avatar="fallback">
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: `repeating-linear-gradient(45deg, ${extras.placeholderStripeA}, ${extras.placeholderStripeA} 7px, ${extras.placeholderStripeB} 7px, ${extras.placeholderStripeB} 14px)`,
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "42px",
            fontWeight: 700,
            color: extras.placeholderLabelColor,
          }}
        >
          {initials}
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle} data-kytelink-avatar="image">
      {lqip ? (
        <div
          className="kyte-avatar-lqip"
          aria-hidden="true"
          style={{ backgroundImage: `url("${resolveAsset(lqip)}")` }}
        />
      ) : null}
      <img
        className="kyte-avatar-img"
        src={resolveAsset(url)}
        alt={name || "Profile avatar"}
        width={AVATAR_SIZE}
        height={AVATAR_SIZE}
        decoding="async"
        loading="eager"
        fetchPriority="high"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </div>
  );
}

// THE single renderer (02-architecture.md): the public profile page, the editor
// live preview, and the landing demo all mount this component. No second renderer
// may exist. Zero motion-library code — public profiles are CSS-only (14/15).
// Every stored theme id renders through THEME_EXTRAS, so the frozen schema
// ThemeObject stays the untouched contract while the profile wears the redesign.
export function ProfileView({
  content,
  username,
  isPreview,
  themeOverride,
  onLinkClick,
  onIconClick,
}: ProfileViewProps) {
  const themeKey = themeOverride ?? content.theme;
  const extras = THEME_EXTRAS[themeKey] ?? THEME_EXTRAS.default;

  const font = resolveFont(content.customFont);
  const customColor = resolveCustomColor(content.customColor);
  const background = resolveCustomColor(content.customBackground) ?? extras.background;

  const nameColor = customColor ?? extras.nameColor;
  const descriptionColor = customColor ?? extras.descriptionColor;
  const iconColor = extras.iconColor;
  const linkColor = customColor ?? extras.link.color;
  const textShadow = extras.textShadow;

  const rootStyle: CSSProperties = {
    minHeight: isPreview ? "100%" : "100vh",
    background,
    color: nameColor,
    fontFamily: font,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 24px",
    textAlign: "center",
    position: "relative",
    overflowX: "hidden",
  };

  const stackStyle: CSSProperties = {
    width: "100%",
    maxWidth: isPreview ? "100%" : CONTENT_MAX_WIDTH,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  };

  const displayName = content.displayName ?? "";

  const watermarkHref =
    username && !isPreview
      ? `${WATERMARK_URL}/?ref=${encodeURIComponent(username)}`
      : WATERMARK_URL;

  return (
    <div
      data-kytelink-profile-view=""
      data-theme={themeKey}
      data-preview={isPreview ? "" : undefined}
      style={rootStyle}
    >
      <style dangerouslySetInnerHTML={{ __html: profileStyles(themeKey, extras) }} />

      <div className="kyte-stack" style={stackStyle}>
        <div
          data-kytelink-userdata=""
          style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}
        >
          <Avatar
            url={content.avatar?.url ?? null}
            lqip={content.avatar?.lqip ?? null}
            name={displayName}
            extras={extras}
          />

          {displayName ? (
            <h1
              className="kyte-name"
              style={{
                margin: 0,
                paddingTop: "20px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                fontFamily: font,
                color: nameColor,
                lineHeight: 1.2,
                textShadow,
                maxWidth: "100%",
                wordBreak: "break-word",
              }}
            >
              {displayName}
            </h1>
          ) : null}

          {content.description ? (
            <p
              className="kyte-description"
              style={{
                margin: 0,
                paddingTop: "6px",
                fontFamily: font,
                color: descriptionColor,
                lineHeight: 1.5,
                maxWidth: "100%",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                textShadow,
              }}
            >
              {content.description}
            </p>
          ) : null}
        </div>

        {content.icons.length > 0 ? (
          <div
            data-kytelink-icons=""
            style={{
              display: "flex",
              gap: "22px",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
              marginTop: "24px",
              color: iconColor,
            }}
          >
            {content.icons.map((icon, index) => {
              const Icon = getFaIcon(ICON_FA_KEYS[icon.name]);
              const href = icon.url ? normalizeHref(icon.url) : undefined;
              return (
                <a
                  key={`${icon.name}-${index}`}
                  className="kyte-icon"
                  data-kytelink-icon=""
                  data-icon-name={icon.name}
                  href={href}
                  target="_blank"
                  rel={USER_LINK_REL}
                  aria-label={icon.name}
                  style={{ display: "inline-flex", color: iconColor }}
                  onClick={(event) => {
                    if (isPreview) event.preventDefault();
                    onIconClick?.(icon);
                  }}
                >
                  <Icon size={20} aria-hidden="true" />
                </a>
              );
            })}
          </div>
        ) : null}
        <div
          data-kytelink-links=""
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            width: "100%",
            marginTop: "18px",
          }}
        >
          {content.links.map((link, index) => {
            const kind = classifyLinkEmoji(link.emoji);
            const linkStyle: CSSProperties = {
              display: "flex",
              alignItems: "center",
              width: "100%",
              minHeight: "56px",
              padding: "0 16px",
              borderRadius: extras.linkRadius,
              background: extras.link.background,
              border: extras.link.border,
              boxShadow: extras.link.boxShadow,
              backdropFilter: extras.link.backdropFilter,
              WebkitBackdropFilter: extras.link.backdropFilter,
              color: linkColor,
              textDecoration: "none",
              cursor: "pointer",
              textShadow,
            };

            const prefixStyle: CSSProperties = {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              overflow: "hidden",
              flexShrink: 0,
              background: kind === "none" ? "transparent" : (link.color ?? extras.link.prefixBackground),
            };

            return (
              <a
                key={`${link.link}-${index}`}
                className="kyte-link"
                href={normalizeHref(link.link)}
                target="_blank"
                rel={USER_LINK_REL}
                style={linkStyle}
                onClick={(event) => {
                  if (isPreview) event.preventDefault();
                  onLinkClick?.(link);
                }}
              >
                <span style={prefixStyle} data-link-prefix={kind}>
                  {kind === "icon" ? (
                    (() => {
                      const Icon = getFaIcon(link.emoji ?? undefined);
                      return <Icon size={26} aria-hidden="true" />;
                    })()
                  ) : kind === "image" ? (
                    <img
                      src={link.emoji}
                      alt=""
                      width={36}
                      height={36}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : kind === "emoji" ? (
                    <span style={{ fontSize: "24px", lineHeight: 1 }}>{link.emoji}</span>
                  ) : null}
                </span>

                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    textAlign: "center",
                    padding: "0 8px",
                    fontSize: "15px",
                    fontWeight: 500,
                    fontFamily: font,
                    color: "inherit",
                    overflowWrap: "break-word",
                  }}
                >
                  {link.title}
                </span>

                <span style={{ width: "36px", height: "36px", flexShrink: 0 }} aria-hidden="true" />
              </a>
            );
          })}
        </div>

      </div>

      {content.hideWatermark ? (
        <div style={{ marginTop: "auto", height: "52px" }} aria-hidden="true" />
      ) : (
        <a
          data-kytelink-watermark=""
          href={watermarkHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginTop: "auto",
            padding: "24px 0 28px",
            fontSize: "12px",
            fontWeight: 500,
            textDecoration: "none",
            color: extras.watermarkColor,
            cursor: "pointer",
          }}
          onClick={isPreview ? (event) => event.preventDefault() : undefined}
        >
          {WATERMARK_TEXT}
        </a>
      )}
    </div>
  );
}
