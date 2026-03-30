/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hospital: {
          blue: '#1E3A8A', // สีน้ำเงินหลักของโรงพยาบาล
          light: '#DBEAFE', // สีน้ำเงินอ่อน
        }
      }
    },
  },
  plugins: [],
}