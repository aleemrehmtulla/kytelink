// Zod-free entry point for render-time consumers. ProfileView needs only these
// plain lookup tables, but reaching them through the package barrel drags the
// whole zod runtime into the public profile's client bundle. Anything exported
// here must stay free of zod imports, directly or transitively.
export * from "./colors-data";
export * from "./fonts-data";
export * from "./icon-data";
export * from "./link-data";
