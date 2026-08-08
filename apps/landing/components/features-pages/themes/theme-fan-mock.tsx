import { THEME_REGISTRY } from "@kytelink/schemas";
import { THEME_EXTRAS } from "@kytelink/ui";

const SWATCH_LINKS = ["Latest drop", "Tour dates", "Merch"];

export function ThemeFanMock() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {THEME_REGISTRY.map((entry) => {
        const extras = THEME_EXTRAS[entry.key];
        return (
          <div
            key={entry.key}
            className="overflow-hidden rounded-card border border-cardline bg-card"
          >
            <div
              className="flex h-[164px] flex-col justify-center gap-2.5 px-4"
              style={{ background: extras.background }}
            >
              {SWATCH_LINKS.map((label) => (
                <div
                  key={label}
                  className="flex h-9 items-center justify-center overflow-hidden px-2"
                  style={{
                    background: extras.link.background,
                    border: extras.link.border,
                    borderRadius: extras.linkRadius,
                    boxShadow: extras.link.boxShadow,
                    backdropFilter: extras.link.backdropFilter,
                    WebkitBackdropFilter: extras.link.backdropFilter,
                  }}
                >
                  <span
                    className="truncate text-[11px] font-medium"
                    style={{ color: extras.link.color, textShadow: extras.textShadow }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-hairline bg-card px-3 py-2.5 text-center text-xs font-medium text-secondary">
              {entry.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
