'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

export default function GuestLoginPage() {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleGuestLogin = async (e) => {
        e.preventDefault();
        if (!username.trim()) return alert('Masukkan nama kamu!');

        setLoading(true);

        try {
            // 1. Sign in secara anonim
            const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
            if (authError) throw authError;

            const user = authData.user;

            // 2. Buat profile pemain di database
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: user.id,
                        username: username.trim(),
                        total_rg: 500, // Bonus awal rakyat biasa
                        gold: 0,
                        highest_level: 1,
                    },
                ]);

            if (profileError) throw profileError;

            // 3. Simpan session local dan masuk ke Main Menu
            localStorage.setItem('player_username', username.trim());
            router.push('/menu');
        } catch (error) {
            alert('Gagal masuk: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-900 text-white p-4">
            <div className="max-w-md w-full bg-neutral-800 border-4 border-yellow-500 p-6 rounded-lg shadow-2xl text-center">
                <h1 className="text-3xl font-bold text-yellow-400 mb-2 tracking-wider">
                    SURVIVAL WNI
                </h1>
                <p className="text-sm text-neutral-400 mb-6 italic">
                    "Selamat datang di Indosia. Semua legal, asal kamu bayar."
                </p>

                <form onSubmit={handleGuestLogin} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-left text-xs mb-1 text-neutral-300">
                            NAMA RAKYAT / USERNAME:
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Contoh: Budi_Sabar"
                            maxLength={15}
                            className="w-full p-3 bg-neutral-900 border-2 border-neutral-600 rounded text-yellow-300 focus:outline-none focus:border-yellow-500 font-mono"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-neutral-950 font-bold rounded uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                        {loading ? 'Masuk ke Indosia...' : 'MAIN SEBAGAI GUEST'}
                    </button>
                </form>
            </div>
        </main>
    );
}