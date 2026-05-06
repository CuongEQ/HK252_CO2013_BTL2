/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
        extend: {
            fontFamily: {
                display: ['Space Grotesk', 'sans-serif'],
                body: ['Manrope', 'sans-serif']
            },
            boxShadow: {
                panel: '0 10px 40px -15px rgba(26, 54, 93, 0.35)'
            }
        }
    },
    plugins: []
};
