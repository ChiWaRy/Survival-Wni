// src/app/level2/page.js
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Level2Page() {
    const router = useRouter();
    const canvasRef = useRef(null);

    const [gameState, setGameState] = useState('STORY_INTRO');
    const [dialogIndex, setDialogIndex] = useState(0);
    const [playerMoney, setPlayerMoney] = useState(200000);
    const [lastActionText, setLastActionText] = useState('');

    const introDialogs = [
        { speaker: "Arya", text: "Akhirnya surat pengantar dari kelurahan sudah di tangan. Hari ini aku ada jadwal wawancara kerja di PT. Maju Mundur Sentosa." },
        { speaker: "Arya", text: "Kakek pasti bangga kalau aku bisa diterima kerja di pabrik ini. Aku harus bertanya ke Satpam dulu di mana ruangan HRD-nya." }
    ];

    const handleNextDialog = () => {
        if (dialogIndex < introDialogs.length - 1) {
            setDialogIndex(dialogIndex + 1);
        } else {
            setGameState('MISSION_OVERLAY');
        }
    };

    const aryaImgRef = useRef(null);
    const satpamImgRef = useRef(null);
    const hrdImgRef = useRef(null);

    const playerRef = useRef({
        x: 0, y: 0, size: 72, speed: 4, health: 100, maxHealth: 100, facingDirection: 'up',
        isWalking: false, frameIndex: 1, frameTimer: 0, isAttacking: false, attackTimer: 0, attackCooldown: false,
    });

    const satpamRef = useRef({ x: 550, y: 350, size: 72, facingDirection: 'down', frameIndex: 1, frameTimer: 0 });

    // Bos Level 2: Lebih tebal (150 HP) dan sedikit lebih cepat
    const hrdRef = useRef({ x: 150, y: 150, size: 72, speed: 2.5, health: 150, maxHealth: 150, facingDirection: 'down', isWalking: false, frameIndex: 1, frameTimer: 0 });

    const keysRef = useRef({});

    useEffect(() => {
        const handleKeyDown = (e) => { keysRef.current[e.key.toLowerCase()] = true; };
        const handleKeyUp = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

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
                    if (data[i] > 220 && data[i + 1] > 220 && data[i + 2] > 220) {
                        data[i + 3] = 0;
                    }
                }
                tempCtx.putImageData(imgData, 0, 0);
                const processedImg = new Image();
                processedImg.src = tempCanvas.toDataURL();
                processedImg.onload = () => { ref.current = processedImg; };
            };
        };

        // Memanfaatkan aset gambar yang sudah ada di folder public/assets
        loadTransparentImage('/assets/arya.jpg', aryaImgRef);
        loadTransparentImage('/assets/pak_rt.jpg', satpamImgRef); // Pak RT jadi Satpam sementara
        loadTransparentImage('/assets/petugas_pungli.jpg', hrdImgRef); // Pungli jadi HRD

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            if (playerRef.current.x === 0) {
                playerRef.current.x = canvas.width / 2 + 100;
                playerRef.current.y = canvas.height - 150;
            }
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        let animationFrameId;

        const gameLoop = () => {
            const player = playerRef.current;
            const satpam = satpamRef.current;
            const hrd = hrdRef.current;
            const keys = keysRef.current;

            // ==========================================
            // MENGGAMBAR INTERIOR KANTOR (Procedural)
            // ==========================================
            ctx.fillStyle = '#f8fafc'; // Lantai ubin putih/abu terang
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Garis ubin lantai
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 2;
            for (let i = 0; i < canvas.width; i += 64) {
                ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
            }
            for (let i = 0; i < canvas.height; i += 64) {
                ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
            }

            // Dinding Atas
            ctx.fillStyle = '#334155';
            ctx.fillRect(0, 0, canvas.width, 80);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 70, canvas.width, 10);

            // Sekat Ruangan HRD (Kiri Atas)
            const hrdRoomW = 400;
            const hrdRoomH = 350;
            ctx.fillStyle = '#475569';
            ctx.fillRect(0, 80, hrdRoomW, 15); // Dinding atas ruangan HRD
            ctx.fillRect(hrdRoomW, 80, 15, hrdRoomH); // Dinding kanan ruangan HRD

            // Pintu HRD
            const doorY = 250;
            ctx.fillStyle = '#f8fafc'; // Hapus dinding untuk pintu
            ctx.fillRect(hrdRoomW, doorY, 15, 100);
            ctx.fillStyle = '#94a3b8'; // Karpet Pintu
            ctx.fillRect(hrdRoomW - 20, doorY, 55, 100);

            if (gameState !== 'BOSS_FIGHT' && gameState !== 'PLAYING') {
                ctx.fillStyle = '#facc15'; ctx.font = 'bold 12px monospace';
                ctx.fillText('RUANG HRD', hrdRoomW - 35, doorY - 10);
            }

            // Meja Resepsionis / Satpam (Kanan)
            const deskX = 500; const deskY = 400; const deskW = 200; const deskH = 60;
            ctx.fillStyle = '#b45309';
            ctx.fillRect(deskX, deskY, deskW, deskH);
            ctx.fillStyle = '#78350f';
            ctx.fillRect(deskX + 10, deskY + 10, deskW - 20, deskH - 20);

            // Pot Tanaman Hias
            const drawPlant = (px, py) => {
                ctx.fillStyle = '#166534'; ctx.beginPath(); ctx.arc(px, py, 25, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(px, py, 18, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2); ctx.fill();
            };
            drawPlant(80, 130);
            drawPlant(deskX - 40, deskY + 30);
            drawPlant(deskX + deskW + 40, deskY + 30);

            // ==========================================
            // LOGIKA PERGERAKAN & KOLISI
            // ==========================================
            player.isWalking = false;

            if (gameState === 'EXPLORE_LOBBY' || gameState === 'WALK_TO_HRD' || gameState === 'PLAYING') {
                let dx = 0; let dy = 0;
                if (keys['w'] || keys['arrowup']) { dy -= 1; player.facingDirection = 'up'; }
                if (keys['s'] || keys['arrowdown']) { dy += 1; player.facingDirection = 'down'; }
                if (keys['a'] || keys['arrowleft']) { dx -= 1; player.facingDirection = 'left'; }
                if (keys['d'] || keys['arrowright']) { dx += 1; player.facingDirection = 'right'; }

                if (dx !== 0 || dy !== 0) {
                    player.isWalking = true;
                    const length = Math.hypot(dx, dy);
                    const nextX = player.x + (dx / length) * player.speed;
                    const nextY = player.y + (dy / length) * player.speed;

                    let canMove = true;

                    // Kolisi Dinding Atas
                    if (nextY < 80) canMove = false;

                    // Kolisi Layar
                    if (nextX < 0 || nextX > canvas.width - player.size) canMove = false;
                    if (nextY > canvas.height - player.size) canMove = false;

                    // Kolisi Meja Satpam
                    const playerBox = { x: nextX, y: nextY, width: player.size, height: player.size };
                    const deskBox = { x: deskX, y: deskY, width: deskW, height: deskH };
                    if (rectIntersect(playerBox, deskBox)) canMove = false;

                    // Kolisi Dinding HRD
                    if (nextX < hrdRoomW + 15 && nextY < 80 + hrdRoomH) {
                        // Cek apakah melewati pintu?
                        if (!(nextY >= doorY && nextY + player.size <= doorY + 100 && nextX > hrdRoomW - 40 && nextX < hrdRoomW + 30)) {
                            // Jika tidak pas di pintu dan mencoba masuk area dinding HRD, blokir
                            if (nextX < hrdRoomW + 15 && player.x >= hrdRoomW + 15) canMove = false; // nabrak dari kanan
                            if (nextY < 80 + hrdRoomH && player.y >= 80 + hrdRoomH && nextX < hrdRoomW + 15) canMove = false; // nabrak dari bawah
                        }
                    }

                    if (canMove) {
                        player.x = nextX;
                        player.y = nextY;
                    }
                }
            }

            if (player.isWalking) {
                player.frameTimer++;
                if (player.frameTimer >= 8) { player.frameIndex = (player.frameIndex + 1) % 3; player.frameTimer = 0; }
            } else {
                player.frameIndex = 1;
            }

            // ==========================================
            // TRIGGER EVENT CERITA
            // ==========================================
            if (gameState === 'EXPLORE_LOBBY') {
                const distToSatpam = Math.hypot(player.x - satpam.x, player.y - satpam.y);
                if (distToSatpam < 120) {
                    ctx.fillStyle = '#facc15'; ctx.font = 'bold 13px monospace';
                    ctx.fillText('[ Tekan E untuk Bertanya pada Satpam ]', satpam.x - 90, satpam.y - 15);
                    if (keys['e']) setGameState('SATPAM_DIALOG');
                }
            } else if (gameState === 'WALK_TO_HRD') {
                // Jika Arya masuk ke dalam ruangan HRD (melewati batas x)
                if (player.x < hrdRoomW - 50 && player.y < 80 + hrdRoomH) {
                    setGameState('HRD_DIALOG');
                }
            } else if (gameState === 'PLAYING') {
                hrd.isWalking = true;
                const dx = player.x - hrd.x; const dy = player.y - hrd.y;
                if (Math.abs(dx) > Math.abs(dy)) { hrd.facingDirection = dx > 0 ? 'right' : 'left'; }
                else { hrd.facingDirection = dy > 0 ? 'down' : 'up'; }

                let nextHrdX = hrd.x; let nextHrdY = hrd.y;
                if (hrd.x < player.x) nextHrdX += hrd.speed;
                if (hrd.x > player.x) nextHrdX -= hrd.speed;
                if (hrd.y < player.y) nextHrdY += hrd.speed;
                if (hrd.y > player.y) nextHrdY -= hrd.speed;

                // Simple collision for HRD so he doesn't get stuck entirely on desk
                const hrdBox = { x: nextHrdX, y: nextHrdY, width: hrd.size, height: hrd.size };
                const deskBox = { x: deskX, y: deskY, width: deskW, height: deskH };

                if (!rectIntersect(hrdBox, deskBox) && nextHrdY > 80) {
                    hrd.x = nextHrdX;
                    hrd.y = nextHrdY;
                } else {
                    // Sliding if stuck on desk
                    if (!rectIntersect({ x: nextHrdX, y: hrd.y, width: hrd.size, height: hrd.size }, deskBox)) hrd.x = nextHrdX;
                    if (!rectIntersect({ x: hrd.x, y: nextHrdY, width: hrd.size, height: hrd.size }, deskBox)) hrd.y = nextHrdY;
                }

                hrd.frameTimer++;
                if (hrd.frameTimer >= 8) { hrd.frameIndex = (hrd.frameIndex + 1) % 3; hrd.frameTimer = 0; }

                if (player.attackTimer > 0) {
                    player.attackTimer--; if (player.attackTimer <= 0) player.isAttacking = false;
                }

                const triggerAttack = () => {
                    if (!player.isAttacking && !player.attackCooldown) {
                        player.isAttacking = true; player.attackTimer = 18; player.attackCooldown = true;
                        const beam = getHpBeamRect(player);
                        if (rectIntersect(beam, hrd)) {
                            hrd.health -= 25; setLastActionText('📱 Bukti terekam! Mental HRD menurun! (-25 HP)');
                            if (hrd.health <= 0) {
                                setGameState('VICTORY');
                                setLastActionText('Praktik Orang Dalam berhasil kamu bongkar! Perusahaan memecat Oknum HRD tersebut.');
                            }
                        } else {
                            setLastActionText('📱 Arya merekam aksi HRD!');
                        }
                        setTimeout(() => { player.attackCooldown = false; }, 300);
                    }
                };

                if (keys['f'] || keys[' ']) triggerAttack();

                if (rectIntersect(player, hrd) && !player.isAttacking) {
                    player.health -= 1; // Damage lebih sakit
                    setLastActionText('⚠️ Dokumen lamaranmu mau disobek Oknum HRD!');
                    if (player.health <= 0) {
                        setGameState('GAMEOVER');
                        setLastActionText('Mentalmu hancur! Kamu diusir dari perusahaan karena menolak bayar Ordal.');
                    }
                }
            }

            // ==========================================
            // RENDER SPRITES
            // ==========================================
            renderSpriteSheet(ctx, satpamImgRef.current, satpam, 'Satpam');

            if (gameState === 'HRD_DIALOG' || gameState === 'FIGHT_CHOICE' || gameState === 'PLAYING') {
                renderSpriteSheet(ctx, hrdImgRef.current, hrd, 'Oknum HRD');
            }

            renderSpriteSheet(ctx, aryaImgRef.current, player, 'Arya');

            if (player.isAttacking) {
                const beam = getHpBeamRect(player);
                ctx.fillStyle = 'rgba(59, 130, 246, 0.45)'; // Warna beam biru muda (Flash HP)
                ctx.fillRect(beam.x, beam.y, beam.width, beam.height);
                ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2; ctx.strokeRect(beam.x, beam.y, beam.width, beam.height);
            }

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        gameLoop();

        return () => { window.removeEventListener('resize', resizeCanvas); cancelAnimationFrame(animationFrameId); };
    }, [gameState]);

    const restartGame = () => {
        const canvas = canvasRef.current;
        playerRef.current = { ...playerRef.current, x: canvas ? canvas.width / 2 + 100 : 400, y: canvas ? canvas.height - 150 : 500, health: 100, isWalking: false, facingDirection: 'up', frameIndex: 1 };
        hrdRef.current = { ...hrdRef.current, x: 150, y: 150, health: 150, isWalking: false, facingDirection: 'down', frameIndex: 1 };
        setPlayerMoney(200000); setGameState('EXPLORE_LOBBY'); setDialogIndex(0); setLastActionText('');
    };

    const handleSurrender = () => {
        const denda = 200000; setPlayerMoney((prev) => Math.max(0, prev - denda));
        setGameState('GAMEOVER'); setLastActionText(`Kamu memilih bayar "Uang Rokok" Rp ${denda.toLocaleString('id-ID')} ke HRD. Tapi tabunganmu habis dan perusahaan ini terbukti toxic!`);
    };

    const getHpBeamRect = (p) => {
        const reach = 170, width = 36;
        if (p.facingDirection === 'right') return { x: p.x + p.size, y: p.y + (p.size - width) / 2, width: reach, height: width };
        if (p.facingDirection === 'left') return { x: p.x - reach, y: p.y + (p.size - width) / 2, width: reach, height: width };
        if (p.facingDirection === 'up') return { x: p.x + (p.size - width) / 2, y: p.y - reach, width: width, height: reach };
        return { x: p.x + (p.size - width) / 2, y: p.y + p.size, width: width, height: reach };
    };

    const rectIntersect = (r1, r2) => {
        const w1 = r1.width || r1.size, h1 = r1.height || r1.size; const w2 = r2.width || r2.size, h2 = r2.height || r2.size;
        return r1.x < r2.x + w2 && r1.x + w1 > r2.x && r1.y < r2.y + h2 && r1.y + h1 > r2.y;
    };

    const renderSpriteSheet = (ctx, img, entity, label) => {
        if (img) {
            const frameW = img.naturalWidth / 3, frameH = img.naturalHeight / 4;
            let row = 0;
            if (entity.facingDirection === 'down') row = 0; if (entity.facingDirection === 'left') row = 1; if (entity.facingDirection === 'right') row = 2; if (entity.facingDirection === 'up') row = 3;
            ctx.drawImage(img, entity.frameIndex * frameW, row * frameH, frameW, frameH, entity.x, entity.y, entity.size, entity.size * 1.15);
        } else {
            ctx.fillStyle = label === 'Arya' ? '#22c55e' : label === 'Oknum HRD' ? '#ef4444' : '#3b82f6';
            ctx.fillRect(entity.x, entity.y, entity.size, entity.size);
        }

        if (entity.health !== undefined) {
            const pct = Math.max(0, entity.health / entity.maxHealth); const barW = entity.size + 10, barH = 5;
            ctx.fillStyle = '#ef4444'; ctx.fillRect(entity.x - (barW - entity.size) / 2, entity.y - 10, barW, barH);
            ctx.fillStyle = label === 'Arya' ? '#22c55e' : '#facc15'; ctx.fillRect(entity.x - (barW - entity.size) / 2, entity.y - 10, barW * pct, barH);
        }

        ctx.fillStyle = '#0f172a'; ctx.font = 'bold 12px monospace'; const textW = ctx.measureText(label).width;
        ctx.fillText(label, entity.x + (entity.size - textW) / 2, entity.y - 16);
    };

    return (
        <div className="relative w-screen h-screen bg-neutral-950 text-white font-mono select-none overflow-hidden">
            {/* HUD HEADER */}
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between bg-neutral-900/90 border border-neutral-700 px-5 py-3 rounded-xl shadow-xl backdrop-blur">
                <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-blue-500/25 border border-blue-500 text-blue-400 text-xs font-bold rounded-md">
                        LEVEL 2
                    </span>
                    <h1 className="text-sm font-bold tracking-wide text-white">
                        SURVIVAL WNI : Loker Jalur Orang Dalam
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="px-3 py-1 bg-emerald-950 border border-emerald-600 text-emerald-400 text-xs font-bold rounded-lg">
                        💵 Uang Arya: Rp {playerMoney.toLocaleString('id-ID')}
                    </div>
                    <button onClick={() => router.push('/game')} className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs border border-neutral-600 rounded-lg transition cursor-pointer">
                        ← Kembali
                    </button>
                </div>
            </div>

            <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full z-0" />

            {/* DIALOG INTRO */}
            {gameState === 'STORY_INTRO' && (
                <div className="absolute bottom-8 left-8 right-8 bg-neutral-900/95 border-2 border-blue-500 p-6 rounded-2xl shadow-2xl backdrop-blur z-20 max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-sm px-3 py-1 rounded bg-blue-600 text-white">{introDialogs[dialogIndex].speaker}</span>
                        <span className="text-xs text-neutral-400 font-mono">{dialogIndex + 1} / {introDialogs.length}</span>
                    </div>
                    <p className="text-sm text-neutral-100 italic leading-relaxed my-3 min-h-[48px]">"{introDialogs[dialogIndex].text}"</p>
                    <button onClick={handleNextDialog} className="w-full py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs rounded-xl border-b-4 border-blue-700 cursor-pointer">LANJUT ➔</button>
                </div>
            )}

            {/* MISSION OVERLAY */}
            {gameState === 'MISSION_OVERLAY' && (
                <div onClick={() => setGameState('EXPLORE_LOBBY')} className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 cursor-pointer text-center select-none backdrop-blur-md">
                    <div className="max-w-md bg-neutral-900 border border-neutral-700 p-8 rounded-2xl shadow-2xl space-y-5 hover:border-blue-500/50 transition-colors">
                        <div className="w-16 h-16 bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">🏢</div>
                        <h2 className="text-xl font-bold text-blue-400 tracking-wider">MISI UTAMA LEVEL 2</h2>
                        <p className="text-neutral-200 text-sm leading-relaxed">Arya berada di Lobi Pabrik untuk wawancara. Temui <span className="text-yellow-400 font-bold">Satpam</span> di meja resepsionis untuk menanyakan arah ruangan HRD.</p>
                        <div className="pt-4 border-t border-neutral-800"><p className="text-xs text-blue-300 animate-pulse font-mono font-semibold">[ Klik di mana saja untuk mulai berjalan ]</p></div>
                    </div>
                </div>
            )}

            {/* DIALOG SATPAM */}
            {gameState === 'SATPAM_DIALOG' && (
                <div className="absolute bottom-8 left-8 right-8 bg-neutral-900/95 border-2 border-slate-500 p-6 rounded-2xl shadow-2xl backdrop-blur z-20 max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-3">
                        <span className="font-bold text-slate-300 text-base">Komandan Satpam</span>
                        <span className="text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded border border-slate-700">📍 Meja Resepsionis</span>
                    </div>
                    <p className="text-sm text-neutral-200 italic leading-relaxed my-2">"Oh, pelamar baru ya? Langsung saja masuk ke lorong ruangan HRD di sebelah kiri sana. Pintu karpet abu-abu. Hati-hati Dek, HRD di dalam itu suka minta 'Jalur Ordal' kalau mau diloloskan."</p>
                    <button onClick={() => setGameState('WALK_TO_HRD')} className="w-full py-3 bg-slate-600 hover:bg-slate-500 text-white text-xs font-bold rounded-xl border-b-4 border-slate-800 cursor-pointer">MENUJU RUANGAN HRD →</button>
                </div>
            )}

            {gameState === 'WALK_TO_HRD' && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 p-3 bg-neutral-900/90 border border-neutral-700 rounded-xl text-center text-xs text-yellow-400 tracking-wider shadow-2xl backdrop-blur z-20">
                    Masuklah ke dalam Ruangan HRD di sebelah kiri melalui pintu!
                </div>
            )}

            {/* DIALOG HRD */}
            {gameState === 'HRD_DIALOG' && (
                <div className="absolute bottom-8 left-8 right-8 bg-neutral-900/95 border-2 border-red-500 p-6 rounded-2xl shadow-2xl backdrop-blur z-20 max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-3">
                        <span className="font-bold text-red-400 text-base">Oknum HRD Perusahaan</span>
                        <span className="text-xs text-rose-300 bg-rose-950/80 px-3 py-1 rounded border border-rose-700/50">📍 Ruang Interview</span>
                    </div>
                    <p className="text-sm text-neutral-200 italic leading-relaxed my-2">"Wah, hasil tes kamu bagus sekali Arya. Tapi asal kamu tahu, kursi pekerja di sini terbatas. Kalau kamu mau posisi ini 'diamankan', kamu harus bayar biaya penempatan Rp 200.000 sekarang juga. Gimana?"</p>
                    <p className="text-xs text-green-400 font-bold mb-5">Arya: "Ini pemerasan! Saya melamar dengan ijazah dan keahlian yang sah. Praktek kotor Bapak ini akan saya laporkan ke pimpinan!"</p>
                    <button onClick={() => setGameState('FIGHT_CHOICE')} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition tracking-widest border-b-4 border-red-800 cursor-pointer">TOLAK DAN BONGKAR PRAKTIK ORDAL! ⚡</button>
                </div>
            )}

            {/* PILIHAN AKSI FIGHT */}
            {gameState === 'FIGHT_CHOICE' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-2xl font-bold text-blue-400 mb-2">PILIH LANGKAH ARYA!</h2>
                    <p className="text-xs text-neutral-300 max-w-lg mb-6 leading-relaxed">Oknum HRD mencoba merampas kembali dokumenmu! Hindari dia dan rekam bukti pemerasan ini menggunakan HP-mu!</p>
                    <div className="flex flex-col gap-4 w-full max-w-md">
                        <button onClick={() => { setGameState('PLAYING'); setLastActionText('GUNAKAN WASD UNTUK MENGHINDAR & TEKAN F/SPACE UNTUK MEREKAM!'); }} className="py-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl border-b-4 border-blue-800 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer">
                            <span>📱</span> LAWAN DENGAN KAMERA (Bongkar Bukti)
                        </button>
                        <button onClick={handleSurrender} className="py-4 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-xl border-b-4 border-red-900 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer">
                            <span>💸</span> 🏳️ Menyerah (Bayar Uang Pelicin)
                        </button>
                    </div>
                </div>
            )}

            {/* VICTORY SCREEN */}
            {gameState === 'VICTORY' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-3xl font-bold text-green-400 mb-3">LEVEL 2 SELESAI! 🎉</h2>
                    <p className="text-sm text-neutral-200 max-w-md mb-6 leading-relaxed">{lastActionText}</p>
                    <button className="px-8 py-3.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800 shadow-xl cursor-pointer">Lanjut ke Level 3 (Segera Hadir) →</button>
                </div>
            )}

            {/* GAME OVER SCREEN */}
            {gameState === 'GAMEOVER' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-3xl font-bold text-red-500 mb-3">GAGAL MENDAPAT PEKERJAAN!</h2>
                    <p className="text-sm text-neutral-200 max-w-md mb-6 leading-relaxed">{lastActionText}</p>
                    <div className="flex gap-4">
                        <button onClick={restartGame} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800 cursor-pointer">Coba Lagi Level 2</button>
                    </div>
                </div>
            )}

            {gameState === 'PLAYING' && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 p-3 w-full max-w-3xl bg-neutral-900/90 border border-neutral-700 rounded-xl text-center text-xs text-yellow-400 tracking-wider shadow-2xl backdrop-blur z-20">
                    {lastActionText || "Arahkan Arya (WASD) menjauhi HRD & Tekan F/Space untuk merekam bukti!"}
                </div>
            )}
        </div>
    );
}