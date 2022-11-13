module.exports = {
	purge: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
	darkMode: 'class', // or 'media' or 'class'
	theme: {
		extend: {
			keyframes: {
				wave: {
					'0%': { transform: 'rotate(0.0deg)' },
					'10%': { transform: 'rotate(14deg)' },
					'20%': { transform: 'rotate(-8deg)' },
					'30%': { transform: 'rotate(14deg)' },
					'40%': { transform: 'rotate(-4deg)' },
					'50%': { transform: 'rotate(10.0deg)' },
					'60%': { transform: 'rotate(0.0deg)' },
					'100%': { transform: 'rotate(0.0deg)' },
				},
			},
			animation: {
				wave: 'wave 6s',
			},
			fontFamily: {
				Roboto: ['Roboto'],
				Nunito: ['Nunito'],
				Montserrat: ['Montserrat'],
			},
			height: {
				hero: '600px',
				blob: '700px',
			},
			width: {
				hero: '600px',
			},
			textColor: {
				primary: '#5928E5',
				secondary: '#85f396',
				tertiary: '#0099FF',
			},
			backgroundColor: (theme) => ({
				...theme('colors'),
				primary: '#5928E5',
				secondary: '#85f396',
			}),
			boxShadow: {
				primary: 'rgba(0, 0, 0, 0.35) 0px 5px 15px',
			},
			borderColor: {
				primary: '#5928E5',
			},
			screens: {
				mobile: '350px',
			},
			inset: {
				'8/5': '80%',
			},
		},
	},
	variants: {
		extend: {},
	},
	plugins: [],
};
