/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f3eeff",
          100: "#e9deff",
          200: "#d4bdff",
          300: "#b78fff",
          400: "#9a61ff",
          500: "#7d33ff",
          600: "#5700FF",
          700: "#4600cc",
          800: "#350099",
          900: "#240066",
          950: "#140038",
        },
        dark: "#312E38",
        accent: {
          orange: "#FF6B2C",
          green: "#34A853",
        },
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
