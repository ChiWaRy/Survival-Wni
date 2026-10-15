// src/app/shop/page.js
// INTERMEZZO ANTAR LEVEL — "Warung & Toko Elektronik"
// Muncul SETIAP kali Arya menang level, SEBELUM masuk ke level berikutnya.
// Di sini sisa uang hasil menyelamatkan diri dari oknum bisa dibelanjakan:
//   👟 Sepatu Olahraga      Rp 50.000  -> speed 4.0 -> 5.0
//   🔋 Powerbank/Lensa HP  Rp 100.000 -> damage 25 -> 40
//   🍚 Nasi Bungkus/Vitamin Rp 25.000  -> HP penuh (100) sebelum level berikutnya
'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getSaveData,
  buyItem,
  SHOP_ITEMS,
  claimLevelReward,
  completeLevel,
  payBribe,
  getBribeCost,
  resetGameData,
  formatMoney,
} from '../../lib/gameData';

function ShopContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = Math.max(1, Math.min(10, parseInt(searchParams.get('next') || '2', 10)));
    const skipped = searchParams.get('skipped') === '1';

    const [money, setMoney] = useState(null);
    const [upgrades, setUpgrades] = useState({ shoes: 0, camera: 0 });
    const [playerHp, setPlayerHp] = useState(100);
    const [toast, setToast] = useState('');
    const [reward, setReward] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const claimedRef = useRef(false);

    useEffect(() => {
        if (claimedRef.current) return;
        claimedRef.current = true;
        const from = next - 1;
        let r = 0;
        if (from >= 1 && from <= 10) {
            const res = claimLevelReward(from);
            r = res.amount || 0;
            completeLevel(from);
        }
        const save = getSaveData();
        setMoney(save.money);
        setUpgrades(save.upgrades);
        setPlayerHp(save.playerHp ?? 100);
        setReward(r);
    }, [next]);

    const showToast = (msg) => {
        setToast(msg);
        window.setTimeout(() => setToast(''), 2400);
    };

    const handleBuy = (id) => {
        const res = buyItem(id);
        if (res.success) {
            const save = getSaveData();
            setMoney(save.money);
            setUpgrades(save.upgrades);
            setPlayerHp(save.playerHp ?? 100);
            showToast(res.message || 'Pembelian berhasil!');
        } else {
            showToast(res.message || 'Pembelian gagal.');
        }
    };

    const continueToLevel = () => {
        if (next >= 1 && next <= 10) {
            router.push(next === 1 ? '/game' : `/level${next}`);
        } else {
            router.push('/menu');
        }
    };

    const handleBribe = () => {
        // Bayar uang pelicin untuk melewati level 'next' dan langsung ke level sesudahnya.
        const levelToSkip = next;
        if (levelToSkip > 10) {
            showToast('Tidak ada level berikutnya untuk dilewati.');
            return;
        }
        const cost = getBribeCost(levelToSkip);
        if (money < cost) {
            showToast(`Uang tidak cukup untuk jalan pintas! Butuh ${formatMoney(cost)}`);
            return;
        }
        const res = payBribe(levelToSkip);
        if (!res.success) {
            showToast(res.message || 'Gagal membayar uang pelicin.');
            return;
        }
        const save = getSaveData();
        setMoney(save.money);
        if (res.bankrupt) {
            setGameOver(true);
            return;
        }
        const target = levelToSkip + 1; // level berikutnya setelah yang di-skip
        if (target > 10) {
            router.push('/menu');
        } else {
            router.push(target === 1 ? '/game' : `/level${target}`);
        }
    };

    const handleRestart = () => {
        resetGameData();
        router.push('/');
    };

    const items = Object.values(SHOP_ITEMS);
    const loading = money === null;

    return (
        <div className="min-h-screen bg-neutral-950 text-white font-mono flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="text-4xl mb-2">🏪</div>
                    <h1 className="text-2xl font-bold text-yellow-400 tracking-wider">WARUNG & TOKO ELEKTRONIK</h1>
                    <p className="text-xs text-neutral-400 mt-1">Intermezzo antar level — belanjakan uang hasil menyelamatkan diri dari oknum</p>
                </div>

                {/* Status bar */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-neutral-900 border border-emerald-700 rounded-xl p-3 text-center">
                        <div className="text-[10px] text-neutral-400">UANG ARYA</div>
                        <div className="text-emerald-400 font-bold text-sm">{loading ? '…' : formatMoney(money)}</div>
                    </div>
                    <div className="bg-neutral-900 border border-red-700 rounded-xl p-3 text-center">
                        <div className="text-[10px] text-neutral-400">HP ARYA</div>
                        <div className="text-red-400 font-bold text-sm">{loading ? '…' : `${playerHp}/100`}</div>
                    </div>
                    <div className="bg-neutral-900 border border-cyan-700 rounded-xl p-3 text-center">
                        <div className="text-[10px] text-neutral-400">LEVEL BERIKUTNYA</div>
                        <div className="text-cyan-300 font-bold text-sm">LEVEL {next}</div>
                    </div>
                </div>

                {/* Reward banner */}
                {reward > 0 && (
                    <div className="mb-4 bg-emerald-950/60 border border-emerald-600 rounded-xl px-4 py-3 text-center text-sm text-emerald-300">
                        🎉 Level {next - 1} selesai! Hadiah uang: <span className="font-bold">+{formatMoney(reward)}</span>
                        {skipped && <span className="block text-[11px] text-neutral-400 mt-1">(kamu melewati level ini dengan uang pelicin)</span>}
                    </div>
                )}

                {/* Item list */}
                <div className="flex flex-col gap-3 mb-6">
                    {items.map((item) => {
                        const owned = !item.instantHeal && upgrades[item.id] >= item.maxLevel;
                        const affordable = money !== null && money >= item.price;
                        return (
                            <div key={item.id} className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 flex items-center gap-4">
                                <div className="text-3xl w-12 h-12 flex items-center justify-center bg-neutral-800 rounded-lg border border-neutral-700 shrink-0">
                                    {item.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-sm text-white">{item.name}</span>
                                        {owned && <span className="text-[10px] px-2 py-0.5 bg-emerald-900 border border-emerald-600 text-emerald-300 rounded">DIMILIKI</span>}
                                    </div>
                                    <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">{item.description}</p>
                                    <div className="text-yellow-400 font-bold text-sm mt-1">{formatMoney(item.price)}</div>
                                </div>
                                <button
                                    onClick={() => handleBuy(item.id)}
                                    disabled={owned || !affordable}
                                    className={`px-4 py-2.5 rounded-lg text-xs font-bold border-b-4 transition-all shrink-0 ${
                                        owned
                                            ? 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed'
                                            : affordable
                                            ? 'bg-yellow-500 hover:bg-yellow-400 text-neutral-950 border-yellow-700 active:translate-y-0.5'
                                            : 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed'
                                    }`}
                                >
                                    {owned ? 'Sudah' : 'BELI'}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Toast */}
                {toast && (
                    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-neutral-800 border border-yellow-500 text-yellow-200 text-xs font-bold px-5 py-3 rounded-xl shadow-2xl">
                        {toast}
                    </div>
                )}

                {/* Jalan Pintas (Bribe) */}
                <div className="bg-neutral-900 border border-rose-700 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="text-3xl w-12 h-12 flex items-center justify-center bg-rose-950 rounded-lg border border-rose-800 shrink-0">
                            💸
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-rose-300">Jalan Pintas (Uang Pelicin)</span>
                                <span className="text-[10px] px-2 py-0.5 bg-rose-900 border border-rose-700 text-rose-200 rounded">SKIP LEVEL {next}</span>
                            </div>
                            <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                                Bayar uang pelicin untuk langsung melewati Level {next} dan melompat ke level berikutnya. Hati-hati: jika uangmu habis (Rp 0), perjuanganmu tamat!
                            </p>
                            <div className="text-rose-400 font-bold text-sm mt-1">{formatMoney(getBribeCost(next))}</div>
                        </div>
                        <button
                            onClick={handleBribe}
                            disabled={money === null || money < getBribeCost(next)}
                            className={`px-4 py-2.5 rounded-lg text-xs font-bold border-b-4 transition-all shrink-0 ${
                                money !== null && money >= getBribeCost(next)
                                    ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-800 active:translate-y-0.5'
                                    : 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed'
                            }`}
                        >
                            SKIP
                        </button>
                    </div>
                </div>

                {/* Continue */}
                <button
                    onClick={continueToLevel}
                    className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold text-sm rounded-xl border-b-4 border-green-800 active:translate-y-0.5 transition-all tracking-widest"
                >
                    LANJUT KE LEVEL {next} ➔
                </button>
                <button
                    onClick={() => router.push('/menu')}
                    className="w-full py-2.5 mt-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded-lg border border-neutral-600 transition"
                >
                    Simpan & Kembali ke Menu
                </button>
            </div>

            {/* Bankruptcy Game Over */}
            {gameOver && (
                <div className="fixed inset-0 z-50 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md">
                    <div className="max-w-md bg-neutral-900 border-2 border-red-600 rounded-2xl p-8 shadow-2xl">
                        <div className="text-5xl mb-4">💸</div>
                        <h2 className="text-2xl font-bold text-red-500 mb-3">BANGKRUT! PERJUANGAN TAMAT</h2>
                        <p className="text-sm text-neutral-200 mb-6 leading-relaxed">
                            Uang Arya habis (Rp 0) setelah membayar uang pelicin. Tanpa bekal, Arya tak sanggup
                            melanjutkan perjuangan melawan korupsi. Kakek hanya bisa menatap kecewa...
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleRestart}
                                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800"
                            >
                                Mulai Ulang dari Awal
                            </button>
                            <button
                                onClick={() => router.push('/menu')}
                                className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl border border-neutral-600"
                            >
                                Kembali ke Menu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ShopPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-neutral-950 text-yellow-400 flex items-center justify-center font-mono">
                    Membuka Warung...
                </div>
            }
        >
            <ShopContent />
        </Suspense>
    );
}
