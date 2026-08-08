export const tailwindPreset = {
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#6D5AE6",
          hover: "#5747C9",
          soft: "#F1EEFD",
          border: "#CDC3F6",
          glow: "rgba(109,90,230,0.28)",
          "on-dark": "#A89CF2",
          fg: "#FFFFFF",
        },
        brand: {
          DEFAULT: "#6D5AE6",
          fg: "#FFFFFF",
        },
        ink: "#141419",
        secondary: "#6F6F78",
        tertiary: "#8A8A93",
        faint: "#A3A3AB",
        ghost: "#C3C2CC",
        canvas: "#FAFAFC",
        card: "#FFFFFF",
        tint: {
          DEFAULT: "#F6F5FB",
          hover: "#F0EFF5",
        },
        border: "#E6E5EC",
        cardline: "#ECECF1",
        hairline: "#F0EFF4",
        dark: {
          bg: "#17161C",
          card: "#201F27",
          border: "#2C2B34",
          "border-btn": "#33323B",
          text: "#9D9CA6",
          "text-strong": "#C9C8D2",
          muted: "#5F5E68",
          dot: "#3C3B44",
        },
        success: {
          DEFAULT: "#3FB96F",
          soft: "#E9F7EF",
          border: "#C7E9D4",
        },
        warning: {
          DEFAULT: "#9A6B12",
          soft: "#FBF2E3",
          border: "#E7D6A6",
        },
        danger: {
          DEFAULT: "#C04747",
          soft: "#FBECEC",
          border: "#F2D7D7",
        },
      },
      borderRadius: {
        pill: "99px",
        input: "10px",
        card: "14px",
        menu: "16px",
        panel: "24px",
      },
      boxShadow: {
        "card-rest": "0 2px 6px rgba(20,18,40,0.06), 0 24px 64px rgba(20,18,40,0.08)",
        menu: "0 16px 40px rgba(20,18,40,0.14)",
        phone: "0 16px 48px rgba(20,18,40,0.08)",
        cta: "0 8px 24px rgba(109,90,230,0.28)",
      },
      backgroundImage: {
        "hero-wash": "linear-gradient(180deg, #F1EEFD, #F6F5FB)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
};
