/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      /* Fuente base: toma la variable --font-inter de next/font */
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },

      /* Escala tipográfica amigable para móvil (más compacta) */
      fontSize: {
        sm:  ['0.875rem', { lineHeight: '1.4' }],          // ~14px
        base:['0.95rem',  { lineHeight: '1.5' }],          // ~15.2px
        lg:  ['1.05rem',  { lineHeight: '1.6' }],          // ~16.8px
        xl:  ['1.25rem',  { lineHeight: '1.4', fontWeight: '600' }], // títulos compactos
        '2xl':['1.375rem', { lineHeight: '1.35', fontWeight: '700' }], // titulares
      },

      colors: {
        muni: {
          50:"#fff1f1",100:"#ffe4e4",200:"#ffbdbd",300:"#ff9b9b",
          400:"#ef5757",500:"#d32f2f",600:"#c62828",700:"#b71c1c",
          800:"#8a1515",900:"#5e0f0f"
        },
        accent: { 500:"#e0a106" }
      },
      boxShadow: { soft:"0 10px 25px -10px rgba(0,0,0,.15)" },
      borderRadius: { xl:"1rem", "2xl":"1.25rem" },
      transitionTimingFunction: { swift:"cubic-bezier(.2,.8,.2,1)" },
      keyframes: {
        fadeInUp: {
          "0%": { opacity:"0", transform:"translateY(8px)" },
          "100%": { opacity:"1", transform:"translateY(0)" }
        }
      },
      animation: { "fade-in-up":"fadeInUp .4s cubic-bezier(.2,.8,.2,1) both" }
    }
  },
  plugins: []
};
export default config;
