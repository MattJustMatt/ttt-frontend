/** @type {import('tailwindcss').Config} */
const config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      gridTemplateColumns: {
        // Simple 16 column grid
        'tictactoe': 'repeat(30, minmax(0, 1fr))',
      },
    },
  },
  plugins: [],
};

module.exports = config;
