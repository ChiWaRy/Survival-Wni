import './globals.css';

export const metadata = {
    title: 'SURVIVAL WNI',
    description: 'Game 2D Petualangan Bertahan Hidup di Indosia',
};

export default function RootLayout({ children }) {
    return (
        <html lang="id">
            <body>{children}</body>
        </html>
    );
}