import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#050a30",
          yellow: "#f4b609",
          white: "#ffffff",
          green: "#1b9054"
        }
      },
      borderRadius: {
        xl: "1rem"
      },
      boxShadow: {
        "brand-soft": "0 18px 40px rgba(5,10,48,0.7)"
      }
    }
  },
  plugins: []
};

export default config;

