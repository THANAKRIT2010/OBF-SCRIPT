/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(7,7,12)",
        card: "rgb(20,27,46)",
        accent: {
          400: "#a9c9ff",
          500: "#92bbff",
          600: "#6fa0f5",
        },
        primary: "rgb(255,255,255)",
      },
      backdropBlur: {
        xs: "2px",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
