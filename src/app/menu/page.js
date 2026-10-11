'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function MainMenuPage() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function fetchProfile() {
            // Ambil data user yang sedang login
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/');
                return;
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
            } else {
                setProfile(data);
            }
            setLoading(false);
        }

        fetchProfile();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-900 text-yellow-400 flex items-center justify-center font-mono">
                Memuat Data Rakyat...
            </div>
        );
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-900 text-white p-4">
            <div className="max-w-lg w-full bg-neutral-800 border-4 border-neutral-700 p-6 rounded-lg">
                {/* Header Profile Status */}
                <div className="bg-neutral-900 border-2 border-neutral-700 p-4 rounded mb-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-yellow-400">{profile?.username || 'Rakyat Anonim'}</h2>
                        <p className="text-xs text-neutral-400">Level Tertinggi: {profile?.highest_level}</p>
                    </div>
                    <div className="text-right font-mono">
                        <div className="text-green-400 font-bold">💵 {profile?.total_rg?.toLocaleString('id-ID')} RG</div>
                        <div className="text-yellow-300 font-bold">🪙 {profile?.gold} Emas</div>
                    </div>
                </div>

                {/* Menu Navigation */}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => router.push('/game')}
                        className="w-full py-4 bg-green-600 hover:bg-green-700 font-bold rounded text-lg tracking-wide border-b-4 border-green-900 active:translate-y-1 transition-all"
                    >
                        PLAY SOLO (LEVEL 1)
                    </button>

                    <button
                        onClick={() => alert('Lobby Multiplayer akan dibuat pada Dev 3!')}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 font-bold rounded text-lg tracking-wide border-b-4 border-blue-900 active:translate-y-1 transition-all"
                    >
                        MULTIPLAYER LOBBY
                    </button>

                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            router.push('/');
                        }}
                        className="w-full py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 font-semibold rounded text-sm mt-4"
                    >
                        Keluar Akun
                    </button>
                </div>
            </div>
        </main>
    );
}