// src/app/game/page.js
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GamePage() {
    const router = useRouter();
    const canvasRef = useRef(null);

    const [gameState, setGameState] = useState('EXPLORE_RT');
    const [playerMoney, setPlayerMoney] = useState(200000);
    const [lastActionText, setLastActionText] = useState('');

    // Ref untuk menyimpan gambar sprite sheet yang sudah transparan
    const aryaImgRef = useRef(null);
    const pakRtImgRef = useRef(null);
    const enemyImgRef = useRef(null);

    // Status Karakter Arya (Player)
    const playerRef = useRef({
        x: 200,
        y: 350,
        size: 64,
        speed: 4,
        health: 100,
        maxHealth: 100,
        facingDirection: 'down',
        isWalking: false,
        frameIndex: 0,
        frameTimer: 0,
        isAttacking: false,
        attackTimer: 0,
        attackCooldown: false,
    });

    // Status Pak RT
    const pakRtRef = useRef({
        x: 550,
        y: 350,
        size: 64,
        facingDirection: 'down',
        frameIndex: 1,
        frameTimer: 0,
    });

    // Status Oknum Pungli
    const enemyRef = useRef({
        x: 950,
        y: 350,
        size: 64,
        speed: 2,
        health: 100,
        maxHealth: 100,
        facingDirection: 'left',
        isWalking: false,
        frameIndex: 0,
        frameTimer: 0,
    });

    const keysRef = useRef({});

    useEffect(() => {
        const handleKeyDown = (e) => { keysRef.current[e.key.toLowerCase()] = true; };
        const handleKeyUp = (e) => { keysRef.current[e.key.toLowerCase()] = false; };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Fungsi otomatis membuat background putih bersih pada sprite sheet menjadi transparan
        const loadTransparentImage = (src, ref) => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = img.naturalWidth;
                tempCanvas.height = img.naturalHeight;
                const tempCtx = tempCanvas.getContext('2d');

                tempCtx.drawImage(img, 0, 0);
                const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                const data = imgData.data;

                for (let i = 0; i < data.length; i += 4) {
                    if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) {
                        data[i + 3] = 0;
                    }
                }

                tempCtx.putImageData(imgData, 0, 0);
                const processedImg = new Image();
                processedImg.src = tempCanvas.toDataURL();
                processedImg.onload = () => { ref.current = processedImg; };
            };
        };

        // Load sprite sheet dari folder public/assets
        loadTransparentImage('/assets/arya.jpg', aryaImgRef);
        loadTransparentImage('/assets/pak_rt.jpg', pakRtImgRef);
        loadTransparentImage('/assets/petugas_pungli.jpg', enemyImgRef);

        let animationFrameId;

        const gameLoop = () => {
            // 1. RENDER BACKGROUND POLOS BERGARIS GRID
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            const gridSize = 50;
            for (let x = 0; x < canvas.width; x += gridSize) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
            }
            for (let y = 0; y < canvas.height; y += gridSize) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
            }

            const player = playerRef.current;
            const pakRt = pakRtRef.current;
            const enemy = enemyRef.current;
            const keys = keysRef.current;

            // --- LOGIKA PERGERAKAN PLAYER (ARYA) ---
            player.isWalking = false;

            if (gameState === 'EXPLORE_RT' || gameState === 'PLAYING') {
                let dx = 0;
                let dy = 0;

                if (keys['w'] || keys['arrowup']) { dy -= 1; player.facingDirection = 'up'; }
                if (keys['s'] || keys['arrowdown']) { dy += 1; player.facingDirection = 'down'; }
                if (keys['a'] || keys['arrowleft']) { dx -= 1; player.facingDirection = 'left'; }
                if (keys['d'] || keys['arrowright']) { dx += 1; player.facingDirection = 'right'; }

                if (dx !== 0 || dy !== 0) {
                    player.isWalking = true;
                    const length = Math.hypot(dx, dy);
                    player.x += (dx / length) * player.speed;
                    player.y += (dy / length) * player.speed;
                }

                player.x = Math.max(20, Math.min(canvas.width - player.size - 20, player.x));
                player.y = Math.max(100, Math.min(canvas.height - player.size - 20, player.y));
            }

            // Animasi Frame Arya
            if (player.isWalking) {
                player.frameTimer++;
                if (player.frameTimer >= 8) {
                    player.frameIndex = (player.frameIndex + 1) % 3;
                    player.frameTimer = 0;
                }
            } else {
                player.frameIndex = 1;
            }

            // --- STATE MACHINE ALUR GAME ---
            if (gameState === 'EXPLORE_RT') {
                const distToRt = Math.hypot(player.x - pakRt.x, player.y - pakRt.y);
                if (distToRt < 90 && keys['e']) {
                    setGameState('RT_DIALOG');
                }
            } else if (gameState === 'PUNGLI_APPROACH') {
                enemy.isWalking = true;
                enemy.facingDirection = 'left';
                const targetX = player.x + 90;

                if (enemy.x > targetX) {
                    enemy.x -= enemy.speed * 1.5;
                    enemy.frameTimer++;
                    if (enemy.frameTimer >= 8) {
                        enemy.frameIndex = (enemy.frameIndex + 1) % 3;
                        enemy.frameTimer = 0;
                    }
                } else {
                    enemy.isWalking = false;
                    enemy.frameIndex = 1;
                    setGameState('ENEMY_DIALOG');
                }
            } else if (gameState === 'PLAYING') {
                // Oknum Pungli Mengejar Arya dengan Penyesuaian Arah Presisi
                enemy.isWalking = true;
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;

                if (Math.abs(dx) > Math.abs(dy)) {
                    enemy.facingDirection = dx > 0 ? 'right' : 'left';
                } else {
                    enemy.facingDirection = dy > 0 ? 'down' : 'up';
                }

                if (enemy.x < player.x) enemy.x += enemy.speed;
                if (enemy.x > player.x) enemy.x -= enemy.speed;
                if (enemy.y < player.y) enemy.y += enemy.speed;
                if (enemy.y > player.y) enemy.y -= enemy.speed;

                enemy.frameTimer++;
                if (enemy.frameTimer >= 8) {
                    enemy.frameIndex = (enemy.frameIndex + 1) % 3;
                    enemy.frameTimer = 0;
                }

                // Aksi Merekam HP
                if (player.attackTimer > 0) {
                    player.attackTimer--;
                    if (player.attackTimer <= 0) player.isAttacking = false;
                }

                const triggerAttack = () => {
                    if (!player.isAttacking && !player.attackCooldown) {
                        player.isAttacking = true;
                        player.attackTimer = 18;
                        player.attackCooldown = true;

                        const beam = getHpBeamRect(player);
                        if (rectIntersect(beam, enemy)) {
                            enemy.health -= 25;
                            setLastActionText('📱 Sinar HP Arya mengenai Oknum Pungli! (-25 HP)');
                            if (enemy.health <= 0) {
                                setGameState('VICTORY');
                                setLastActionText('Aksi Pungli berhasil kamu viralkan! Oknum Pungli kabur ketakutan.');
                            }
                        } else {
                            setLastActionText('📱 Arya merekam aksi pungli!');
                        }
                        setTimeout(() => { player.attackCooldown = false; }, 300);
                    }
                };

                if (keys['f'] || keys[' ']) triggerAttack();

                if (rectIntersect(player, enemy) && !player.isAttacking) {
                    player.health -= 0.8;
                    setLastActionText('⚠️ Kamu tersudut oleh Oknum Pungli!');
                    if (player.health <= 0) {
                        setGameState('GAMEOVER');
                        setLastActionText('Nyawa perjuanganmu habis! Berkas izin kerjamu ditahan...');
                    }
                }
            }

            // --- RENDER KARAKTER KE CANVAS ---
            renderSpriteSheet(ctx, pakRtImgRef.current, pakRt, 'Pak RT');
            renderSpriteSheet(ctx, enemyImgRef.current, enemy, 'Oknum Pungli');
            renderSpriteSheet(ctx, aryaImgRef.current, player, 'Arya');

            // FX Sinar Kamera HP
            if (player.isAttacking) {
                const beam = getHpBeamRect(player);
                ctx.fillStyle = 'rgba(250, 204, 21, 0.45)';
                ctx.fillRect(beam.x, beam.y, beam.width, beam.height);
                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 2;
                ctx.strokeRect(beam.x, beam.y, beam.width, beam.height);
            }

            // Teks Interaksi
            if (gameState === 'EXPLORE_RT') {
                const distToRt = Math.hypot(player.x - pakRt.x, player.y - pakRt.y);
                if (distToRt < 90) {
                    ctx.fillStyle = '#facc15';
                    ctx.font = 'bold 14px monospace';
                    ctx.fillText('[ Tekan E untuk Bicara dengan Pak RT ]', pakRt.x - 120, pakRt.y - 45);
                }
            }

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        gameLoop();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            cancelAnimationFrame(animationFrameId);
        };
    }, [gameState]);

    const restartGame = () => {
        playerRef.current = {
            ...playerRef.current,
            x: 200, y: 350, health: 100, isWalking: false, facingDirection: 'down', frameIndex: 1
        };
        enemyRef.current = {
            ...enemyRef.current,
            x: 950, y: 350, health: 100, isWalking: false, facingDirection: 'left', frameIndex: 1
        };
        setPlayerMoney(200000);
        setGameState('EXPLORE_RT');
        setLastActionText('');
    };

    const handleSurrender = () => {
        const denda = 150000;
        setPlayerMoney((prev) => Math.max(0, prev - denda));
        setGameState('GAMEOVER');
        setLastActionText(`Kamu memilih menyerah dan membayar denda/pelicin sebesar Rp ${denda.toLocaleString('id-ID')}. Birokrasi menang!`);
    };

    const getHpBeamRect = (p) => {
        const reach = 170, width = 36;
        if (p.facingDirection === 'right') return { x: p.x + p.size, y: p.y + (p.size - width) / 2, width: reach, height: width };
        if (p.facingDirection === 'left') return { x: p.x - reach, y: p.y + (p.size - width) / 2, width: reach, height: width };
        if (p.facingDirection === 'up') return { x: p.x + (p.size - width) / 2, y: p.y - reach, width: width, height: reach };
        return { x: p.x + (p.size - width) / 2, y: p.y + p.size, width: width, height: reach };
    };

    const rectIntersect = (r1, r2) => {
        const w1 = r1.width || r1.size, h1 = r1.height || r1.size;
        const w2 = r2.width || r2.size, h2 = r2.height || r2.size;
        return r1.x < r2.x + w2 && r1.x + w1 > r2.x && r1.y < r2.y + h2 && r1.y + h1 > r2.y;
    };

    // FUNGSI RENDER SPRITE DENGAN PEMETAAN BARIS STANDAR UNIFORM
    const renderSpriteSheet = (ctx, img, entity, label) => {
        if (img) {
            const frameW = img.naturalWidth / 3;
            const frameH = img.naturalHeight / 4;

            let row = 0;
            if (entity.facingDirection === 'down') row = 0;
            if (entity.facingDirection === 'left') row = 1;
            if (entity.facingDirection === 'right') row = 2;
            if (entity.facingDirection === 'up') row = 3;

            const srcX = entity.frameIndex * frameW;
            const srcY = row * frameH;

            ctx.drawImage(
                img,
                srcX, srcY, frameW, frameH,
                entity.x, entity.y, entity.size, entity.size * 1.15
            );
        } else {
            ctx.fillStyle = label === 'Arya' ? '#22c55e' : label === 'Pak RT' ? '#3b82f6' : '#ef4444';
            ctx.fillRect(entity.x, entity.y, entity.size, entity.size);
        }

        if (entity.health !== undefined) {
            const pct = Math.max(0, entity.health / entity.maxHealth);
            const barW = entity.size + 10, barH = 5;
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(entity.x - (barW - entity.size) / 2, entity.y - 10, barW, barH);
            ctx.fillStyle = label === 'Arya' ? '#22c55e' : '#facc15';
            ctx.fillRect(entity.x - (barW - entity.size) / 2, entity.y - 10, barW * pct, barH);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        const textW = ctx.measureText(label).width;
        ctx.fillText(label, entity.x + (entity.size - textW) / 2, entity.y - 16);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white p-4 font-mono select-none">
            <div className="mb-3 flex items-center justify-between w-full max-w-[1024px] bg-neutral-900 border-2 border-neutral-700 px-4 py-2.5 rounded-xl shadow-xl z-10">
                <div className="flex items-center gap-4">
                    <span className="px-2.5 py-1 bg-yellow-500/25 border border-yellow-500 text-yellow-400 text-xs font-bold rounded-md">
                        LEVEL 1
                    </span>
                    <h1 className="text-base font-bold tracking-wide text-white">
                        SURVIVAL WNI : Pungli Surat Izin Kerja
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="px-3 py-1 bg-emerald-950 border border-emerald-600 text-emerald-400 text-xs font-bold rounded-lg">
                        💵 Uang Arya: Rp {playerMoney.toLocaleString('id-ID')}
                    </div>
                    <button
                        onClick={() => router.push('/menu')}
                        className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs border border-neutral-600 rounded-lg transition"
                    >
                        ← Keluar
                    </button>
                </div>
            </div>

            <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 z-0">
                <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

                {/* DIALOG PAK RT YANG DIPERPANJANG & LEBIH NARATIF */}
                {gameState === 'RT_DIALOG' && (
                    <div className="absolute bottom-6 left-6 right-6 bg-neutral-900/95 border-2 border-yellow-500 p-5 rounded-xl shadow-2xl backdrop-blur z-20 max-w-4xl mx-auto">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-yellow-400 text-sm">Pak RT Setempat</span>
                            <span className="text-[11px] text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-700/50">📍 Pos Ronda</span>
                        </div>
                        <p className="text-sm text-neutral-200 italic leading-relaxed my-2">
                            "Nak Arya, mau ngurus surat izin kerja ke kelurahan ya? Ingat pesan bapak, birokrasi di sana kadang sengaja dibuat berbelit-belit kalau kamu tidak menyelipkan 'amplop pelicin' untuk para oknum. Jangan biarkan integritasmu luntur!"
                        </p>
                        <p className="text-xs text-green-400 font-bold mb-4">
                            Arya: "Terima kasih banyak infonya, Pak RT. Saya tidak akan menyerah begitu saja, ijazah SMK dan hak kerja saya akan saya perjuangkan secara bersih!"
                        </p>
                        <button
                            onClick={() => setGameState('PUNGLI_APPROACH')}
                            className="w-full py-2.5 bg-yellow-600 hover:bg-yellow-500 text-neutral-950 text-xs font-bold rounded-lg transition tracking-wider border-b-2 border-yellow-800"
                        >
                            LANJUT (BERANGKAT KE GERBANG KELURAHAN) →
                        </button>
                    </div>
                )}

                {/* DIALOG OKNUM PUNGLI YANG DIPERPANJANG & DRAMATIS */}
                {gameState === 'ENEMY_DIALOG' && (
                    <div className="absolute bottom-6 left-6 right-6 bg-neutral-900/95 border-2 border-red-500 p-5 rounded-xl shadow-2xl backdrop-blur z-20 max-w-4xl mx-auto">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-red-400 text-sm">Oknum Pungli Kelurahan</span>
                            <span className="text-[11px] text-rose-300 bg-rose-950/80 px-2.5 py-0.5 rounded border border-rose-700/50">📍 Pintu Masuk Kelurahan</span>
                        </div>
                        <p className="text-sm text-neutral-200 italic leading-relaxed my-2">
                            "Stop! Mau lewat? Jangan harap berkas izin kerjamu diproses kalau kamu tidak membayar uang administrasi kilat sebesar Rp 150.000 secara tunai sekarang juga di tempat ini!"
                        </p>
                        <p className="text-xs text-green-400 font-bold mb-4">
                            Arya: "Pungutan liar macam apa ini?! Jelas-jelas aturan resminya gratis! Saya tidak akan membiarkan praktik korupsi kecil ini merusak masa depan rakyat!"
                        </p>
                        <button
                            onClick={() => setGameState('FIGHT_CHOICE')}
                            className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition tracking-wider border-b-2 border-red-800"
                        >
                            AMBIL KEPUTUSAN TEGAS! ⚡
                        </button>
                    </div>
                )}

                {gameState === 'FIGHT_CHOICE' && (
                    <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                        <h2 className="text-2xl font-bold text-yellow-400 mb-2">PILIH LANGKAH ARYA!</h2>
                        <p className="text-xs text-neutral-300 max-w-lg mb-6 leading-relaxed">
                            Oknum pungli memaksa meminta uang pelicin. Selamatkan ijazah SMK dengan merekam dan memviralkan tindakan mereka!
                        </p>
                        <div className="flex flex-col gap-4 w-full max-w-md">
                            <button
                                onClick={() => {
                                    setGameState('PLAYING');
                                    setLastActionText('GUNAKAN WASD UNTUK LARI & TEKAN F / SPACE UNTUK MEREKAM HP!');
                                }}
                                className="py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl border-b-4 border-blue-800 transition shadow-lg flex items-center justify-center gap-2"
                            >
                                <span>⚔️</span> 📱 LAWAN & VIRALKAN (Kekuatan Warganet)
                            </button>
                            <button
                                onClick={handleSurrender}
                                className="py-3.5 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-xl border-b-4 border-red-900 transition shadow-lg flex items-center justify-center gap-2"
                            >
                                <span>💸</span> 🏳️ Menyerah (Bayar Uang Pelicin)
                            </button>
                        </div>
                    </div>
                )}

                {gameState === 'VICTORY' && (
                    <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                        <h2 className="text-3xl font-bold text-green-400 mb-3">LEVEL 1 BERHASIL DITAKLUKKAN! 🎉</h2>
                        <p className="text-sm text-neutral-200 max-w-md mb-6 leading-relaxed">{lastActionText}</p>
                        <button
                            onClick={() => router.push('/menu')}
                            className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800 shadow-xl"
                        >
                            Lanjut ke Level Berikutnya →
                        </button>
                    </div>
                )}

                {gameState === 'GAMEOVER' && (
                    <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                        <h2 className="text-3xl font-bold text-red-500 mb-3">GAGAL & TERJEBAK PUNGLI!</h2>
                        <p className="text-sm text-neutral-200 max-w-md mb-6 leading-relaxed">{lastActionText}</p>
                        <div className="flex gap-4">
                            <button
                                onClick={restartGame}
                                className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800"
                            >
                                Coba Lagi
                            </button>
                            <button
                                onClick={() => router.push('/menu')}
                                className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl border border-neutral-600"
                            >
                                Kembali ke Menu
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {gameState === 'PLAYING' && (
                <div className="mt-3 p-2.5 w-full max-w-[1024px] bg-neutral-900 border border-neutral-700 rounded-xl text-center text-xs text-yellow-400 tracking-wider shadow-md z-10">
                    {lastActionText || "Arahkan Arya (WASD) & Tekan F / Space untuk merekam Oknum Pungli!"}
                </div>
            )}
        </div>
    );
}