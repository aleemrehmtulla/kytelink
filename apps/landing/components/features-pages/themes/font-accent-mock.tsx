import { FONTS } from "@kytelink/schemas";
import { COLORS, COLOR_HEX } from "@kytelink/schemas";

export function FontAccentMock() {
  return (
    <div className="rounded-card border border-cardline bg-card p-5 sm:p-6">
      <h3 className="text-[13px] font-semibold text-ink">Every font, every accent</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-secondary">Mix and match on top of any theme.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Fonts</p>
          <ul className="mt-3 flex flex-col gap-2">
            {FONTS.map((font) => (
              <li
                key={font.key}
                className="rounded-input border border-hairline bg-canvas px-3.5 py-2 text-[13px] text-ink"
                style={{ fontFamily: font.key === "default" ? undefined : font.key }}
              >
                {font.name}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Accents</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {COLORS.map((color) => {
              const hex = COLOR_HEX[color.key];
              return (
                <li
                  key={color.key}
                  className="flex items-center gap-2 rounded-pill border border-cardline py-1 pl-1 pr-3 text-xs text-secondary"
                >
                  <span
                    className={`h-5 w-5 rounded-pill border border-hairline ${hex ? "" : "bg-accent"}`}
                    style={hex ? { backgroundColor: hex } : undefined}
                    aria-hidden="true"
                  />
                  {color.name}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
