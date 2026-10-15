'use client';
// src/components/CloudSync.js
// Menghubungkan progres game (uang, upgrade, level) ke Supabase.
// - Setiap kali save berubah -> di-upsert ke tabel `game_saves` (debounced).
// - Sekali per sesi, progres dari cloud diambil dan dipakai bila lebih maju.
// Aman: kalau tabel belum ada / offline, game tetap jalan pakai localStorage.

import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getSaveData, onGameSave } from '../lib/gameData';

const LOCAL_KEY = 'survival_wni_save';

async function pushSave(userId, data) {
    try {
        await supabase.from('game_saves').upsert(
            { id: userId, data, updated_at: new Date().toISOString() },
            { onConflict: 'id' }
        );
    } catch (e) {
        // diamkan kalau gagal (offline / tabel belum dibuat)
    }
    try {
        const lvl = Math.max(1, Math.min(10, data.highestLevelReached || 1));
        await supabase.from('profiles').update({ highest_level: lvl }).eq('id', userId);
    } catch (e) {
        // diamkan
    }
}

export default function CloudSync() {
    const timerRef = useRef(null);

    useEffect(() => {
        let active = true;
        const flagKey = 'cloud_save_loaded';

        async function init() {
            let user = null;
            try {
                const res = await supabase.auth.getUser();
                user = res?.data?.user || null;
            } catch (e) {
                return;
            }
            if (!user || !active) return;

            const userId = user.id;

            // 1) Pasang hook: tiap save lokal -> dorong ke cloud (debounce 600ms)
            onGameSave((data) => {
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => pushSave(userId, data), 600);
            });

            // 2) Ambil progres dari cloud sekali per sesi
            if (sessionStorage.getItem(flagKey)) return;
            sessionStorage.setItem(flagKey, '1');

            try {
                const { data: row, error } = await supabase
                    .from('game_saves')
                    .select('data')
                    .eq('id', userId)
                    .maybeSingle();

                if (!error && row && row.data) {
                    const local = getSaveData();
                    const cloud = row.data;
                    const cloudAhead =
                        (cloud.highestLevelReached || 1) > (local.highestLevelReached || 1) ||
                        ((cloud.highestLevelReached || 1) === (local.highestLevelReached || 1) &&
                            (cloud.money || 0) > (local.money || 0));
                    if (cloudAhead) {
                        try {
                            localStorage.setItem(LOCAL_KEY, JSON.stringify(cloud));
                        } catch (e) { /* ignore */ }
                        window.location.reload();
                    }
                }
            } catch (e) {
                // tabel belum ada -> abaikan
            }
        }

        init();

        return () => {
            active = false;
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    return null;
}