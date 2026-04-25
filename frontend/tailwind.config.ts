import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070807",
          900: "#0c0e0c",
          800: "#141714",
          700: "#1c211c",
          600: "#272d27",
        },
        matcha: {
          50: "#f1f6e9",
          100: "#dde8c5",
          200: "#c3d79b",
          300: "#a8c773",
          400: "#90b552",
          500: "#789c3d",
          600: "#5d7c2e",
          700: "#475e25",
          800: "#33441b",
          900: "#202c11",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(168,199,115,0.18), 0 24px 80px -20px rgba(168,199,115,0.25)",
      },
      backgroundImage: {
        "matcha-radial":
          "radial-gradient(60% 60% at 50% 0%, rgba(168,199,115,0.22) 0%, rgba(7,8,7,0) 70%)",
        "grain":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
