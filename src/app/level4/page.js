// src/app/level4/page.js
// LEVEL 4 : KASTA PASIEN BPJS
// Instalasi Gawat Darurat (IGD) & Lorong Administrasi RS.
// Lantai keramik putih, ranjang ber tirai biru, meja perawat, ruang komputer terkunci di pojok,
// area tunggu kursi besi. Karakter & gaya sama seperti Level 3.
//
// ALUR: STORY_INTRO (Arya & Kakek) -> MISSION_OVERLAY -> EXPLORE (temui Perawat)
//       -> IBU_DIALOG (Perawat buka rahasia) -> STEALTH (hindari Vision Cone, potret layar)
//       -> JUKIR_DIALOG (Oknum Administrasi konfrontasi) -> FIGHT_CHOICE -> PLAYING (sinar rekam HP)
//       -> VICTORY / GAMEOVER
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Level4Page() {
    const router = useRouter();
    const canvasRef = useRef(null);

    const [gameState, setGameState] = useState('STORY_INTRO');
    const [dialogIndex, setDialogIndex] = useState(0);
    const [playerMoney, setPlayerMoney] = useState(150000);
    const [lastActionText, setLastActionText] = useState('');
    const [bossHpPct, setBossHpPct] = useState(100);
    const [playerHpPct, setPlayerHpPct] = useState(100);
    const [hasProof, setHasProof] = useState(false);

    // ==================================================
    // NASKAH DIALOG LENGKAP (DARI SPEC)
    // ==================================================
    // A. Dialog Intro Level 4 (Di Depan Brankar IGD - Arya & Kakek)
    const introDialogs = [
        { speaker: "Kakek", text: "Uhuk... uhuk... Arya, kita pulang saja ya Nak. Kakek nggak kuat kalau harus bikin kamu berutang di rumah sakit ini..." },
        { speaker: "Arya", text: "Jangan ngomong gitu, Kek! Kakek harus dirawat. Kita punya kartu BPJS aktif kok, itu hak kita sebagai warga negara. Tunggu sebentar ya, Arya cek ke perawat dulu." },
    ];

    // B. Dialog Informan (Meja Jaga - Arya & Perawat Muda)
    const nurseDialogs = [
        { speaker: "Arya", text: "Sus, tolong Kakek saya! Sudah tiga jam di lorong IGD belum dipindahkan ke kamar rawat inap juga!" },
        { speaker: "Perawat Muda", text: "Maaf sekali, Mas Arya... Saya sudah siapkan ranjang bangsalnya, tapi surat perintah masuknya ditahan sama Kepala Administrasi di loket depan." },
        { speaker: "Arya", text: "Ditahan kenapa, Sus? Tadi dia bilang ke saya kamar BPJS Kelas 3 penuh semua!" },
        { speaker: "Perawat Muda", text: "(Berbisik) Mas, sebenarnya di lantai dua masih ada empat bed kosong untuk BPJS. Tapi sama Bapak itu sengaja dikunci di sistem supaya pasien panik dan terpaksa bayar kamar VIP. Dia dapat komisi dari situ." },
        { speaker: "Arya", text: "Astaga, tega sekali mempermainkan nyawa orang tua demi komisi! Di mana bukti data kamar kosong itu, Sus?" },
        { speaker: "Perawat Muda", text: "Ada di layar komputer utama di ruang pojok kanan. Tapi hati-hati, jangan sampai ketahuan sebelum Mas memotret layarnya!" },
    ];

    // C. Dialog Konfrontasi Bos (Ruang Administrasi - Arya & Oknum Administrasi)
    const bossDialogs = [
        { speaker: "Oknum Administrasi", text: "Hei! Siapa yang mengizinkan kamu masuk ke area komputer staf?! Keluar sekarang!" },
        { speaker: "Arya", text: "Terlambat, Pak! Layar monitor ini sudah saya rekam. Jelas-jelas tertulis Bangsal Melati untuk BPJS Kelas 3 masih kosong empat kamar!" },
        { speaker: "Oknum Administrasi", text: "Itu... itu data error belum di-update! Kamu pasien gratisan jangan banyak menuntut! Kalau mau dilayani cepat seperti raja, bayar DP VIP 5 juta di kasir!" },
        { speaker: "Arya", text: "BPJS itu bukan gratisan, Pak! Itu dibayar dari iuran keringat rakyat dan pajak negara! Bapak sengaja menelantarkan Kakek saya yang sedang kritis demi memeras kami!" },
        { speaker: "Oknum Administrasi", text: "Tutup mulutmu! Hapus foto di HP kamu itu sekarang atau saya panggilkan sekuriti untuk menyeret kamu dan kakekmu keluar ke jalanan!" },
        { speaker: "Arya", text: "Silakan coba kalau berani! Seluruh warga akan tahu kebusukan manajemen rumah sakit ini!" },
    ];

    const getActiveDialogs = () => {
        if (gameState === 'STORY_INTRO') return introDialogs;
        if (gameState === 'IBU_DIALOG') return nurseDialogs;
        if (gameState === 'JUKIR_DIALOG') return bossDialogs;
        return [];
    };

    const handleNextDialog = () => {
        const list = getActiveDialogs();
        if (dialogIndex < list.length - 1) {
            setDialogIndex(dialogIndex + 1);
        } else {
            if (gameState === 'STORY_INTRO') setGameState('MISSION_OVERLAY');
            else if (gameState === 'IBU_DIALOG') setGameState('STEALTH');
            else if (gameState === 'JUKIR_DIALOG') setGameState('FIGHT_CHOICE');
        }
    };

    // ==================================================
    // REF ASSET & ENTITAS
    // ==================================================
    const aryaImgRef = useRef(null);
    const kakekImgRef = useRef(null);
    const nurseImgRef = useRef(null);
    const adminImgRef = useRef(null);
    const extTilesetRef = useRef(null); // tilemap_packed.png (lantai, kursi, dll)

    // Arya (Player): HP 100, Speed 4.0
    const playerRef = useRef({
        x: 0, y: 0, size: 72, speed: 4.0, health: 100, maxHealth: 100, facingDirection: 'down',
        isWalking: false, frameIndex: 1, frameTimer: 0, isAttacking: false, attackTimer: 0, attackCooldown: false,
    });

    // Kakek (NPC Pasif) - di brankar dekat pintu masuk IGD
    const kakekRef = useRef({ x: 0, y: 0, size: 72, facingDirection: 'down' });

    // Perawat Muda (NPC Informan)
    const nurseRef = useRef({ x: 0, y: 0, size: 72, facingDirection: 'down' });

    // Oknum Kepala Administrasi / Calo Kamar (Bos): HP 200, Speed 2.5
    const bossRef = useRef({
        x: 0, y: 0, size: 72, speed: 2.5, health: 200, maxHealth: 200,
        facingDirection: 'down', isWalking: false, frameIndex: 1, frameTimer: 0,
        visionAngle: 70, visionDist: 230, patrolDir: 1,
    });

    const keysRef = useRef({});
    const initedRef = useRef(false);
    // posisi awal (dipakai saat "ketahuan" untuk respawn)
    const spawnRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const handleKeyDown = (e) => { keysRef.current[e.key.toLowerCase()] = true; };
        const handleKeyUp = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Load karakter (hapus background putih) - gaya sama Level 3
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

        loadCharImage('/assets/arya.jpg', aryaImgRef);            // Arya (Player)
        loadCharImage('/assets/pak_rt.jpg', kakekImgRef);         // Kakek (NPC pasif)
        loadCharImage('/assets/pak_rt.jpg', nurseImgRef);         // Perawat Muda (informan)
        loadCharImage('/assets/petugas_pungli.jpg', adminImgRef); // Oknum Administrasi (bos)

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
            const kakek = kakekRef.current;
            const nurse = nurseRef.current;
            const boss = bossRef.current;
            const keys = keysRef.current;
            const extTileset = extTilesetRef.current;
            const tileSize = 64;

            // ==========================================================
            // TATA LETAK IGD
            // ==========================================================
            const floorTop = 70;
            const floorBottom = H - 60;
            const leftWall = 70;
            const rightWall = W - 70;

            // Ruang Komputer terkunci (pojok kanan atas)
            const computer = { x: rightWall - 210, y: floorTop + 18, width: 170, height: 112 };

            // Ranjang pasien + tirai biru
            const beds = [
                { x: leftWall + 40, y: floorTop + 150, w: 110, h: 54 },
                { x: leftWall + 220, y: floorTop + 150, w: 110, h: 54 },
                { x: W * 0.42, y: floorBottom - 190, w: 110, h: 54 },
                { x: W * 0.62, y: floorBottom - 190, w: 110, h: 54 },
                { x: rightWall - 340, y: floorTop + 300, w: 110, h: 54 },
            ];

            // Meja perawat (tengah)
            const nurseDesk = { x: W * 0.46, y: H * 0.45, w: 190, h: 96 };

            // Area tunggu kursi besi (kiri bawah)
            const chairs = [];
            for (let i = 0; i < 4; i++) chairs.push({ x: leftWall + 30 + i * 54, y: floorBottom - 90, w: 44, h: 44 });

            const inHall = (x, y, size) =>
                x >= leftWall && x + size <= rightWall && y >= floorTop && y + size <= floorBottom;

            const blockedByFurniture = (bx, by, size) => {
                const box = { x: bx, y: by, width: size, height: size };
                for (const b of beds) if (rectIntersect(box, b)) return true;
                if (rectIntersect(box, nurseDesk)) return true;
                if (rectIntersect(box, computer)) return true;
                for (const c of chairs) if (rectIntersect(box, c)) return true;
                return false;
            };

            // Inisialisasi posisi sekali saja
            if (!initedRef.current) {
                spawnRef.current = { x: leftWall + 110, y: floorBottom - 70 };
                player.x = spawnRef.current.x;
                player.y = spawnRef.current.y;
                player.health = 100;

                // Kakek terbaring di brankar dekat pintu masuk IGD (kiri atas)
                kakek.x = leftWall + 50;
                kakek.y = floorTop + 40;

                // Perawat Muda di meja jaga
                nurse.x = nurseDesk.x + 55;
                nurse.y = nurseDesk.y + 20;

                // Oknum Administrasi patroli di sisi kanan menuju ruang komputer
                boss.x = rightWall - 330;
                boss.y = floorTop + 70;
                boss.health = 200;

                initedRef.current = true;
            }

            // ==========================================================
            // RENDER LANTAI & DINDING
            // ==========================================================
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, W, H);

            // keramik putih
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            for (let x = 0; x < W; x += tileSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
            for (let y = 0; y < H; y += tileSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

            // dinding
            ctx.fillStyle = '#dbeafe';
            ctx.fillRect(0, 0, W, floorTop);
            ctx.fillRect(0, floorBottom, W, H - floorBottom);
            ctx.fillRect(0, floorTop, leftWall, floorBottom - floorTop);
            ctx.fillRect(rightWall, floorTop, W - rightWall, floorBottom - floorTop);
            ctx.fillStyle = '#1d4ed8';
            ctx.font = 'bold 20px monospace';
            ctx.fillText('IGD - INSTALASI GAWAT DARURAT  •  RUMAH SAKIT', leftWall + 10, 44);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#dc2626';
            ctx.fillText('PARKIR GRATIS? TIDAK.  KAMAR BPJS PENUH? BELUM TENTU.', rightWall - 10, 44);
            ctx.textAlign = 'left';

            // ==========================================================
            // RENDER FURNITUR
            // ==========================================================
            // Ranjang + tirai biru
            beds.forEach((b) => {
                ctx.fillStyle = '#e5e7eb';
                ctx.fillRect(b.x, b.y, b.w, b.h);
                ctx.fillStyle = '#bfdbfe';               // seprai
                ctx.fillRect(b.x + 6, b.y + 8, b.w - 12, b.h - 14);
                ctx.fillStyle = '#ffffff';               // bantal
                ctx.fillRect(b.x + 8, b.y + 10, 22, b.h - 18);
                ctx.fillStyle = '#3b82f6';               // tirai biru
                ctx.fillRect(b.x - 6, b.y - 22, b.w + 12, 20);
                ctx.fillStyle = '#2563eb';
                for (let i = 0; i <= 6; i++) ctx.fillRect(b.x - 4 + i * (b.w + 8) / 6, b.y - 22, 3, 20);
            });

            // Meja perawat
            ctx.fillStyle = '#f1f5f9';
            ctx.fillRect(nurseDesk.x, nurseDesk.y, nurseDesk.w, nurseDesk.h);
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(nurseDesk.x, nurseDesk.y, nurseDesk.w, 22);
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 14px monospace';
            ctx.fillText('MEJA JAGA PERAWAT', nurseDesk.x + 10, nurseDesk.y + 16);
            ctx.fillStyle = '#334155';
            ctx.fillRect(nurseDesk.x + 18, nurseDesk.y + 40, 46, 34);
            ctx.fillStyle = '#22d3ee';
            ctx.fillRect(nurseDesk.x + 23, nurseDesk.y + 45, 36, 24);

            // Kursi tunggu besi
            chairs.forEach((c) => {
                ctx.fillStyle = '#9ca3af';
                ctx.fillRect(c.x, c.y, c.w, c.h);
                ctx.fillStyle = '#6b7280';
                ctx.fillRect(c.x, c.y + c.h - 8, c.w, 8);
            });

            // Ruang Komputer
            ctx.fillStyle = '#334155';
            ctx.fillRect(computer.x, computer.y, computer.width, computer.height);
            ctx.fillStyle = '#475569';
            ctx.fillRect(computer.x, computer.y, computer.width, 22);
            ctx.fillStyle = '#e2e8f0';
            ctx.font = 'bold 12px monospace';
            ctx.fillText('RUANG KOMPUTER STAF', computer.x + 8, computer.y + 16);
            // monitor
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(computer.x + 24, computer.y + 36, 76, 50);
            ctx.fillStyle = '#34d399';
            ctx.fillRect(computer.x + 29, computer.y + 41, 66, 40);
            ctx.fillStyle = '#064e3b';
            ctx.font = 'bold 9px monospace';
            ctx.fillText('BANGSAL MELATI', computer.x + 32, computer.y + 55);
            ctx.fillText('BPJS KLS 3: 4 KOSONG', computer.x + 32, computer.y + 68);
            if (hasProof) {
                ctx.fillStyle = '#fbbf24';
                ctx.font = 'bold 11px monospace';
                ctx.fillText('✔ TERREKAM', computer.x + 100, computer.y + 55);
            }

            // ==========================================================
            // VISION CONE (Oknum Administrasi)
            // ==========================================================
            const drawVisionCone = () => {
                if (gameState !== 'STEALTH') return;
                let bx = 0, by = 0;
                if (boss.facingDirection === 'right') bx = 1;
                if (boss.facingDirection === 'left') bx = -1;
                if (boss.facingDirection === 'up') by = -1;
                if (boss.facingDirection === 'down') by = 1;
                const cx = boss.x + boss.size / 2;
                const cy = boss.y + boss.size / 2;
                const baseAngle = Math.atan2(by, bx);
                const half = (boss.visionAngle * Math.PI / 180) / 2;
                const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, boss.visionDist);
                grad.addColorStop(0, 'rgba(239, 68, 68, 0.32)');
                grad.addColorStop(1, 'rgba(239, 68, 68, 0.02)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, boss.visionDist, baseAngle - half, baseAngle + half);
                ctx.closePath();
                ctx.fill();
            };

            // ==========================================================
            // PERGERAKAN PEMAIN
            // ==========================================================
            player.isWalking = false;
            const canControl = gameState === 'EXPLORE' || gameState === 'STEALTH' || gameState === 'PLAYING';

            if (canControl) {
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

                    if (inHall(nextX, nextY, player.size) && !blockedByFurniture(nextX, nextY, player.size)) {
                        player.x = nextX; player.y = nextY;
                    } else if (inHall(nextX, player.y, player.size) && !blockedByFurniture(nextX, player.y, player.size)) {
                        player.x = nextX;
                    } else if (inHall(player.x, nextY, player.size) && !blockedByFurniture(player.x, nextY, player.size)) {
                        player.y = nextY;
                    }
                }
            }

            player.frameTimer++;
            if (player.isWalking) {
                if (player.frameTimer >= 8) { player.frameIndex = (player.frameIndex + 1) % 3; player.frameTimer = 0; }
            } else {
                player.frameIndex = 1;
            }

            // ==========================================================
            // AI OKNUM ADMINISTRASI
            // ==========================================================
            const moveBossAxis = (nx, ny) => {
                if (inHall(nx, ny, boss.size) && !blockedByFurniture(nx, ny, boss.size)) { boss.x = nx; boss.y = ny; return true; }
                return false;
            };

            if (gameState === 'STEALTH') {
                // Patroli vertikal di sisi kanan (dekat jalur menuju ruang komputer)
                const patrolTop = floorTop + 40;
                const patrolBottom = floorBottom - 120;
                boss.isWalking = true;
                if (boss.patrolDir > 0) {
                    boss.facingDirection = 'down';
                    if (!moveBossAxis(boss.x, boss.y + boss.speed)) boss.patrolDir = -1;
                    else if (boss.y >= patrolBottom) boss.patrolDir = -1;
                } else {
                    boss.facingDirection = 'up';
                    if (!moveBossAxis(boss.x, boss.y - boss.speed)) boss.patrolDir = 1;
                    else if (boss.y <= patrolTop) boss.patrolDir = 1;
                }
                boss.frameTimer++;
                if (boss.frameTimer >= 8) { boss.frameIndex = (boss.frameIndex + 1) % 3; boss.frameTimer = 0; }
            } else if (gameState === 'PLAYING') {
                // Kejar Arya, tapi tersangkut ranjang -> geser sumbu lain
                const dx = player.x - boss.x;
                const dy = player.y - boss.y;
                const dist = Math.hypot(dx, dy) || 1;
                if (Math.abs(dx) > Math.abs(dy)) boss.facingDirection = dx > 0 ? 'right' : 'left';
                else boss.facingDirection = dy > 0 ? 'down' : 'up';

                boss.isWalking = true;
                const sx = (dx / dist) * boss.speed;
                const sy = (dy / dist) * boss.speed;
                if (!moveBossAxis(boss.x + sx, boss.y + sy)) {
                    if (!moveBossAxis(boss.x + sx, boss.y)) moveBossAxis(boss.x, boss.y + sy);
                }
                boss.frameTimer++;
                if (boss.frameTimer >= 8) { boss.frameIndex = (boss.frameIndex + 1) % 3; boss.frameTimer = 0; }
            } else {
                boss.isWalking = false;
                boss.frameIndex = 1;
            }

            // ==========================================================
            // INTERAKSI: TEMUI PERAWAT
            // ==========================================================
            if (gameState === 'EXPLORE') {
                const distNurse = Math.hypot(player.x - nurse.x, player.y - nurse.y);
                if (distNurse < 140) {
                    ctx.fillStyle = '#1d4ed8';
                    ctx.font = 'bold 13px monospace';
                    ctx.fillText('[ Tekan E untuk bicara dengan Perawat ]', nurse.x - 90, nurse.y - 20);
                    if (keys['e']) { setDialogIndex(0); setGameState('IBU_DIALOG'); }
                }
            }

            // ==========================================================
            // STEALTH: VISION CONE & FOTO LAYAR
            // ==========================================================
            if (gameState === 'STEALTH') {
                // deteksi
                const cx = boss.x + boss.size / 2;
                const cy = boss.y + boss.size / 2;
                const px = player.x + player.size / 2;
                const py = player.y + player.size / 2;
                const dxp = px - cx, dyp = py - cy;
                const dist = Math.hypot(dxp, dyp);
                let detected = false;
                if (dist < boss.visionDist) {
                    let base = 0;
                    if (boss.facingDirection === 'right') base = 0;
                    if (boss.facingDirection === 'down') base = 90;
                    if (boss.facingDirection === 'left') base = 180;
                    if (boss.facingDirection === 'up') base = 270;
                    const ang = (Math.atan2(dyp, dxp) * 180 / Math.PI + 360) % 360;
                    let diff = Math.abs(ang - base);
                    if (diff > 180) diff = 360 - diff;
                    detected = diff < boss.visionAngle / 2;
                }

                if (detected && !hasProof) {
                    // Ketahuan! Respawn ke titik awal, bos reset, coba lagi.
                    player.x = spawnRef.current.x;
                    player.y = spawnRef.current.y;
                    boss.x = rightWall - 330;
                    boss.y = floorTop + 70;
                    boss.patrolDir = 1;
                    setLastActionText('🚨 Ketahuan Oknum Administrasi! Kamu diusir kembali ke pintu IGD. Coba sembunyi di balik tirai!');
                }

                // Ambil foto layar monitor
                if (!hasProof && dist < 160) {
                    const dComp = Math.hypot(px - (computer.x + computer.width / 2), py - (computer.y + computer.height / 2));
                    if (dComp < 150) {
                        ctx.fillStyle = '#1d4ed8';
                        ctx.font = 'bold 13px monospace';
                        ctx.fillText('[ Tekan E untuk Memotret Data Kamar ]', computer.x - 40, computer.y - 12);
                        if (keys['e']) {
                            setHasProof(true);
                            setLastActionText('📸 Layar monitor berhasil direkam! Terbukti kamar BPJS Kelas 3 masih kosong.');
                            setDialogIndex(0);
                            setGameState('JUKIR_DIALOG');
                        }
                    }
                }
            }

            // ==========================================================
            // PERTARUNGAN (PLAYING)
            // ==========================================================
            if (gameState === 'PLAYING') {
                if (player.attackTimer > 0) {
                    player.attackTimer--; if (player.attackTimer <= 0) player.isAttacking = false;
                }

                const doAttack = () => {
                    if (!player.isAttacking && !player.attackCooldown) {
                        player.isAttacking = true;
                        player.attackTimer = 18;
                        player.attackCooldown = true;
                        const beam = getHpBeamRect(player);
                        if (rectIntersect(beam, boss)) {
                            boss.health -= 20; // 200 HP -> 10 pukulan
                            setLastActionText('📱 Aksi calo kamar terekam! Ia mulai panik! (-20 HP)');
                            setBossHpPct(Math.max(0, (boss.health / boss.maxHealth) * 100));
                            if (boss.health <= 0) {
                                setGameState('VICTORY');
                                setLastActionText('Oknum Administrasi tumbang! Data kamar BPJS terbukti kosong. Kakek langsung dipindahkan ke Bangsal Melati.');
                            }
                        } else {
                            setLastActionText('📱 Arya merekam... (arahkan tepat ke arah Oknum Administrasi!)');
                        }
                        setTimeout(() => { player.attackCooldown = false; }, 300);
                    }
                };

                if (keys['f'] || keys[' ']) doAttack();

                // kontak fisik
                if (rectIntersect(player, boss)) {
                    player.health -= 0.4;
                    setPlayerHpPct(Math.max(0, (player.health / player.maxHealth) * 100));
                    if (player.health <= 0) {
                        setGameState('GAMEOVER');
                        setLastActionText('Arya terdesak. HP-nya dirampas dan Kakek tetap dibiarkan terlantar di lorong IGD...');
                    }
                }
            }

            // ==========================================================
            // RENDER ENTITAS (gaya Level 3)
            // ==========================================================
            drawVisionCone();

            renderSpriteSheet(ctx, kakekImgRef.current, kakek, 'Kakek');
            renderSpriteSheet(ctx, nurseImgRef.current, nurse, 'Perawat Muda');
            renderSpriteSheet(ctx, adminImgRef.current, boss, 'Oknum Admin');

            if (gameState === 'EXPLORE' || gameState === 'STEALTH' || gameState === 'PLAYING') {
                renderSpriteSheet(ctx, aryaImgRef.current, player, 'Arya');
            }

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
    }, [gameState, hasProof]);

    const restartGame = () => {
        const canvas = canvasRef.current;
        const W = canvas ? canvas.width : 1200;
        const H = canvas ? canvas.height : 720;

        playerRef.current = { ...playerRef.current, x: 100, y: H - 120, health: 100, isWalking: false, facingDirection: 'down', frameIndex: 1 };
        bossRef.current = { ...bossRef.current, x: W - 400, y: 140, health: 200, isWalking: false, facingDirection: 'down', frameIndex: 1, patrolDir: 1 };
        kakekRef.current = { ...kakekRef.current, x: 120, y: 110 };
        nurseRef.current = { ...nurseRef.current, x: W * 0.5, y: H * 0.5 };
        initedRef.current = false;
        setPlayerMoney(150000);
        setBossHpPct(100);
        setPlayerHpPct(100);
        setHasProof(false);
        setDialogIndex(0);
        setLastActionText('');
        setGameState('STORY_INTRO');
    };

    const handleSurrender = () => {
        const denda = 5000000;
        setPlayerMoney((prev) => Math.max(0, prev - denda));
        setGameState('GAMEOVER');
        setLastActionText(`Kamu menandatangani surat pindah jalur Umum/VIP dan membayar DP Rp ${denda.toLocaleString('id-ID')}. Tabungan Kakek habis demi kamar yang seharusnya jadi hakmu.`);
    };

    const getHpBeamRect = (p) => {
        const reach = 165, width = 32;
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

    const renderSpriteSheet = (ctx, img, entity, label) => {
        if (img) {
            const frameW = img.naturalWidth / 3, frameH = img.naturalHeight / 4;
            let row = 0;
            if (entity.facingDirection === 'down') row = 0;
            if (entity.facingDirection === 'left') row = 1;
            if (entity.facingDirection === 'right') row = 2;
            if (entity.facingDirection === 'up') row = 3;
            ctx.drawImage(img, entity.frameIndex * frameW, row * frameH, frameW, frameH, entity.x, entity.y, entity.size, entity.size * 1.15);
        } else {
            ctx.fillStyle = label === 'Arya' ? '#22c55e' : label === 'Oknum Admin' ? '#ef4444' : '#f59e0b';
            ctx.fillRect(entity.x, entity.y, entity.size, entity.size);
        }

        if (entity.health !== undefined) {
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
                    <span className="px-3 py-1 bg-blue-500/25 border border-blue-500 text-blue-300 text-xs font-bold rounded-md">LEVEL 4</span>
                    <h1 className="text-sm font-bold tracking-wide text-white">SURVIVAL WNI : Kasta Pasien BPJS</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-neutral-600 rounded-lg">
                        <span className="text-[10px] text-red-400 font-bold">HP ARYA</span>
                        <div className="w-20 h-2 bg-neutral-700 rounded overflow-hidden">
                            <div className="h-full bg-red-500 transition-all" style={{ width: `${playerHpPct}%` }} />
                        </div>
                    </div>
                    <div className={`px-3 py-1 text-xs font-bold rounded-lg border ${hasProof ? 'bg-emerald-950 border-emerald-600 text-emerald-400' : 'bg-neutral-800 border-neutral-600 text-neutral-400'}`}>
                        📷 {hasProof ? 'Bukti Didapat' : 'Cari Bukti'}
                    </div>
                    {gameState === 'PLAYING' && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-red-700 rounded-lg">
                            <span className="text-[10px] text-yellow-400 font-bold">OKNUM ADMIN</span>
                            <div className="w-20 h-2 bg-neutral-700 rounded overflow-hidden">
                                <div className="h-full bg-yellow-500 transition-all" style={{ width: `${bossHpPct}%` }} />
                            </div>
                        </div>
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
                <div className={`absolute bottom-8 left-8 right-8 bg-neutral-900/95 border-2 p-6 rounded-2xl shadow-2xl backdrop-blur z-20 max-w-4xl mx-auto ${gameState === 'JUKIR_DIALOG' ? 'border-red-500' : gameState === 'IBU_DIALOG' ? 'border-amber-500' : 'border-blue-500'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <span className={`font-bold text-sm px-3 py-1 rounded ${activeDialogs[dialogIndex]?.speaker === 'Arya' ? 'bg-green-600 text-white' : activeDialogs[dialogIndex]?.speaker === 'Oknum Administrasi' ? 'bg-red-600 text-white' : activeDialogs[dialogIndex]?.speaker === 'Kakek' ? 'bg-neutral-600 text-white' : 'bg-amber-600 text-white'}`}>
                            {activeDialogs[dialogIndex]?.speaker}
                        </span>
                        <span className="text-xs text-neutral-400 font-mono">{dialogIndex + 1} / {activeDialogs.length}</span>
                    </div>
                    <p className="text-sm text-neutral-100 italic leading-relaxed my-3 min-h-[48px]">"{activeDialogs[dialogIndex]?.text}"</p>
                    <button onClick={handleNextDialog} className="w-full py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs rounded-xl border-b-4 border-blue-700 cursor-pointer tracking-widest">
                        LANJUT ➔
                    </button>
                </div>
            )}

            {/* MISSION OVERLAY */}
            {gameState === 'MISSION_OVERLAY' && (
                <div onClick={() => setGameState('EXPLORE')} className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 cursor-pointer text-center select-none backdrop-blur-md">
                    <div className="max-w-md bg-neutral-900 border border-neutral-700 p-8 rounded-2xl shadow-2xl space-y-5 hover:border-blue-500/50 transition-colors">
                        <div className="w-16 h-16 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">🏥</div>
                        <h2 className="text-xl font-bold text-blue-300 tracking-wider">MISI UTAMA LEVEL 4</h2>
                        <p className="text-neutral-200 text-sm leading-relaxed">Temui <span className="text-amber-400 font-bold">Perawat Muda</span> di meja jaga. Lalu <span className="text-red-400 font-bold">hindari lingkaran pandang</span> Oknum Administrasi dan potret layar <span className="text-emerald-400 font-bold">Data Ketersediaan Kamar</span> di ruang komputer!</p>
                        <div className="pt-4 border-t border-neutral-800"><p className="text-xs text-blue-300 animate-pulse font-mono font-semibold">[ Klik di mana saja untuk mulai berjalan ]</p></div>
                    </div>
                </div>
            )}

            {/* SILENT / STEALTH HINT */}
            {gameState === 'STEALTH' && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 p-3 w-full max-w-3xl bg-neutral-900/90 border border-neutral-700 rounded-xl text-center text-xs text-yellow-400 tracking-wider shadow-2xl backdrop-blur z-20">
                    {lastActionText || "🔴 Hindari lingkaran pandang (Vision Cone) Oknum Admin, lalu tekan E di ruang komputer untuk memotret layar data!"}
                </div>
            )}

            {/* PILIHAN AKSI FIGHT */}
            {gameState === 'FIGHT_CHOICE' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-2xl font-bold text-blue-300 mb-2">PILIH LANGKAH ARYA!</h2>
                    <p className="text-xs text-neutral-300 max-w-lg mb-6 leading-relaxed">Layar data sudah terekam. Oknum Administrasi panik dan berusaha merampas HP-mu. Pilih langkahmu!</p>
                    <div className="flex flex-col gap-4 w-full max-w-md">
                        <button onClick={() => { setGameState('PLAYING'); setBossHpPct(100); setPlayerHpPct(100); setLastActionText('Lari keliling ranjang IGD, lalu tekan F/SPACE untuk merekam Oknum Administrasi!'); }} className="py-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl border-b-4 border-blue-800 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer">
                            <span>📱</span> LAWAN DENGAN SINAR REKAM HP
                        </button>
                        <button onClick={handleSurrender} className="py-4 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-xl border-b-4 border-red-900 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer">
                            <span>💸</span> 🏳️ Menyerah & Bayar DP VIP Rp5.000.000
                        </button>
                    </div>
                </div>
            )}

            {/* VICTORY */}
            {gameState === 'VICTORY' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-3xl font-bold text-green-400 mb-3">LEVEL 4 SELESAI! 🎉</h2>
                    <p className="text-sm text-neutral-200 max-w-md mb-6 leading-relaxed">{lastActionText}</p>
                    <button onClick={() => router.push('/shop?next=5')} className="px-8 py-3.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800 shadow-xl cursor-pointer">Lanjut ke Level 5 →</button>
                </div>
            )}

            {/* GAME OVER */}
            {gameState === 'GAMEOVER' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-3xl font-bold text-red-500 mb-3">GAGAL! KEADILAN TERTUNDA</h2>
                    <p className="text-sm text-neutral-200 max-w-md mb-6 leading-relaxed">{lastActionText}</p>
                    <div className="flex gap-4">
                        <button onClick={restartGame} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800 cursor-pointer">Coba Lagi Level 4</button>
                        <button onClick={() => router.push('/menu')} className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl border border-neutral-600 cursor-pointer">Kembali ke Menu</button>
                    </div>
                </div>
            )}

            {gameState === 'PLAYING' && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 p-3 w-full max-w-3xl bg-neutral-900/90 border border-neutral-700 rounded-xl text-center text-xs text-yellow-400 tracking-wider shadow-2xl backdrop-blur z-20">
                    {lastActionText || "Tekan F / SPACE untuk merekam Oknum Administrasi dengan sinar HP!"}
                </div>
            )}
        </div>
    );
}