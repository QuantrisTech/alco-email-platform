
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#071C43",
        navylight: "#25507D",
        navydeep: "#142756",
        gold: "#F8B821",
        goldalt: "#F09623",
        darktext: "#000000",
        lightgray: "#FCF9EF",
        border: "#C9C7C1",
        muted: "#ADB0B5",
        success: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
      },
      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
      },
    },
  },
  plugins: [],
}