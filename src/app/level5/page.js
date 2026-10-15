// src/app/level5/page.js
// LEVEL 5 : KOS-KOSAN FIKTIF (CALO KONTRAKAN)
// Labirin gang sempit perkotaan: rintangan statis (gerobak bakso, jemuran warga,
// pot tanaman, motor terparkir). Karakter & gaya sama seperti Level 4.
//
// MEKANIK KHUSUS:
//  - REVERSE CHASE: bos (Calo) berlari MENJAUHI Arya menyusuri labirin gang.
//  - TIMER 90 DETIK: Arya harus memojokkan Calo & merekam wajahnya (HP 180) sebelum kabur.
//  - RINTANGAN JEMURAN: menabrak jemuran warga membuat Arya melambat 2 detik.
//
// ALUR: STORY_INTRO -> MISSION_OVERLAY -> IBU_DIALOG (Ibu Pemilik Asli, Calo kabur)
//       -> CHASE (90s, kejar & rekam) -> JUKIR_DIALOG (Calo terpojok) -> VICTORY / GAMEOVER
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Level5Page() {
    const router = useRouter();
    const canvasRef = useRef(null);

    const [gameState, setGameState] = useState('STORY_INTRO');
    const [dialogIndex, setDialogIndex] = useState(0);
    const [playerMoney, setPlayerMoney] = useState(50000);
    const [lastActionText, setLastActionText] = useState('');
    const [bossHpPct, setBossHpPct] = useState(100);
    const [playerHpPct, setPlayerHpPct] = useState(100);
    const [timeLeft, setTimeLeft] = useState(90);
    const [slowActive, setSlowActive] = useState(false);

    // ==================================================
    // NASKAH DIALOG LENGKAP (DARI SPEC)
    // ==================================================
    // A. Dialog Intro Level 5 (Di Depan Kontrakan - Arya & Calo Penipu)
    const introDialogs = [
        { speaker: "Calo Penipu", text: "Nah, ini rumahnya Mas Arya. Adem kan? Cocok banget buat Kakek istirahat. Sewanya murah, tapi yang naksir sudah lima orang hari ini." },
        { speaker: "Arya", text: "Wah, iya Pak, halamannya bersih. Tapi boleh saya lihat bagian dalamnya dulu?" },
        { speaker: "Calo Penipu", text: "Waduh, kuncinya lagi dibawa tukang bersih-bersih. Gini aja, Mas kasih uang ikat DP Rp150.000 tunai sekarang ke saya, sore nanti kuncinya langsung saya antar. Kalau nggak DP sekarang, lima menit lagi diambil orang loh!" },
        { speaker: "Arya", text: "Hmm, gitu ya Pak... Ya sudah, ini Pak uang Rp150.000-nya. Tolong kwitansinya." },
    ];

    // B. Dialog Informan (Teras Rumah - Ibu Pemilik Asli, Arya, & Calo)
    const ibuDialogs = [
        { speaker: "Ibu Pemilik Asli", text: "(Keluar dari pintu samping) Loh, Mas? Ini ramai-ramai ada apa ya di depan teras rumah saya?" },
        { speaker: "Arya", text: "Selamat siang, Bu. Saya penyewa baru yang barusan bayar DP kontrakan ke Bapak pemilik ini." },
        { speaker: "Ibu Pemilik Asli", text: "Hah?! Kontrakan apa?! Ini rumah pribadi saya dan keluarga, tidak pernah saya sewakan! Dan saya nggak kenal bapak baju rapi ini siapa!" },
        { speaker: "Calo Penipu", text: "(Panik) Waduh, gawat! Kabuuur!" },
        { speaker: "Ibu Pemilik Asli", text: "Ya ampun Dek, kamu kena tipu calo kos-kosan fiktif yang lagi marak di grup Facebook itu! Kejar Dek, dia lari ke arah gang belakang, di ujung sana ada jalan buntu!" },
        { speaker: "Arya", text: "Kurang ajar! Uang tabungan untuk Kakek malah dibawa kabur!" },
    ];

    // C. Dialog Konfrontasi Bos (Saat Calo Terpojok di Gang - Arya & Calo Penipu)
    const bossDialogs = [
        { speaker: "Arya", text: "Mau lari ke mana lagi kamu?! Gang ini buntu! Kembalikan uang Rp150.000 saya sekarang!" },
        { speaker: "Calo Penipu", text: "Jangan mendekat lu! Salah lu sendiri gampang banget ditipu modal foto comotan dari Google! Uang yang udah masuk kantong gue itu rezeki gue!" },
        { speaker: "Arya", text: "Rezeki dari hasil menipu orang susah itu haram! Kamu tidak tahu betapa susahnya saya mencari uang itu untuk Kakek saya!" },
        { speaker: "Calo Penipu", text: "Minggir! Gue teriakin maling nih biar warga bingung siapa yang penipu!" },
        { speaker: "Arya", text: "Teriak saja! Kamera HP saya sudah merekam pengakuanmu barusan. Kamu tidak akan bisa menipu korban lain lagi!" },
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
            else if (gameState === 'IBU_DIALOG') setGameState('CHASE');
            else if (gameState === 'JUKIR_DIALOG') setGameState('VICTORY');
        }
    };

    // ==================================================
    // REF ASSET & ENTITAS
    // ==================================================
    const aryaImgRef = useRef(null);
    const ibuImgRef = useRef(null);   // Ibu Pemilik Asli (informan)
    const caloImgRef = useRef(null);  // Calo Kontrakan (bos)
    const extTilesetRef = useRef(null);

    // Arya (Player): HP 100, Speed 4.5 (lebih gesit)
    const playerRef = useRef({
        x: 0, y: 0, size: 66, colSize: 42, speed: 4.5, baseSpeed: 4.5, health: 100, maxHealth: 100,
        facingDirection: 'down', isWalking: false, frameIndex: 1, frameTimer: 0, isAttacking: false, attackTimer: 0,
    });

    // Ibu Pemilik Asli (NPC Informan)
    const ibuRef = useRef({ x: 0, y: 0, size: 66, colSize: 42, facingDirection: 'down', frameIndex: 1, frameTimer: 0 });

    // Calo Kontrakan Penipu (Bos): HP 180, Speed 3.8, LARI MENJAUH
    const bossRef = useRef({
        x: 0, y: 0, size: 66, colSize: 42, speed: 3.8, health: 180, maxHealth: 180,
        facingDirection: 'down', isWalking: false, frameIndex: 1, frameTimer: 0,
    });

    const keysRef = useRef({});
    const initedRef = useRef(false);
    const timerFramesRef = useRef(90 * 60);   // 90 detik @60fps
    const slowTimerRef = useRef(0);           // sisa frame efek melambat
    const lastSecRef = useRef(90);
    const slowUiRef = useRef(false);

    // ==================================================
    // LAYOUT LABIRIN (grid 13 x 9) - '#' = bangunan, '.' = gang
    // Koridor gang pada baris ganjil, penghubung vertikal pada kolom ganjil.
    // ==================================================
    const MAZE = [
        "#############",
        "#...........#",
        "#.#.#.#.#.#.#",
        "#...........#",
        "#.#.#.#.#.#.#",
        "#...........#",
        "#.#.#.#.#.#.#",
        "#...........#",
        "#############",
    ];
    const COLS = 13;
    const ROWS = 9;

    // Posisi awal (grid). PENTING: jangan sampai bertumpuk dengan rintangan mana pun.
    const START = {
        ibu: { gx: 1, gy: 1 },
        player: { gx: 2, gy: 1 },
        boss: { gx: 6, gy: 1 },
    };

    // Rintangan statis (koordinat grid). Semua jauh dari sel posisi awal.
    // 'jemuran' = bisa dilewati tetapi MELAMBATKAN. Sisanya = penghalang.
    const OBSTACLES = [
        { gx: 4, gy: 3, type: 'gerobak', w: 46, h: 46, label: 'BAKSO' },
        { gx: 10, gy: 5, type: 'gerobak', w: 46, h: 46, label: 'BAKSO' },
        { gx: 2, gy: 5, type: 'pot', w: 34, h: 34 },
        { gx: 11, gy: 3, type: 'pot', w: 34, h: 34 },
        { gx: 9, gy: 1, type: 'motor', w: 48, h: 34 },
        { gx: 3, gy: 7, type: 'motor', w: 48, h: 34 },
        { gx: 7, gy: 5, type: 'jemuran', w: 56, h: 18 },
        { gx: 2, gy: 3, type: 'jemuran', w: 56, h: 18 },
        { gx: 10, gy: 7, type: 'jemuran', w: 56, h: 18 },
    ];

    useEffect(() => {
        const handleKeyDown = (e) => { keysRef.current[e.key.toLowerCase()] = true; };
        const handleKeyUp = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Load karakter (hapus background putih) - gaya sama Level 4
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
        loadCharImage('/assets/pak_rt.jpg', ibuImgRef);           // Ibu Pemilik Asli
        loadCharImage('/assets/petugas_pungli.jpg', caloImgRef);  // Calo Kontrakan (bos)

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
            const ibu = ibuRef.current;
            const boss = bossRef.current;
            const keys = keysRef.current;
            const extTileset = extTilesetRef.current;

            // ---------- Geometri labirin ----------
            const topPad = 92;
            const cell = Math.min((W - 80) / COLS, (H - topPad - 46) / ROWS);
            const mazeW = cell * COLS, mazeH = cell * ROWS;
            const offX = (W - mazeW) / 2;
            const offY = topPad + Math.max(0, (H - topPad - 46 - mazeH) / 2);

            const cellCenterX = (gx) => offX + gx * cell + cell / 2;
            const cellCenterY = (gy) => offY + gy * cell + cell / 2;
            const isWall = (gx, gy) => {
                if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) return true;
                return MAZE[gy][gx] === '#';
            };
            const toGrid = (wx, wy) => ({ gx: Math.floor((wx - offX) / cell), gy: Math.floor((wy - offY) / cell) });

            // Rintangan dalam koordinat pixel
            const obstacles = OBSTACLES.map((o) => ({
                ...o,
                x: cellCenterX(o.gx) - o.w / 2,
                y: cellCenterY(o.gy) - o.h / 2,
                width: o.w,
                height: o.h,
            }));
            const blockingObstacles = obstacles.filter((o) => o.type !== 'jemuran');
            const slowObstacles = obstacles.filter((o) => o.type === 'jemuran');

            const boxOf = (e) => ({
                x: e.x + e.size / 2 - e.colSize / 2,
                y: e.y + e.size / 2 - e.colSize / 2,
                width: e.colSize,
                height: e.colSize,
            });
            const rectIntersect = (r1, r2) =>
                r1.x < r2.x + r2.width && r1.x + r1.width > r2.x && r1.y < r2.y + r2.height && r1.y + r1.height > r2.y;

            const canStand = (bx, by, colSize) => {
                const pts = [
                    [bx, by], [bx + colSize, by], [bx, by + colSize], [bx + colSize, by + colSize],
                    [bx + colSize / 2, by + colSize / 2],
                ];
                for (const [px, py] of pts) {
                    const { gx, gy } = toGrid(px, py);
                    if (isWall(gx, gy)) return false;
                }
                const b = { x: bx, y: by, width: colSize, height: colSize };
                for (const o of blockingObstacles) if (rectIntersect(b, o)) return false;
                return true;
            };

            // geser entity (dengan slide di dinding)
            const moveEntity = (e, dirx, diry, speed) => {
                const len = Math.hypot(dirx, diry);
                if (len === 0) return false;
                const sx = (dirx / len) * speed;
                const sy = (diry / len) * speed;
                const b = boxOf(e);
                if (canStand(b.x + sx, b.y + sy, e.colSize)) { e.x += sx; e.y += sy; return true; }
                if (canStand(b.x + sx, b.y, e.colSize)) { e.x += sx; return true; }
                if (canStand(b.x, b.y + sy, e.colSize)) { e.y += sy; return true; }
                return false;
            };

            // ---------- Inisialisasi posisi awal ----------
            if (!initedRef.current) {
                const place = (e, gx, gy) => {
                    e.x = cellCenterX(gx) - e.size / 2;
                    e.y = cellCenterY(gy) - e.size / 2;
                };
                place(ibu, START.ibu.gx, START.ibu.gy);
                place(player, START.player.gx, START.player.gy);
                place(boss, START.boss.gx, START.boss.gy);
                player.health = 100;
                boss.health = 180;
                initedRef.current = true;
            }

            // ==========================================================
            // RENDER LABIRIN
            // ==========================================================
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(0, 0, W, H);

            for (let gy = 0; gy < ROWS; gy++) {
                for (let gx = 0; gx < COLS; gx++) {
                    const x = offX + gx * cell;
                    const y = offY + gy * cell;
                    if (isWall(gx, gy)) {
                        ctx.fillStyle = '#7c2d12';
                        ctx.fillRect(x, y, cell, cell);
                        ctx.fillStyle = '#9a3412';
                        ctx.fillRect(x + 4, y + 4, cell - 8, cell - 8);
                        ctx.fillStyle = 'rgba(0,0,0,0.18)';
                        ctx.fillRect(x, y + cell - 8, cell, 8);
                        ctx.fillStyle = '#b45309';
                        ctx.fillRect(x + 6, y + 6, cell - 12, 12);
                    } else {
                        ctx.fillStyle = '#cbd5e1';
                        ctx.fillRect(x, y, cell, cell);
                        ctx.fillStyle = '#b6c2d1';
                        ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
                        ctx.strokeStyle = 'rgba(100,116,139,0.35)';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(x + 0.5, y + 0.5, cell, cell);
                    }
                }
            }

            // label
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('RUMAH KONTRAKAN', cellCenterX(1), cellCenterY(1) - cell * 0.34);
            ctx.fillStyle = '#f87171';
            ctx.fillText('GANG BUNTU', cellCenterX(11), cellCenterY(7) + cell * 0.42);
            ctx.textAlign = 'left';

            // ---------- RENDER RINTANGAN ----------
            obstacles.forEach((o) => {
                if (o.type === 'gerobak') {
                    ctx.fillStyle = '#78350f'; ctx.fillRect(o.x, o.y, o.width, o.height);
                    ctx.fillStyle = '#f59e0b'; ctx.fillRect(o.x, o.y - 6, o.width, 10);
                    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 9px monospace';
                    ctx.fillText(o.label || 'BAKSO', o.x + 4, o.y + o.height - 5);
                } else if (o.type === 'pot') {
                    ctx.fillStyle = '#b45309'; ctx.beginPath();
                    ctx.moveTo(o.x + 4, o.y + o.height); ctx.lineTo(o.x + o.width - 4, o.y + o.height);
                    ctx.lineTo(o.x + o.width - 8, o.y); ctx.lineTo(o.x + 8, o.y); ctx.closePath(); ctx.fill();
                    ctx.fillStyle = '#16a34a';
                    ctx.beginPath(); ctx.arc(o.x + o.width / 2, o.y, o.width / 2, 0, Math.PI * 2); ctx.fill();
                } else if (o.type === 'motor') {
                    ctx.fillStyle = '#1e293b'; ctx.fillRect(o.x, o.y + 6, o.width, o.height - 10);
                    ctx.fillStyle = '#0ea5e9'; ctx.fillRect(o.x + 4, o.y + 2, o.width - 12, o.height - 12);
                    ctx.fillStyle = '#0f172a';
                    ctx.beginPath(); ctx.arc(o.x + 8, o.y + o.height - 2, 6, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(o.x + o.width - 8, o.y + o.height - 2, 6, 0, Math.PI * 2); ctx.fill();
                } else if (o.type === 'jemuran') {
                    const gY = o.y + o.height / 2;
                    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.moveTo(o.x - 6, gY - 12); ctx.lineTo(o.x + o.width + 6, gY - 12); ctx.stroke();
                    const colors = ['#ef4444', '#3b82f6', '#f59e0b', '#22c55e', '#a855f7'];
                    for (let i = 0; i < 5; i++) {
                        ctx.fillStyle = colors[i % colors.length];
                        ctx.fillRect(o.x + 2 + i * (o.width - 8) / 5, gY - 12, 8, 22);
                    }
                    ctx.fillStyle = '#1e3a8a'; ctx.font = 'bold 8px monospace';
                    ctx.fillText('JEMURAN', o.x + 6, gY + 20);
                }
            });

            // ==========================================================
            // TIMER & EFEK MELAMBAT
            // ==========================================================
            if (gameState === 'CHASE') {
                timerFramesRef.current = Math.max(0, timerFramesRef.current - 1);
                const sec = Math.ceil(timerFramesRef.current / 60);
                if (sec !== lastSecRef.current) {
                    lastSecRef.current = sec;
                    setTimeLeft(sec);
                }
                if (timerFramesRef.current <= 0) {
                    setGameState('GAMEOVER');
                    setLastActionText('Waktu habis! Calo kontrakan berhasil kabur dari gang dan uang DP Rp150.000 milikmu lenyap.');
                }
            }
            if (slowTimerRef.current > 0) slowTimerRef.current -= 1;
            const isSlowed = slowTimerRef.current > 0;
            player.speed = isSlowed ? 2.2 : player.baseSpeed;

            // ==========================================================
            // PERGERAKAN PEMAIN
            // ==========================================================
            player.isWalking = false;
            const canControl = gameState === 'CHASE';

            if (canControl) {
                let dx = 0, dy = 0;
                if (keys['w'] || keys['arrowup']) { dy -= 1; player.facingDirection = 'up'; }
                if (keys['s'] || keys['arrowdown']) { dy += 1; player.facingDirection = 'down'; }
                if (keys['a'] || keys['arrowleft']) { dx -= 1; player.facingDirection = 'left'; }
                if (keys['d'] || keys['arrowright']) { dx += 1; player.facingDirection = 'right'; }

                if (dx !== 0 || dy !== 0) {
                    player.isWalking = moveEntity(player, dx, dy, player.speed);
                }
            }

            player.frameTimer++;
            if (player.isWalking) {
                if (player.frameTimer >= 8) { player.frameIndex = (player.frameIndex + 1) % 3; player.frameTimer = 0; }
            } else player.frameIndex = 1;

            // tabrak jemuran -> melambat 2 detik
            if (canControl) {
                const pb = boxOf(player);
                let hitJemuran = false;
                for (const j of slowObstacles) {
                    if (rectIntersect(pb, j)) {
                        slowTimerRef.current = 120; // 2 detik @60fps
                        hitJemuran = true;
                        break;
                    }
                }
                if (hitJemuran) setLastActionText('🧺 Arya menabrak jemuran warga! Larinya melambat sejenak...');
                const uiSlow = slowTimerRef.current > 0;
                if (uiSlow !== slowUiRef.current) { slowUiRef.current = uiSlow; setSlowActive(uiSlow); }
            }

            // ==========================================================
            // AI CALO: LARI MENJAUH (REVERSE CHASE)
            // ==========================================================
            if (gameState === 'CHASE') {
                const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
                const b = boxOf(boss);
                const pcx = player.x + player.size / 2;
                const pcy = player.y + player.size / 2;
                const opts = [];
                for (let i = 0; i < dirs.length; i++) {
                    const sx = dirs[i][0] * boss.speed;
                    const sy = dirs[i][1] * boss.speed;
                    if (canStand(b.x + sx, b.y + sy, boss.colSize)) {
                        const ncx = boss.x + sx + boss.size / 2;
                        const ncy = boss.y + sy + boss.size / 2;
                        opts.push({ sx, sy, dist: Math.hypot(ncx - pcx, ncy - pcy), i });
                    }
                }
                if (opts.length > 0) {
                    opts.sort((a, bb) => bb.dist - a.dist); // paling jauh dari Arya
                    const pick = (opts.length > 1 && Math.random() < 0.25) ? opts[1] : opts[0];
                    boss.x += pick.sx; boss.y += pick.sy;
                    boss.isWalking = true;
                    if (pick.i === 0) boss.facingDirection = 'right';
                    if (pick.i === 1) boss.facingDirection = 'left';
                    if (pick.i === 2) boss.facingDirection = 'down';
                    if (pick.i === 3) boss.facingDirection = 'up';
                    boss.frameTimer++;
                    if (boss.frameTimer >= 7) { boss.frameIndex = (boss.frameIndex + 1) % 3; boss.frameTimer = 0; }
                } else {
                    boss.isWalking = false;
                }
            } else {
                boss.isWalking = false;
            }

            // ==========================================================
            // REKAM WAJAH CALO (tekan F / SPACE saat sudah dekat)
            // ==========================================================
            if (gameState === 'CHASE') {
                if (player.attackTimer > 0) { player.attackTimer--; if (player.attackTimer <= 0) player.isAttacking = false; }

                const bbc = boxOf(boss);
                const pbc = boxOf(player);
                const dist = Math.hypot((bbc.x + bbc.width / 2) - (pbc.x + pbc.width / 2), (bbc.y + bbc.height / 2) - (pbc.y + pbc.height / 2));

                if ((keys['f'] || keys[' ']) && !player.isAttacking) {
                    player.isAttacking = true;
                    player.attackTimer = 16;
                    if (dist < 120) {
                        boss.health -= 20; // 180 HP -> 9 rekaman
                        setBossHpPct(Math.max(0, (boss.health / boss.maxHealth) * 100));
                        setLastActionText('📱 Wajah calo terekam! Ia makin panik! (-20 HP)');
                        if (boss.health <= 0) {
                            setDialogIndex(0);
                            setGameState('JUKIR_DIALOG');
                        }
                    } else {
                        setLastActionText('📱 Arya merekam... (kejar lebih dekat dulu si calo!)');
                    }
                }
            }

            // ==========================================================
            // RENDER ENTITAS (gaya Level 4)
            // ==========================================================
            renderSpriteSheet(ctx, ibuImgRef.current, ibu, 'Ibu Pemilik');
            renderSpriteSheet(ctx, caloImgRef.current, boss, 'Calo Kontrakan');
            renderSpriteSheet(ctx, aryaImgRef.current, player, 'Arya');

            // bar HP bos
            if (gameState === 'CHASE') {
                const bw = 90, bx = boss.x + boss.size / 2 - bw / 2, by = boss.y - 26;
                ctx.fillStyle = '#450a0a'; ctx.fillRect(bx, by, bw, 7);
                ctx.fillStyle = '#ef4444'; ctx.fillRect(bx, by, bw * Math.max(0, boss.health / boss.maxHealth), 7);
                ctx.strokeStyle = '#fca5a5'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, 7);
            }

            // halo efek melambat
            if (isSlowed) {
                ctx.strokeStyle = 'rgba(56,189,248,0.85)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(player.x + player.size / 2, player.y + player.size / 2, player.size * 0.72, 0, Math.PI * 2);
                ctx.stroke();
            }

            // efek rekam
            if (player.isAttacking) {
                const beam = getHpBeamRect(player);
                ctx.fillStyle = 'rgba(59, 130, 246, 0.45)';
                ctx.fillRect(beam.x, beam.y, beam.width, beam.height);
                ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2; ctx.strokeRect(beam.x, beam.y, beam.width, beam.height);
            }

            // penunjuk arah ke calo
            if (gameState === 'CHASE') {
                const cx = W / 2, cy = H - 30;
                const ang = Math.atan2((boss.y - player.y), (boss.x - player.x));
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(ang);
                ctx.fillStyle = '#facc15';
                ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -10); ctx.lineTo(-10, 10); ctx.closePath(); ctx.fill();
                ctx.restore();
                ctx.fillStyle = '#facc15'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
                ctx.fillText('CALO', cx, cy - 16);
                ctx.textAlign = 'left';
            }

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        gameLoop();

        return () => { window.removeEventListener('resize', resizeCanvas); cancelAnimationFrame(animationFrameId); };
    }, [gameState]);

    const restartGame = () => {
        initedRef.current = false;
        timerFramesRef.current = 90 * 60;
        lastSecRef.current = 90;
        slowTimerRef.current = 0;
        slowUiRef.current = false;
        playerRef.current = { ...playerRef.current, health: 100, speed: 4.5, isWalking: false, facingDirection: 'down', frameIndex: 1 };
        bossRef.current = { ...bossRef.current, health: 180, isWalking: false, facingDirection: 'down', frameIndex: 1 };
        setPlayerMoney(50000);
        setBossHpPct(100);
        setPlayerHpPct(100);
        setTimeLeft(90);
        setSlowActive(false);
        setDialogIndex(0);
        setLastActionText('');
        setGameState('STORY_INTRO');
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
            ctx.fillStyle = label === 'Arya' ? '#22c55e' : label === 'Calo Kontrakan' ? '#ef4444' : '#f59e0b';
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
                    <span className="px-3 py-1 bg-purple-500/25 border border-purple-500 text-purple-300 text-xs font-bold rounded-md">LEVEL 5</span>
                    <h1 className="text-sm font-bold tracking-wide text-white">SURVIVAL WNI : Kos-kosan Fiktif</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-neutral-600 rounded-lg">
                        <span className="text-[10px] text-red-400 font-bold">HP ARYA</span>
                        <div className="w-20 h-2 bg-neutral-700 rounded overflow-hidden">
                            <div className="h-full bg-red-500 transition-all" style={{ width: `${playerHpPct}%` }} />
                        </div>
                    </div>
                    {(gameState === 'CHASE' || gameState === 'JUKIR_DIALOG') && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-red-700 rounded-lg">
                            <span className="text-[10px] text-yellow-400 font-bold">CALO</span>
                            <div className="w-20 h-2 bg-neutral-700 rounded overflow-hidden">
                                <div className="h-full bg-yellow-500 transition-all" style={{ width: `${bossHpPct}%` }} />
                            </div>
                        </div>
                    )}
                    {gameState === 'CHASE' && (
                        <div className={`px-3 py-1 text-xs font-bold rounded-lg border ${timeLeft <= 20 ? 'bg-red-950 border-red-600 text-red-400 animate-pulse' : 'bg-neutral-800 border-neutral-600 text-yellow-300'}`}>
                            ⏱️ {timeLeft}s
                        </div>
                    )}
                    {slowActive && gameState === 'CHASE' && (
                        <div className="px-3 py-1 text-xs font-bold rounded-lg border bg-sky-950 border-sky-600 text-sky-300">
                            🧺 Melambat
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
                <div className={`absolute bottom-8 left-8 right-8 bg-neutral-900/95 border-2 p-6 rounded-2xl shadow-2xl backdrop-blur z-20 max-w-4xl mx-auto ${gameState === 'JUKIR_DIALOG' ? 'border-red-500' : gameState === 'IBU_DIALOG' ? 'border-amber-500' : 'border-purple-500'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <span className={`font-bold text-sm px-3 py-1 rounded ${activeDialogs[dialogIndex]?.speaker === 'Arya' ? 'bg-green-600 text-white' : activeDialogs[dialogIndex]?.speaker === 'Calo Penipu' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'}`}>
                            {activeDialogs[dialogIndex]?.speaker}
                        </span>
                        <span className="text-xs text-neutral-400 font-mono">{dialogIndex + 1} / {activeDialogs.length}</span>
                    </div>
                    <p className="text-sm text-neutral-100 italic leading-relaxed my-3 min-h-[48px]">"{activeDialogs[dialogIndex]?.text}"</p>
                    <button onClick={handleNextDialog} className="w-full py-3 bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs rounded-xl border-b-4 border-purple-700 cursor-pointer tracking-widest">
                        LANJUT ➔
                    </button>
                </div>
            )}

            {/* MISSION OVERLAY */}
            {gameState === 'MISSION_OVERLAY' && (
                <div onClick={() => setGameState('IBU_DIALOG')} className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 cursor-pointer text-center select-none backdrop-blur-md">
                    <div className="max-w-md bg-neutral-900 border border-neutral-700 p-8 rounded-2xl shadow-2xl space-y-5 hover:border-purple-500/50 transition-colors">
                        <div className="w-16 h-16 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">🏠</div>
                        <h2 className="text-xl font-bold text-purple-300 tracking-wider">MISI UTAMA LEVEL 5</h2>
                        <p className="text-neutral-200 text-sm leading-relaxed">Calo kontrakan kabur membawa uang DP-mu! <span className="text-red-400 font-bold">Kejar dia</span> menyusuri labirin gang (ia lari MENJAUH), <span className="text-yellow-400 font-bold">rekam wajahnya</span> hingga HP-nya habis dalam <span className="text-yellow-400 font-bold">90 detik</span>. Hindari jemuran warga, larinya jadi lambat!</p>
                        <div className="pt-4 border-t border-neutral-800"><p className="text-xs text-purple-300 animate-pulse font-mono font-semibold">[ Klik di mana saja untuk mulai ]</p></div>
                    </div>
                </div>
            )}

            {/* CHASE HINT */}
            {gameState === 'CHASE' && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 p-3 w-full max-w-3xl bg-neutral-900/90 border border-neutral-700 rounded-xl text-center text-xs text-yellow-400 tracking-wider shadow-2xl backdrop-blur z-20 pointer-events-none">
                    {lastActionText || "🏃 KEJAR Calo yang lari menjauh! Tekan F / SPACE untuk MEREKAM wajahnya saat sudah dekat!"}
                </div>
            )}

            {/* VICTORY */}
            {gameState === 'VICTORY' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-3xl font-bold text-green-400 mb-3">LEVEL 5 SELESAI! 🎉</h2>
                    <p className="text-sm text-neutral-200 max-w-md mb-6 leading-relaxed">{lastActionText || 'Wajah calo kontrakan terekam jelas di gang buntu! Uang DP-mu kembali, dan ia diserahkan ke warga untuk diproses.'}</p>
                    <button onClick={() => router.push('/shop?next=6')} className="px-8 py-3.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800 shadow-xl cursor-pointer">Lanjut ke Level 6 →</button>
                </div>
            )}

            {/* GAME OVER */}
            {gameState === 'GAMEOVER' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-3xl font-bold text-red-500 mb-3">CALO BERHASIL KABUR!</h2>
                    <p className="text-sm text-neutral-200 max-w-md mb-6 leading-relaxed">{lastActionText}</p>
                    <div className="flex gap-4">
                        <button onClick={restartGame} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800 cursor-pointer">Coba Lagi Level 5</button>
                        <button onClick={() => router.push('/menu')} className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl border border-neutral-600 cursor-pointer">Kembali ke Menu</button>
                    </div>
                </div>
            )}
        </div>
    );
}