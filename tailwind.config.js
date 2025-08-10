/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}", "./src/index.html"],
  theme: {
    extend: {
      colors: {
        ChatsApp: {
          primary: "#00a884",
          secondary: "#008069",
          dark: "#111b21",
          light: "#f0f2f5",
          message: "#d9fdd3",
          border: "#e9edef",
          hover: "#f5f6f6",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
