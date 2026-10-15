import './globals.css';
import CloudSync from '../components/CloudSync';

export const metadata = {
    title: 'SURVIVAL WNI',
    description: 'Game 2D Petualangan Bertahan Hidup di Indosia',
};

export default function RootLayout({ children }) {
    return (
        <html lang="id">
            <body>
                <CloudSync />
                {children}
            </body>
        </html>
    );
}