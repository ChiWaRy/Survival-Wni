// src/app/level6/page.js
// LEVEL 6 : UANG KEAMANAN ORMAS (UMKM)
// Pasar Malam Tradisional: deretan tenda PKL, gerobak gorengan Arya di tengah,
// lampu gantung pasar, tumpukan kotak kayu. Karakter & gaya sama seperti Level 5.
//
// MEKANIK KHUSUS - DEFENSE MODE:
//  - Dua bos (Bang Jampang & Bang Kodak), masing-masing HP 120, Speed 2.2.
//  - Satu bos mengejar Arya, satu bos menyerang Gerobak Gorengan (HP 200).
//  - Arya memancing (aggro) bos penyerang gerobak dengan sinar rekam HP.
//  - Jika HP Gerobak habis (0) -> langsung Game Over.
//
// ALUR: STORY_INTRO -> MISSION_OVERLAY -> IBU_DIALOG (Pak Kumis)
//       -> JUKIR_DIALOG (Duo Ormas) -> FIGHT_CHOICE -> PLAYING -> VICTORY / GAMEOVER
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStats } from '../../lib/useGameStats';

export default function Level6Page() {
    const router = useRouter();
    const canvasRef = useRef(null);

    const [gameState, setGameState] = useState('STORY_INTRO');
    const [dialogIndex, setDialogIndex] = useState(0);
    const [playerMoney, setPlayerMoney] = useState(90000);
    const [lastActionText, setLastActionText] = useState('');
    const [playerHpPct, setPlayerHpPct] = useState(100);
    const [cartHpPct, setCartHpPct] = useState(100);
    const [bossAHpPct, setBossAHpPct] = useState(100);
    const [bossBHpPct, setBossBHpPct] = useState(100);

    // Stats persisten (uang, upgrade sepatu/kamera, HP yang dibawa dari level sebelumnya)
    const stats = useGameStats();
    const statsRef = useRef(stats);
    useEffect(() => { statsRef.current = stats; }, [stats]);

    // ==================================================
    // NASKAH DIALOG LENGKAP (DARI SPEC)
    // ==================================================
    // A. Dialog Intro Level 6 (Di Dekat Gerobak - Arya)
    const introDialogs = [
        { speaker: "Arya", text: "Alhamdulillah, hari ketiga jualan gorengan di pasar malam ini makin laris. Kalau konsisten begini, bulan depan bisa belikan Kakek kasur baru." },
        { speaker: "Arya", text: "Eh, kenapa pedagang-pedagang di depan tiba-tiba pada buru-buru merapikan dagangannya ya? Aku tanya Pak Kumis di sebelah deh." },
    ];

    // B. Dialog Informan (Lapak Sebelah - Arya & Pak Kumis)
    const ibuDialogs = [
        { speaker: "Pak Kumis", text: "Arya! Cepat matikan lampu gerobakmu, pura-pura sudah tutup saja!" },
        { speaker: "Arya", text: "Loh, kenapa memangnya Pak Kumis? Gorengan saya baru saja matang satu wajan." },
        { speaker: "Pak Kumis", text: "Itu lihat di ujung pasar, dua oknum anggota Ormas 'Macan Komplek' lagi keliling narik jatah bulanan. Kalau lihat ada pedagang baru yang ramai kayak kamu, palakannya bisa berkali-kali lipat!" },
        { speaker: "Arya", text: "Saya kan sudah bayar retribusi resmi ke pengelola pasar, Pak. Masa harus bayar ke mereka juga?" },
        { speaker: "Pak Kumis", text: "Mereka nggak peduli surat pasar, Nak. Kemarin gerobak tukang martabak dibalik sampai minyak panasnya tumpah semua karena nolak bayar. Hati-hati, mereka berdua sudah jalan ke arah sini!" },
    ];

    // C. Dialog Konfrontasi Bos (Lapak Gorengan - Arya & Duo Oknum Ormas)
    const bossDialogs = [
        { speaker: "Bang Jampang", text: "Wuih, bau gorengan sedap nih! Pedagang baru ya lu? Kok buka lapak di wilayah kekuasaan kita belum ada 'salam tempel' ke markas?" },
        { speaker: "Arya", text: "Selamat malam, Bang. Saya pedagang resmi di sini, sudah izin dan bayar retribusi kebersihan ke pengelola pasar." },
        { speaker: "Bang Kodak", text: "Itu urusan sampah! Yang jaga keamanan pasar ini dari maling siapa? Ormas kita! Sekarang lu bayar uang pangkal keamanan Rp150.000, ditambah iuran wajib mingguan!" },
        { speaker: "Arya", text: "Untung jualan gorengan seribu-dua ribu itu tipis sekali, Bang! Kalau dipalak sebesar itu, saya dan Kakek saya makan apa?!" },
        { speaker: "Bang Jampang", text: "Banyak alasan lu! Kodak, hancurin aja gerobak gorengannya biar dia tahu rasa gimana nasibnya kalau nggak punya pelindung!" },
        { speaker: "Arya", text: "Jangan sentuh gerobak saya! Kalian bukan pelindung masyarakat, kalian cuma pemeras UMKM! Akan saya rekam wajah kalian berdua!" },
    ];

    const getActiveDialogs = () => {
        if (gameState === 'STORY_INTRO') return introDialogs;
        if (gameState === 'IBU_DIALOG') return ibuDialogs;
        if (gameState === 'JUKIR_DIALOG') return bossDialogs;
        return [];
    };

    const handleNextDialog = () => {
        const list = getActiveDialogs();
        if (dialogIndex < list.length - 1) {
            setDialogIndex(dialogIndex + 1);
        } else {
            if (gameState === 'STORY_INTRO') setGameState('MISSION_OVERLAY');
            else if (gameState === 'IBU_DIALOG') setGameState('JUKIR_DIALOG');
            else if (gameState === 'JUKIR_DIALOG') setGameState('FIGHT_CHOICE');
        }
    };

    // ==================================================
    // REF ASSET & ENTITAS
    // ==================================================
    const aryaImgRef = useRef(null);
    const kumisImgRef = useRef(null);
    const ormasImgRef = useRef(null);
    const extTilesetRef = useRef(null);

    // Arya (Player): HP 100, Speed 4.0
    const playerRef = useRef({
        x: 0, y: 0, size: 66, colSize: 42, speed: 4.0, health: 100, maxHealth: 100,
        facingDirection: 'down', isWalking: false, frameIndex: 1, frameTimer: 0, isAttacking: false, attackTimer: 0,
    });

    // Pak Kumis (NPC Informan)
    const kumisRef = useRef({ x: 0, y: 0, size: 66, colSize: 42, facingDirection: 'down', frameIndex: 1, frameTimer: 0 });

    // Duo Oknum Ormas (bos ganda): masing-masing HP 120, Speed 2.2
    const bossARef = useRef({
        x: 0, y: 0, size: 66, colSize: 42, speed: 2.2, health: 120, maxHealth: 120,
        facingDirection: 'down', isWalking: false, frameIndex: 1, frameTimer: 0,
        role: 'chase', aggro: 0, dmgCd: 0, label: 'Bang Jampang',
    });
    const bossBRef = useRef({
        x: 0, y: 0, size: 66, colSize: 42, speed: 2.2, health: 120, maxHealth: 120,
        facingDirection: 'down', isWalking: false, frameIndex: 1, frameTimer: 0,
        role: 'cart', aggro: 0, dmgCd: 0, label: 'Bang Kodak',
    });

    // Gerobak Gorengan Arya (objek yang harus dilindungi): HP 200
    const cartRef = useRef({ x: 0, y: 0, width: 120, height: 92, health: 200, maxHealth: 200 });

    const keysRef = useRef({});
    const initedRef = useRef(false);
    const ouchCdRef = useRef(0);

    useEffect(() => {
        const handleKeyDown = (e) => { keysRef.current[e.key.toLowerCase()] = true; };
        const handleKeyUp = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Load karakter (hapus background putih) - gaya sama Level 5
        const loadCharImage = (src, ref) => {
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
                    if (data[i] > 220 && data[i + 1] > 220 && data[i + 2] > 220) data[i + 3] = 0;
                }
                tempCtx.putImageData(imgData, 0, 0);
                const processedImg = new Image();
                processedImg.src = tempCanvas.toDataURL();
                processedImg.onload = () => { ref.current = processedImg; };
            };
        };

        loadCharImage('/assets/arya.jpg', aryaImgRef);           // Arya (Player)
        loadCharImage('/assets/pak_rt.jpg', kumisImgRef);        // Pak Kumis
        loadCharImage('/assets/petugas_pungli.jpg', ormasImgRef); // Duo Oknum Ormas

        const extTilesetImg = new Image();
        extTilesetImg.src = '/assets/tilemap_packed.png';
        extTilesetImg.onload = () => { extTilesetRef.current = extTilesetImg; };

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
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        let animationFrameId;

        const gameLoop = () => {
            const W = canvas.width;
            const H = canvas.height;
            const player = playerRef.current;
            const kumis = kumisRef.current;
            const bA = bossARef.current;
            const bB = bossBRef.current;
            const cart = cartRef.current;
            const keys = keysRef.current;

            // ---------- Area pasar ----------
            const padTop = 96, padX = 46, padBottom = 40;
            const area = { x: padX, y: padTop, w: W - padX * 2, h: H - padTop - padBottom };

            const cartW = Math.min(150, area.w * 0.16);
            const cartH = cartW * 0.72;
            cart.width = cartW; cart.height = cartH;

            // bentuk rintangan (koordinat layar) : tenda, kotak kayu, gerobak
            const tents = [
                { x: area.x + area.w * 0.02, y: area.y + area.h * 0.03, w: cartW * 1.05, h: cartH * 0.62, label: 'TENDA' },
                { x: area.x + area.w * 0.26, y: area.y + area.h * 0.02, w: cartW * 1.05, h: cartH * 0.62, label: 'TENDA' },
                { x: area.x + area.w * 0.70, y: area.y + area.h * 0.02, w: cartW * 1.05, h: cartH * 0.62, label: 'TENDA' },
                { x: area.x + area.w * 0.90, y: area.y + area.h * 0.34, w: cartW * 0.95, h: cartH * 0.62, label: 'TENDA' },
            ];
            const crates = [
                { x: area.x + area.w * 0.10, y: area.y + area.h * 0.62, w: 48, h: 48 },
                { x: area.x + area.w * 0.34, y: area.y + area.h * 0.80, w: 48, h: 48 },
                { x: area.x + area.w * 0.60, y: area.y + area.h * 0.58, w: 48, h: 48 },
                { x: area.x + area.w * 0.82, y: area.y + area.h * 0.78, w: 48, h: 48 },
            ];

            // posisi gerobak (tengah map)
            cart.x = area.x + area.w / 2 - cartW / 2;
            cart.y = area.y + area.h / 2 - cartH / 2;

            const cartRect = { x: cart.x, y: cart.y, width: cart.width, height: cart.height };
            const obstacles = [...tents, ...crates, cartRect];

            const boxOf = (e) => ({
                x: e.x + e.size / 2 - e.colSize / 2,
                y: e.y + e.size / 2 - e.colSize / 2,
                width: e.colSize,
                height: e.colSize,
            });
            const rectIntersect = (r1, r2) =>
                r1.x < r2.x + r2.width && r1.x + r1.width > r2.x && r1.y < r2.y + r2.height && r1.y + r1.height > r2.y;

            const inArea = (bx, by, colSize) =>
                bx >= area.x && by >= area.y && bx + colSize <= area.x + area.w && by + colSize <= area.y + area.h;

            const canStand = (bx, by, colSize, ignore) => {
                if (!inArea(bx, by, colSize)) return false;
                const b = { x: bx, y: by, width: colSize, height: colSize };
                for (const o of obstacles) {
                    if (ignore && o === ignore) continue;
                    if (rectIntersect(b, o)) return false;
                }
                return true;
            };

            const moveEntity = (e, dirx, diry, speed, ignore) => {
                const len = Math.hypot(dirx, diry);
                if (len === 0) return false;
                const sx = (dirx / len) * speed, sy = (diry / len) * speed;
                const b = boxOf(e);
                if (canStand(b.x + sx, b.y + sy, e.colSize, ignore)) { e.x += sx; e.y += sy; return true; }
                if (canStand(b.x + sx, b.y, e.colSize, ignore)) { e.x += sx; return true; }
                if (canStand(b.x, b.y + sy, e.colSize, ignore)) { e.y += sy; return true; }
                return false;
            };

            // gerak satu langkah menuju target (pathfinding sederhana: pilih sumbu dominan)
            const stepToward = (e, tx, ty, speed) => {
                const b = boxOf(e);
                const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
                let dx = tx - cx, dy = ty - cy;
                if (Math.hypot(dx, dy) < speed) return false;
                // coba arah langsung dulu
                if (moveEntity(e, dx, dy, speed)) return true;
                // kalau mentok, coba sumbu dominan
                if (Math.abs(dx) > Math.abs(dy)) {
                    if (moveEntity(e, dx, 0, speed)) return true;
                    if (moveEntity(e, 0, dy, speed)) return true;
                } else {
                    if (moveEntity(e, 0, dy, speed)) return true;
                    if (moveEntity(e, dx, 0, speed)) return true;
                }
                return false;
            };

            // ---------- Inisialisasi ----------
            if (!initedRef.current) {
                player.speed = 4.0 + (statsRef.current.speedAdd || 0);
                player.x = cart.x - 150; player.y = cart.y + 10; player.health = statsRef.current.hp || 100;
                kumis.x = area.x + area.w * 0.04; kumis.y = area.y + area.h * 0.28;
                bA.x = area.x + area.w * 0.30; bA.y = area.y + area.h * 0.14; bA.health = 120; bA.role = 'chase'; bA.aggro = 0; bA.dmgCd = 0;
                bB.x = area.x + area.w * 0.74; bB.y = area.y + area.h * 0.14; bB.health = 120; bB.role = 'cart'; bB.aggro = 0; bB.dmgCd = 0;
                cart.health = 200;
                setPlayerHpPct(Math.max(0, (player.health / player.maxHealth) * 100));
                initedRef.current = true;
            }

            // ==========================================================
            // RENDER PASAR MALAM
            // ==========================================================
            // langit malam
            const sky = ctx.createLinearGradient(0, 0, 0, H);
            sky.addColorStop(0, '#0b1120');
            sky.addColorStop(1, '#1e1b4b');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, W, H);

            // tanah pasar
            ctx.fillStyle = '#3f3327';
            ctx.fillRect(area.x, area.y, area.w, area.h);
            ctx.fillStyle = '#4a3c2e';
            for (let i = 0; i < area.w; i += 40) ctx.fillRect(area.x + i, area.y, 20, area.h);
            ctx.strokeStyle = 'rgba(250,204,21,0.18)';
            ctx.lineWidth = 2;
            ctx.strokeRect(area.x, area.y, area.w, area.h);

            // lampu gantung pasar (string of lights) di bagian atas
            ctx.strokeStyle = 'rgba(250,204,21,0.35)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(area.x, area.y + 14);
            ctx.quadraticCurveTo(area.x + area.w / 2, area.y + 40, area.x + area.w, area.y + 14);
            ctx.stroke();
            for (let i = 0; i <= 10; i++) {
                const t = i / 10;
                const lx = area.x + area.w * t;
                const ly = area.y + 14 + Math.sin(Math.PI * t) * 22;
                ctx.fillStyle = '#facc15';
                ctx.beginPath(); ctx.arc(lx, ly, 5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(250,204,21,0.16)';
                ctx.beginPath(); ctx.arc(lx, ly, 16, 0, Math.PI * 2); ctx.fill();
            }

            // tenda pedagang (kanopi bergaris)
            tents.forEach((t) => {
                ctx.fillStyle = '#7c2d12';
                ctx.fillRect(t.x, t.y + t.h * 0.4, t.w, t.h * 0.6);
                // kanopi bergaris merah-putih
                const stripes = 5;
                for (let i = 0; i < stripes; i++) {
                    ctx.fillStyle = i % 2 === 0 ? '#dc2626' : '#f8fafc';
                    ctx.fillRect(t.x + (i * t.w) / stripes, t.y, t.w / stripes, t.h * 0.45);
                }
                ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 9px monospace';
                ctx.fillText(t.label, t.x + 4, t.y + t.h - 4);
            });

            // kotak kayu
            crates.forEach((c) => {
                ctx.fillStyle = '#92400e';
                ctx.fillRect(c.x, c.y, c.w, c.h);
                ctx.strokeStyle = '#78350f'; ctx.lineWidth = 3;
                ctx.strokeRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
                ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + c.w, c.y + c.h);
                ctx.moveTo(c.x + c.w, c.y); ctx.lineTo(c.x, c.y + c.h); ctx.stroke();
            });

            // ---------- Gerobak Gorengan Arya ----------
            (() => {
                const t = cart;
                // bayangan
                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                ctx.beginPath(); ctx.ellipse(t.x + t.width / 2, t.y + t.height + 6, t.width * 0.55, 10, 0, 0, Math.PI * 2); ctx.fill();
                // badan gerobak
                ctx.fillStyle = '#78350f'; ctx.fillRect(t.x, t.y + t.height * 0.35, t.width, t.height * 0.55);
                ctx.fillStyle = '#a16207'; ctx.fillRect(t.x + 4, t.y + t.height * 0.4, t.width - 8, t.height * 0.3);
                // wajan
                ctx.fillStyle = '#111827';
                ctx.beginPath(); ctx.ellipse(t.x + t.width / 2, t.y + t.height * 0.35, t.width * 0.30, 12, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath(); ctx.ellipse(t.x + t.width / 2, t.y + t.height * 0.34, t.width * 0.22, 8, 0, 0, Math.PI * 2); ctx.fill();
                // asap
                ctx.fillStyle = 'rgba(226,232,240,0.20)';
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.arc(t.x + t.width / 2 + i * 8 - 8, t.y + t.height * 0.24 - i * 10, 8 + i * 3, 0, Math.PI * 2);
                    ctx.fill();
                }
                // roda
                ctx.fillStyle = '#1e293b';
                ctx.beginPath(); ctx.arc(t.x + 16, t.y + t.height, 9, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(t.x + t.width - 16, t.y + t.height, 9, 0, Math.PI * 2); ctx.fill();
                // label
                ctx.fillStyle = '#ffffff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
                ctx.fillText('GORENGAN ARYA', t.x + t.width / 2, t.y - 8);
                // bar HP gerobak
                const bw = t.width, bx = t.x, by = t.y - t.height * 0.34;
                ctx.fillStyle = '#450a0a'; ctx.fillRect(bx, by, bw, 8);
                ctx.fillStyle = '#22c55e'; ctx.fillRect(bx, by, bw * Math.max(0, cart.health / cart.maxHealth), 8);
                ctx.strokeStyle = '#fca5a5'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, 8);
                ctx.textAlign = 'left';
            })();

            // ==========================================================
            // PEMAIN
            // ==========================================================
            player.isWalking = false;
            const canControl = gameState === 'PLAYING';
            if (canControl) {
                let dx = 0, dy = 0;
                if (keys['w'] || keys['arrowup']) { dy -= 1; player.facingDirection = 'up'; }
                if (keys['s'] || keys['arrowdown']) { dy += 1; player.facingDirection = 'down'; }
                if (keys['a'] || keys['arrowleft']) { dx -= 1; player.facingDirection = 'left'; }
                if (keys['d'] || keys['arrowright']) { dx += 1; player.facingDirection = 'right'; }
                if (dx !== 0 || dy !== 0) player.isWalking = moveEntity(player, dx, dy, player.speed);
            }
            player.frameTimer++;
            if (player.isWalking) {
                if (player.frameTimer >= 8) { player.frameIndex = (player.frameIndex + 1) % 3; player.frameTimer = 0; }
            } else player.frameIndex = 1;

            // ==========================================================
            // AI DUO ORMAS
            // ==========================================================
            if (gameState === 'PLAYING') {
                const handleBoss = (boss, other) => {
                    if (boss.health <= 0) { boss.isWalking = false; return; }
                    if (boss.aggro > 0) boss.aggro -= 1;
                    if (boss.dmgCd > 0) boss.dmgCd -= 1;
                    const chasing = boss.role === 'chase' || boss.aggro > 0;

                    if (chasing) {
                        const bcx = player.x + player.size / 2, bcy = player.y + player.size / 2;
                        const dx = bcx - (boss.x + boss.size / 2);
                        const dy = bcy - (boss.y + boss.size / 2);
                        if (Math.abs(dx) > Math.abs(dy)) boss.facingDirection = dx > 0 ? 'right' : 'left';
                        else boss.facingDirection = dy > 0 ? 'down' : 'up';
                        boss.isWalking = stepToward(boss, bcx, bcy, boss.speed);
                    } else {
                        // menyerang gerobak
                        const tx = cart.x + cart.width / 2;
                        const ty = cart.y + cart.height / 2;
                        const dx = tx - (boss.x + boss.size / 2);
                        const dy = ty - (boss.y + boss.size / 2);
                        if (Math.abs(dx) > Math.abs(dy)) boss.facingDirection = dx > 0 ? 'right' : 'left';
                        else boss.facingDirection = dy > 0 ? 'down' : 'up';
                        boss.isWalking = stepToward(boss, tx, ty, boss.speed);

                        // jika sudah dekat gerobak -> pukul
                        const bb = boxOf(boss);
                        const reach = { x: bb.x - 12, y: bb.y - 12, width: bb.width + 24, height: bb.height + 24 };
                        if (rectIntersect(reach, cartRect)) {
                            boss.isWalking = false;
                            if (boss.dmgCd <= 0) {
                                boss.dmgCd = 30; // 0.5s
                                cart.health -= 12;
                                setCartHpPct(Math.max(0, (cart.health / cart.maxHealth) * 100));
                                setLastActionText('🔨 Gerobakmu dipukul oknum ormas! Rekam dia untuk memancing aggronya!');
                                if (cart.health <= 0) {
                                    setGameState('GAMEOVER');
                                    setLastActionText('Gerobak gorenganmu hancur digulingkan oknum ormas. Dagangan dan modalmu lenyap.');
                                }
                            }
                        }
                    }
                    boss.frameTimer++;
                    if (boss.frameTimer >= 8) { boss.frameIndex = (boss.frameIndex + 1) % 3; boss.frameTimer = 0; }
                };
                handleBoss(bA, bB);
                handleBoss(bB, bA);
            }

            // ==========================================================
            // SERANGAN / REKAM (F / SPACE) + AGGRO
            // ==========================================================
            if (gameState === 'PLAYING') {
                if (player.attackTimer > 0) { player.attackTimer--; if (player.attackTimer <= 0) player.isAttacking = false; }

                if ((keys['f'] || keys[' ']) && !player.isAttacking) {
                    player.isAttacking = true;
                    player.attackTimer = 16;
                    const beam = getHpBeamRect(player);
                    let hitAny = false;

                    [bA, bB].forEach((boss) => {
                        if (boss.health <= 0) return;
                        if (rectIntersect(beam, { x: boss.x, y: boss.y, width: boss.size, height: boss.size })) {
                            hitAny = true;
                            const dmg = Math.round(20 * (statsRef.current.damageMult || 1));
                            boss.health -= dmg; // 120 HP -> 6 rekaman (lebih cepat bila kamera di-upgrade)
                            // memancing aggro: bos penyerang gerobak jadi mengejar Arya
                            if (boss.role === 'cart') {
                                boss.aggro = 240; // 4 detik
                                setLastActionText('📱 Terekam! Oknum beralih mengejarmu. Manfaatkan waktu ini untuk menyelamatkan gerobak!');
                            } else {
                                setLastActionText(`📱 Wajah oknum ormas terekam! Ia makin geram! (-${dmg} HP)`);
                            }
                        }
                    });

                    if (!hitAny) setLastActionText('📱 Arya merekam... (arahkan tepat ke oknum ormas yang memukul gerobak!)');

                    setBossAHpPct(Math.max(0, (bA.health / bA.maxHealth) * 100));
                    setBossBHpPct(Math.max(0, (bB.health / bB.maxHealth) * 100));

                    if (bA.health <= 0 && bB.health <= 0) {
                        setGameState('VICTORY');
                        setPlayerHp(player.health);
                        setLastActionText('Duo oknum ormas berhasil direkam & diusir warga! Gerobak gorenganmu selamat, dan mereka tak berani lagi memalak UMKM.');
                    }
                }

                // kontak fisik dengan oknum
                const pb = boxOf(player);
                [bA, bB].forEach((boss) => {
                    if (boss.health <= 0) return;
                    if (rectIntersect(pb, { x: boss.x, y: boss.y, width: boss.size, height: boss.size })) {
                        if (ouchCdRef.current <= 0) {
                            ouchCdRef.current = 20;
                            player.health -= 6;
                            setPlayerHpPct(Math.max(0, (player.health / player.maxHealth) * 100));
                            if (player.health <= 0) {
                                setGameState('GAMEOVER');
                                setLastActionText('Arya terdesak dan tumbang di lapaknya. Uang keamanan tetap mereka rampas.');
                            }
                        }
                    }
                });
                if (ouchCdRef.current > 0) ouchCdRef.current -= 1;
            }

            // ==========================================================
            // RENDER ENTITAS (gaya Level 5)
            // ==========================================================
            renderSpriteSheet(ctx, kumisImgRef.current, kumis, 'Pak Kumis');
            if (bA.health > 0) renderSpriteSheet(ctx, ormasImgRef.current, bA, 'Bang Jampang');
            if (bB.health > 0) renderSpriteSheet(ctx, ormasImgRef.current, bB, 'Bang Kodak');
            renderSpriteSheet(ctx, aryaImgRef.current, player, 'Arya');

            // indikator aggro (kepala oknum yang memukul gerobak berkedip)
            [bA, bB].forEach((boss) => {
                if (boss.health <= 0) return;
                if (boss.role !== 'cart') return;
                const attacking = boss.aggro <= 0;
                ctx.fillStyle = attacking ? 'rgba(239,68,68,0.95)' : 'rgba(56,189,248,0.95)';
                ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
                ctx.fillText(attacking ? '🔨 SERANG GEROBAK!' : '🏃 MENGEJARMU', boss.x + boss.size / 2, boss.y + boss.size + 18);
                ctx.textAlign = 'left';
            });

            if (player.isAttacking) {
                const beam = getHpBeamRect(player);
                ctx.fillStyle = 'rgba(59, 130, 246, 0.45)';
                ctx.fillRect(beam.x, beam.y, beam.width, beam.height);
                ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2; ctx.strokeRect(beam.x, beam.y, beam.width, beam.height);
            }

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        gameLoop();

        return () => { window.removeEventListener('resize', resizeCanvas); cancelAnimationFrame(animationFrameId); };
    }, [gameState]);

    const restartGame = () => {
        initedRef.current = false;
        ouchCdRef.current = 0;
        playerRef.current = { ...playerRef.current, health: statsRef.current.hp || 100, isWalking: false, facingDirection: 'down', frameIndex: 1 };
        bossARef.current = { ...bossARef.current, health: 120, isWalking: false, facingDirection: 'down', frameIndex: 1, role: 'chase', aggro: 0, dmgCd: 0 };
        bossBRef.current = { ...bossBRef.current, health: 120, isWalking: false, facingDirection: 'down', frameIndex: 1, role: 'cart', aggro: 0, dmgCd: 0 };
        cartRef.current = { ...cartRef.current, health: 200 };
        setPlayerMoney(90000);
        setPlayerHpPct(100);
        setCartHpPct(100);
        setBossAHpPct(100);
        setBossBHpPct(100);
        setDialogIndex(0);
        setLastActionText('');
        setGameState('STORY_INTRO');
    };

    const handleSurrender = () => {
        const denda = 150000;
        setPlayerMoney((prev) => Math.max(0, prev - denda));
        setGameState('GAMEOVER');
        setLastActionText(`Kamu membayar uang keamanan Rp ${denda.toLocaleString('id-ID')} ke oknum ormas. Modal jualanmu habis demi "perlindungan" palsu.`);
    };

    const getHpBeamRect = (p) => {
        const reach = 150, width = 30;
        if (p.facingDirection === 'right') return { x: p.x + p.size, y: p.y + (p.size - width) / 2, width: reach, height: width };
        if (p.facingDirection === 'left') return { x: p.x - reach, y: p.y + (p.size - width) / 2, width: reach, height: width };
        if (p.facingDirection === 'up') return { x: p.x + (p.size - width) / 2, y: p.y - reach, width: width, height: reach };
        return { x: p.x + (p.size - width) / 2, y: p.y + p.size, width: width, height: reach };
    };

    const renderSpriteSheet = (ctx, img, entity, label) => {
        if (img) {
            const frameW = img.naturalWidth / 3, frameH = img.naturalHeight / 4;
            let row = 0;
            if (entity.facingDirection === 'down') row = 0;
            if (entity.facingDirection === 'left') row = 1;
            if (entity.facingDirection === 'right') row = 2;
            if (entity.facingDirection === 'up') row = 3;
            ctx.drawImage(img, entity.frameIndex * frameW, row * frameH, frameW, frameH, entity.x, entity.y, entity.size, entity.size * 1.12);
        } else {
            ctx.fillStyle = label === 'Arya' ? '#22c55e' : label.startsWith('Bang') ? '#ef4444' : '#f59e0b';
            ctx.fillRect(entity.x, entity.y, entity.size, entity.size);
        }

        if (entity.maxHealth !== undefined) {
            const pct = Math.max(0, entity.health / entity.maxHealth);
            const barW = entity.size + 10, barH = 5;
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(entity.x - (barW - entity.size) / 2, entity.y - 10, barW, barH);
            ctx.fillStyle = label === 'Arya' ? '#22c55e' : '#fbbf24';
            ctx.fillRect(entity.x - (barW - entity.size) / 2, entity.y - 10, barW * pct, barH);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        const textW = ctx.measureText(label).width;
        ctx.fillText(label, entity.x + (entity.size - textW) / 2, entity.y - 16);
    };

    const activeDialogs = getActiveDialogs();

    return (
        <div className="relative w-screen h-screen bg-neutral-950 text-white font-mono select-none overflow-hidden">
            {/* HUD HEADER */}
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between bg-neutral-900/90 border border-neutral-700 px-5 py-3 rounded-xl shadow-xl backdrop-blur">
                <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-amber-500/25 border border-amber-500 text-amber-300 text-xs font-bold rounded-md">LEVEL 6</span>
                    <h1 className="text-sm font-bold tracking-wide text-white">SURVIVAL WNI : Uang Keamanan Ormas</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-neutral-600 rounded-lg">
                        <span className="text-[10px] text-red-400 font-bold">HP ARYA</span>
                        <div className="w-16 h-2 bg-neutral-700 rounded overflow-hidden">
                            <div className="h-full bg-red-500 transition-all" style={{ width: `${playerHpPct}%` }} />
                        </div>
                    </div>
                    {(gameState === 'PLAYING' || gameState === 'FIGHT_CHOICE') && (
                        <>
                            <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-green-700 rounded-lg">
                                <span className="text-[10px] text-green-400 font-bold">GEROBAK</span>
                                <div className="w-16 h-2 bg-neutral-700 rounded overflow-hidden">
                                    <div className="h-full bg-green-500 transition-all" style={{ width: `${cartHpPct}%` }} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-yellow-700 rounded-lg">
                                <span className="text-[10px] text-yellow-400 font-bold">JAMPANG</span>
                                <div className="w-14 h-2 bg-neutral-700 rounded overflow-hidden">
                                    <div className="h-full bg-yellow-500 transition-all" style={{ width: `${bossAHpPct}%` }} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-yellow-700 rounded-lg">
                                <span className="text-[10px] text-yellow-400 font-bold">KODAK</span>
                                <div className="w-14 h-2 bg-neutral-700 rounded overflow-hidden">
                                    <div className="h-full bg-yellow-500 transition-all" style={{ width: `${bossBHpPct}%` }} />
                                </div>
                            </div>
                        </>
                    )}
                    <div className="px-3 py-1 bg-emerald-950 border border-emerald-600 text-emerald-400 text-xs font-bold rounded-lg">
                        💵 Rp {playerMoney.toLocaleString('id-ID')}
                    </div>
                    <button onClick={() => router.push('/menu')} className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs border border-neutral-600 rounded-lg transition cursor-pointer">
                        ← Menu
                    </button>
                </div>
            </div>

            <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full z-0" />

            {/* DIALOG */}
            {(gameState === 'STORY_INTRO' || gameState === 'IBU_DIALOG' || gameState === 'JUKIR_DIALOG') && (
                <div className={`absolute bottom-8 left-8 right-8 bg-neutral-900/95 border-2 p-6 rounded-2xl shadow-2xl backdrop-blur z-20 max-w-4xl mx-auto ${gameState === 'JUKIR_DIALOG' ? 'border-red-500' : gameState === 'IBU_DIALOG' ? 'border-amber-500' : 'border-amber-500'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <span className={`font-bold text-sm px-3 py-1 rounded ${activeDialogs[dialogIndex]?.speaker === 'Arya' ? 'bg-green-600 text-white' : activeDialogs[dialogIndex]?.speaker?.startsWith('Bang') ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'}`}>
                            {activeDialogs[dialogIndex]?.speaker}
                        </span>
                        <span className="text-xs text-neutral-400 font-mono">{dialogIndex + 1} / {activeDialogs.length}</span>
                    </div>
                    <p className="text-sm text-neutral-100 italic leading-relaxed my-3 min-h-[48px]">"{activeDialogs[dialogIndex]?.text}"</p>
                    <button onClick={handleNextDialog} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs rounded-xl border-b-4 border-amber-700 cursor-pointer tracking-widest">
                        LANJUT ➔
                    </button>
                </div>
            )}

            {/* MISSION OVERLAY */}
            {gameState === 'MISSION_OVERLAY' && (
                <div onClick={() => setGameState('IBU_DIALOG')} className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 cursor-pointer text-center select-none backdrop-blur-md">
                    <div className="max-w-md bg-neutral-900 border border-neutral-700 p-8 rounded-2xl shadow-2xl space-y-5 hover:border-amber-500/50 transition-colors">
                        <div className="w-16 h-16 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">🍢</div>
                        <h2 className="text-xl font-bold text-amber-300 tracking-wider">MISI UTAMA LEVEL 6</h2>
                        <p className="text-neutral-200 text-sm leading-relaxed">Lindungi <span className="text-green-400 font-bold">Gerobak Gorenganmu</span> (HP 200) dari duo oknum ormas! Satu mengejarmu, satu memukul gerobak. <span className="text-yellow-400 font-bold">Rekam oknum yang memukul gerobak</span> untuk memancing aggronya. Gerobak hancur = tamat!</p>
                        <div className="pt-4 border-t border-neutral-800"><p className="text-xs text-amber-300 animate-pulse font-mono font-semibold">[ Klik di mana saja untuk mulai ]</p></div>
                    </div>
                </div>
            )}

            {/* PILIHAN AKSI FIGHT */}
            {gameState === 'FIGHT_CHOICE' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-2xl font-bold text-amber-300 mb-2">PILIH LANGKAH ARYA!</h2>
                    <p className="text-xs text-neutral-300 max-w-lg mb-6 leading-relaxed">Duo oknum ormas siap menggulingkan gerobakmu. Satu akan mengejarmu, satu memukul gerobak. Rekam si pemukul untuk memancingnya mengejarmu!</p>
                    <div className="flex flex-col gap-4 w-full max-w-md">
                        <button onClick={() => { setGameState('PLAYING'); setBossAHpPct(100); setBossBHpPct(100); setCartHpPct(100); setPlayerHpPct(100); initedRef.current = false; setLastActionText('Lindungi gerobak! Rekam oknum yang memukul gerobak untuk memancing aggronya!'); }} className="py-4 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl border-b-4 border-amber-800 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer">
                            <span>📱</span> BELA GEROBAK & REKAM MEREKA
                        </button>
                        <button onClick={handleSurrender} className="py-4 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-xl border-b-4 border-red-900 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer">
                            <span>💸</span> 🏳️ Menyerah (Bayar Rp150.000)
                        </button>
                    </div>
                </div>
            )}

            {/* VICTORY */}
            {gameState === 'VICTORY' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-3xl font-bold text-green-400 mb-3">LEVEL 6 SELESAI! 🎉</h2>
                    <p className="text-sm text-neutral-200 max-w-md mb-6 leading-relaxed">{lastActionText}</p>
                    <button onClick={() => router.push('/shop?next=7')} className="px-8 py-3.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800 shadow-xl cursor-pointer">Lanjut ke Level 7 →</button>
                </div>
            )}

            {/* GAME OVER */}
            {gameState === 'GAMEOVER' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-3xl font-bold text-red-500 mb-3">LAPAK MU HANCUR!</h2>
                    <p className="text-sm text-neutral-200 max-w-md mb-6 leading-relaxed">{lastActionText}</p>
                    <div className="flex gap-4">
                        <button onClick={restartGame} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800 cursor-pointer">Coba Lagi Level 6</button>
                        <button onClick={() => router.push('/menu')} className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl border border-neutral-600 cursor-pointer">Kembali ke Menu</button>
                    </div>
                </div>
            )}

            {gameState === 'PLAYING' && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 p-3 w-full max-w-3xl bg-neutral-900/90 border border-neutral-700 rounded-xl text-center text-xs text-yellow-400 tracking-wider shadow-2xl backdrop-blur z-20">
                    {lastActionText || "🔨 Jaga gerobak! Rekam oknum yang memukul gerobak (F/SPACE) untuk memancingnya mengejarmu!"}
                </div>
            )}
        </div>
    );
}