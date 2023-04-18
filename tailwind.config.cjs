/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: 'class',
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [
    require('tailwind-scrollbar'),
  ],
};

module.exports = config;
