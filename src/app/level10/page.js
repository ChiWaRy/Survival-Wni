// src/app/level10/page.js
// LEVEL 10 : TUAN TANAH & SANG DALANG (FINAL BOSS)
// Penthouse & Rooftop Gedung Pusat Kota: karpet merah kerajaan, meja kerja raksasa
// kayu mahoni, 3 terminal server rahasia di sudut ruangan, pintu kaca menuju rooftop.
// Karakter & gaya sama seperti Level 9.
//
// MEKANIK KHUSUS - 3 FASE PERTARUNGAN EPIK:
//  FASE 1 (Retas Server): Sang Dalang KEKAL ("Kekebalan Politik"). Arya menghindari
//          2 Bodyguard & berdiri di dekat 3 Server selama 3 detik per server.
//  FASE 2 (Bongkar Kekebalan): Kekebalan hancur. Sang Dalang mengejar (Spd 3.5) &
//          melempar proyektil "Suap Miliaran Rupiah". Tembak Sinar Live Streaming (HP 500).
//  FASE 3 (Epilog): Sirine KPK, layar epilog kemenangan Arya & Kakek.
//
// ALUR: STORY_INTRO -> MISSION_OVERLAY -> IBU_DIALOG (Whistleblower)
//       -> JUKIR_DIALOG (Sang Dalang) -> PHASE1 (retas) -> PHASE2 (perang) -> EPILOGUE -> VICTORY
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Level10Page() {
    const router = useRouter();
    const canvasRef = useRef(null);

    const [gameState, setGameState] = useState('STORY_INTRO');
    const [dialogIndex, setDialogIndex] = useState(0);
    const [playerMoney, setPlayerMoney] = useState(120000);
    const [lastActionText, setLastActionText] = useState('');
    const [playerHpPct, setPlayerHpPct] = useState(100);
    const [bossHpPct, setBossHpPct] = useState(100);
    const [serversHacked, setServersHacked] = useState(0);
    const [hackPct, setHackPct] = useState(0);

    // ==================================================
    // NASKAH DIALOG LENGKAP (DARI SPEC)
    // ==================================================
    // A. Dialog Intro Level 10 (Di Luar Pintu Penthouse - Arya & Whistleblower)
    const introDialogs = [
        { speaker: "Arya", text: "Jadi di sini muara dari semua penderitaan warga di kotaku... Gedung mewah yang dibangun di atas keringat dan air mata rakyat kecil." },
        { speaker: "Whistleblower", text: "Arya, dengar baik-baik! Kamu sudah berada di lantai puncak. Di balik pintu itu adalah Sang Dalang. Semua setoran pungli dari bawah bermuara ke brankas digitalnya." },
        { speaker: "Arya", text: "Apa yang harus aku lakukan? Merekam wajahnya saja tidak akan cukup untuk menjatuhkan orang sekuat dia." },
        { speaker: "Whistleblower", text: "Benar! Selama data servernya belum bocor, dia kebal hukum. Kamu harus meretas tiga terminal komputer di sudut ruangannya terlebih dahulu untuk membuka kedoknya, baru lakukan siaran langsung nasional!" },
    ];

    // C. Dialog Konfrontasi Final Boss (Dalam Penthouse - Arya & Sang Dalang)
    const bossDialogs = [
        { speaker: "Sang Dalang", text: "(Bertepuk tangan pelan) Luar biasa... Jadi ini bocah lulusan SMK yang belakangan ini bikin gaduh bisnis di kotaku. Nyalimu besar juga bisa sampai ke ruangan pribadiku, Arya." },
        { speaker: "Arya", text: "Berhenti bersembunyi di balik anak buahmu! Dari oknum kelurahan, HRD pabrik, preman pasar, sampai pencuri beras bansos Kakekku—semuanya menyetor uang ke rekeningmu!" },
        { speaker: "Sang Dalang", text: "Hahaha! Kamu masih terlalu muda dan naif untuk mengerti cara dunia ini bekerja, Nak. Sistem yang kamu sebut 'korupsi' itu adalah oli yang melumasi roda kekuasaan di kota ini! Tanpa aku, mereka di bawah tidak bisa makan!" },
        { speaker: "Arya", text: "Kalian tidak memberi makan rakyat, kalian menghisap darah rakyat sampai kering! Orang jujur seperti Kakekku disingkirkan, sementara penipu kalian pelihara!" },
        { speaker: "Sang Dalang", text: "Kejujuran itu komoditas murahan yang tidak laku di pasar kekuasaan! Tapi... aku suka kegigihanmu. Bagaimana kalau kita buat kesepakatan? Hentikan aksimu, masuk ke dalam sistemku, dan kuberikan cek kosong malam ini. Sebutkan angkanya, maka hidupmu dan kakekmu akan terjamin tujuh turunan!" },
        { speaker: "Arya", text: "Pesan Kakekku jelas: Jalan lurus memang terjal dan sepi, tapi harga diriku dan masa depan bangsaku TIDAK DIJUAL! Hari ini, seluruh Indonesia akan melihat wajah asli di balik topeng terhormatmu! Siaran langsung dimulai... SEKARANG!" },
        { speaker: "Sang Dalang", text: "Bocah keras kepala! Pengawal! Hancurkan dia dan rampas telepon genggamnya, jangan biarkan dia menyentuh komputer serverku!" },
    ];

    // C. Dialog Epilog / Kemenangan Akhir (Teras Rumah Kakek - Arya & Kakek)
    const epilogDialogs = [
        { speaker: "Suara Berita TV", text: "[BREAKING NEWS] Berkat bukti siaran langsung dan dokumen aliran dana yang dibongkar oleh seorang pemuda bernama Arya, aparat penegak hukum pusat resmi menangkap tersangka utama sindikat korupsi dan pungutan liar daerah..." },
        { speaker: "Kakek", text: "(Tersenyum menatap Arya sambil menyeruput teh hangat) Kakek sudah bilang, kan, Nak? Kejujuran itu mungkin sering kalah di awal, tapi dia tidak akan pernah mati jika masih ada satu saja pemuda yang berani berdiri membela kebenaran." },
        { speaker: "Arya", text: "Semua ini berkat doa dan nasihat Kakek. Mulai besok, Arya sudah bisa bekerja dan membuka usaha dengan tenang di kota yang lebih bersih." },
        { speaker: "Kakek", text: "Kakek bangga padamu, Arya. Kamu telah berhasil bertahan hidup sebagai warga negara yang sejati." },
    ];

    const getActiveDialogs = () => {
        if (gameState === 'STORY_INTRO') return introDialogs;
        if (gameState === 'JUKIR_DIALOG') return bossDialogs;
        if (gameState === 'EPILOGUE') return epilogDialogs;
        return [];
    };

    const handleNextDialog = () => {
        const list = getActiveDialogs();
        if (dialogIndex < list.length - 1) {
            setDialogIndex(dialogIndex + 1);
        } else {
            if (gameState === 'STORY_INTRO') setGameState('MISSION_OVERLAY');
            else if (gameState === 'JUKIR_DIALOG') setGameState('PHASE1');
            else if (gameState === 'EPILOGUE') setGameState('VICTORY');
        }
    };

    // ==================================================
    // REF ASSET & ENTITAS
    // ==================================================
    const aryaImgRef = useRef(null);
    const csImgRef = useRef(null);      // Whistleblower (tampil di layar)
    const pejabatImgRef = useRef(null); // Sang Dalang (bos)
    const guardImgRef = useRef(null);   // Bodyguard (minion)
    const extTilesetRef = useRef(null);

    // Arya (Player): HP 100, Speed 5.0 (puncak ketangkasan)
    const playerRef = useRef({
        x: 0, y: 0, size: 66, colSize: 42, speed: 5.0, baseSpeed: 5.0, health: 100, maxHealth: 100,
        facingDirection: 'down', isWalking: false, frameIndex: 1, frameTimer: 0,
        isAttacking: false, attackTimer: 0, attackCooldown: false, hurtCd: 0,
    });

    // Whistleblower (di layar, statis)
    const csRef = useRef({ x: 0, y: 0, size: 66, colSize: 42, facingDirection: 'down', frameIndex: 1, frameTimer: 0 });

    // Sang Dalang (Final Boss): HP 500, Speed 3.5
    const bossRef = useRef({
        x: 0, y: 0, size: 70, colSize: 44, speed: 3.5, health: 500, maxHealth: 500,
        facingDirection: 'down', isWalking: false, frameIndex: 1, frameTimer: 0, hitCd: 0, shootTimer: 0,
    });

    // 2 Bodyguard Bayaran (minion): Speed 3.0, tidak bisa diserang
    const guard1Ref = useRef({ x: 0, y: 0, size: 62, colSize: 40, speed: 3.0, facingDirection: 'down', isWalking: false, frameIndex: 1, frameTimer: 0, hitCd: 0 });
    const guard2Ref = useRef({ x: 0, y: 0, size: 62, colSize: 40, speed: 3.0, facingDirection: 'down', isWalking: false, frameIndex: 1, frameTimer: 0, hitCd: 0 });

    const keysRef = useRef({});
    const initedRef = useRef(false);
    const projectilesRef = useRef([]);
    const hackRef = useRef([0, 0, 0]);     // progress 0..180 per server
    const hackedRef = useRef([false, false, false]);
    const hackUiRef = useRef(0);
    const hackPctUiRef = useRef(0);

    useEffect(() => {
        const handleKeyDown = (e) => { keysRef.current[e.key.toLowerCase()] = true; };
        const handleKeyUp = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Load karakter (hapus background putih) - gaya sama Level 9
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
        loadCharImage('/assets/pak_rt.jpg', csImgRef);            // Whistleblower
        loadCharImage('/assets/petugas_pungli.jpg', pejabatImgRef); // Sang Dalang (bos)
        loadCharImage('/assets/petugas_pungli.jpg', guardImgRef);   // Bodyguard

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
            const cs = csRef.current;
            const boss = bossRef.current;
            const g1 = guard1Ref.current;
            const g2 = guard2Ref.current;
            const keys = keysRef.current;

            // ---------- Area penthouse ----------
            const padTop = 96, padX = 40, padBottom = 40;
            const area = { x: padX, y: padTop, w: W - padX * 2, h: H - padTop - padBottom };

            // ---------- Meja kerja raksasa mahoni (atas tengah) ----------
            const desk = { x: area.x + area.w * 0.5 - 120, y: area.y + area.h * 0.055, w: 240, h: 74 };

            // ---------- 3 Terminal Server rahasia (sudut ruangan) ----------
            const servers = [
                { id: 0, x: area.x + area.w * 0.05, y: area.y + area.h * 0.30, w: 62, h: 74 },
                { id: 1, x: area.x + area.w * 0.90, y: area.y + area.h * 0.30, w: 62, h: 74 },
                { id: 2, x: area.x + area.w * 0.90, y: area.y + area.h * 0.80, w: 62, h: 74 },
            ];

            // ---------- Sofa & meja kopi dekoratif ----------
            const sofa = { x: area.x + area.w * 0.10, y: area.y + area.h * 0.80, w: 150, h: 56 };

            const solids = [desk, ...servers, sofa];

            const boxOf = (e) => ({
                x: e.x + e.size / 2 - e.colSize / 2,
                y: e.y + e.size / 2 - e.colSize / 2,
                width: e.colSize,
                height: e.colSize,
            });
            const rectIntersect = (r1, r2) =>
                r1.x < r2.x + r2.width && r1.x + r1.width > r2.x && r1.y < r2.y + r2.height && r1.y + r1.height > r2.y;

            const inAreaUnusedRemoved = null;
            void inAreaUnusedRemoved;

            const canStand = (bx, by, colSize) => {
                if (bx < area.x || by < area.y || bx + colSize > area.x + area.w || by + colSize > area.y + area.h) return false;
                const b = { x: bx, y: by, width: colSize, height: colSize };
                for (const o of solids) if (rectIntersect(b, o)) return false;
                return true;
            };

            const moveEntity = (e, dirx, diry, speed) => {
                const len = Math.hypot(dirx, diry);
                if (len === 0) return false;
                const sx = (dirx / len) * speed, sy = (diry / len) * speed;
                const b = boxOf(e);
                if (canStand(b.x + sx, b.y + sy, e.colSize)) { e.x += sx; e.y += sy; return true; }
                if (canStand(b.x + sx, b.y, e.colSize)) { e.x += sx; return true; }
                if (canStand(b.x, b.y + sy, e.colSize)) { e.y += sy; return true; }
                return false;
            };

            const stepToward = (e, tx, ty, speed) => {
                const b = boxOf(e);
                const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
                const dx = tx - cx, dy = ty - cy;
                if (Math.hypot(dx, dy) < speed) return false;
                if (moveEntity(e, dx, dy, speed)) return true;
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
                player.x = area.x + area.w * 0.5; player.y = area.y + area.h * 0.90; player.health = 100;
                boss.x = desk.x + desk.w / 2 - boss.size / 2; boss.y = desk.y + desk.h + 10;
                boss.health = 500; boss.hitCd = 0; boss.shootTimer = 60;
                g1.x = area.x + area.w * 0.28; g1.y = area.y + area.h * 0.20; g1.hitCd = 0;
                g2.x = area.x + area.w * 0.72; g2.y = area.y + area.h * 0.20; g2.hitCd = 0;
                cs.x = area.x + area.w * 0.5 - cs.size / 2; cs.y = area.y + area.h * 0.42;
                projectilesRef.current = [];
                hackRef.current = [0, 0, 0];
                hackedRef.current = [false, false, false];
                hackUiRef.current = 0; hackPctUiRef.current = 0;
                initedRef.current = true;
            }

            // ==========================================================
            // RENDER PENTHOUSE
            // ==========================================================
            ctx.fillStyle = '#1a0b0b'; ctx.fillRect(0, 0, W, H);
            // karpet merah kerajaan
            ctx.fillStyle = '#7f1d1d'; ctx.fillRect(area.x, area.y, area.w, area.h);
            ctx.fillStyle = '#991b1b'; ctx.fillRect(area.x + 18, area.y + 18, area.w - 36, area.h - 36);
            // ornamen emas tepi karpet
            ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3;
            ctx.strokeRect(area.x + 18, area.y + 18, area.w - 36, area.h - 36);
            ctx.lineWidth = 2; ctx.strokeRect(area.x + 34, area.y + 34, area.w - 68, area.h - 68);

            // dinding belakang & jendela kota malam
            ctx.fillStyle = '#0f0f1a'; ctx.fillRect(area.x, area.y, area.w, 46);
            for (let i = 0; i < 26; i++) {
                const bx = area.x + 12 + (i * 41) % (area.w - 24);
                const bh = 8 + ((i * 53) % 22);
                ctx.fillStyle = i % 3 === 0 ? '#fbbf24' : '#334155';
                ctx.fillRect(bx, area.y + 44 - bh, 6, bh);
            }

            // pintu kaca menuju rooftop (kanan atas)
            const door = { x: area.x + area.w - 96, y: area.y + 46, w: 90, h: 10 };
            ctx.fillStyle = 'rgba(147,197,253,0.35)'; ctx.fillRect(door.x, door.y, door.w, door.h);
            ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 2; ctx.strokeRect(door.x, door.y, door.w, door.h);
            ctx.fillStyle = '#bfdbfe'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
            ctx.fillText('ROOFTOP ▸', door.x + door.w / 2, door.y + door.h + 11);
            ctx.textAlign = 'left';

            // meja kerja raksasa mahoni
            ctx.fillStyle = '#4a2c0f'; ctx.fillRect(desk.x, desk.y, desk.w, desk.h);
            ctx.fillStyle = '#6b3f16'; ctx.fillRect(desk.x + 5, desk.y + 5, desk.w - 10, desk.h - 10);
            ctx.strokeStyle = '#3a2208'; ctx.lineWidth = 2; ctx.strokeRect(desk.x, desk.y, desk.w, desk.h);
            ctx.fillStyle = '#d4a24e'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
            ctx.fillText('MEJA SANG DALANG', desk.x + desk.w / 2, desk.y + 24);
            // taplak & lampu
            ctx.fillStyle = '#b91c1c'; ctx.fillRect(desk.x + desk.w - 60, desk.y + 8, 44, 12);
            ctx.fillStyle = '#facc15';
            ctx.beginPath(); ctx.arc(desk.x + 24, desk.y + 16, 6, 0, Math.PI * 2); ctx.fill();
            ctx.textAlign = 'left';

            // sofa dekoratif
            ctx.fillStyle = '#3f3f46'; ctx.fillRect(sofa.x, sofa.y, sofa.w, sofa.h);
            ctx.fillStyle = '#52525b'; ctx.fillRect(sofa.x + 4, sofa.y + 4, sofa.w - 8, sofa.h - 8);

            // 3 terminal server
            servers.forEach((sv) => {
                const hacked = hackedRef.current[sv.id];
                const prog = hackRef.current[sv.id] / 180;
                ctx.fillStyle = hacked ? '#064e3b' : '#1e293b';
                ctx.fillRect(sv.x, sv.y, sv.w, sv.h);
                ctx.fillStyle = hacked ? '#10b981' : '#334155';
                ctx.fillRect(sv.x + 4, sv.y + 4, sv.w - 8, sv.h - 8);
                // slot server
                for (let r = 0; r < 4; r++) {
                    ctx.fillStyle = hacked ? '#34d399' : '#0f172a';
                    ctx.fillRect(sv.x + 10, sv.y + 12 + r * 14, sv.w - 20, 8);
                }
                // LED
                ctx.fillStyle = hacked ? '#a7f3d0' : (Math.floor(Date.now() / 300) % 2 === 0 ? '#f59e0b' : '#78350f');
                ctx.beginPath(); ctx.arc(sv.x + sv.w - 12, sv.y + 9, 3, 0, Math.PI * 2); ctx.fill();
                // progress bar
                ctx.fillStyle = '#0f172a'; ctx.fillRect(sv.x, sv.y - 12, sv.w, 7);
                ctx.fillStyle = hacked ? '#22c55e' : '#facc15';
                ctx.fillRect(sv.x, sv.y - 12, sv.w * (hacked ? 1 : prog), 7);
                ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
                ctx.fillText(hacked ? '✔ DATA' : `SERVER ${sv.id + 1}`, sv.x + sv.w / 2, sv.y + sv.h + 12);
                ctx.textAlign = 'left';
            });

            // ==========================================================
            // STATUS & FASE
            // ==========================================================
            const inPlay = gameState === 'PHASE1' || gameState === 'PHASE2';
            const phase1 = gameState === 'PHASE1';
            const phase2 = gameState === 'PHASE2';
            if (player.hurtCd > 0) player.hurtCd -= 1;

            // ==========================================================
            // PEMAIN
            // ==========================================================
            player.isWalking = false;
            if (inPlay) {
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

            const pbBox = boxOf(player);

            // ==========================================================
            // FASE 1 - RETAS SERVER (3 detik per server)
            // ==========================================================
            if (phase1) {
                let nearId = -1;
                servers.forEach((sv) => {
                    const scx = sv.x + sv.w / 2, scy = sv.y + sv.h / 2;
                    const pcx = player.x + player.size / 2, pcy = player.y + player.size / 2;
                    const dist = Math.hypot(scx - pcx, scy - pcy);
                    if (dist < 105) nearId = sv.id;
                });
                for (let i = 0; i < 3; i++) {
                    if (hackedRef.current[i]) continue;
                    if (i === nearId) {
                        hackRef.current[i] = Math.min(180, hackRef.current[i] + 1);
                        hackPctUiRef.current = hackRef.current[i] / 180;
                        if (hackRef.current[i] >= 180) {
                            hackedRef.current[i] = true;
                            const count = hackedRef.current.filter(Boolean).length;
                            hackUiRef.current = count; setServersHacked(count);
                            setLastActionText(`💻 Server ${i + 1} berhasil diretas! File Bukti Korupsi Induk terunduh. (${count}/3)`);
                            if (count >= 3) {
                                setGameState('PHASE2');
                                setLastActionText('💥 Seluruh database terbongkar! "Kekebalan Politik" Sang Dalang HANCUR! Luncurkan Siaran Langsung Nasional — kuras HP 500-nya!');
                            }
                        }
                    } else {
                        // progress berhenti (tidak hilang) saat meninggalkan server
                        hackPctUiRef.current = Math.max(...hackRef.current) / 180;
                    }
                }
                setHackPct(Math.round(hackPctUiRef.current * 100));
            } else if (phase2) {
                setHackPct(0);
            }

            // ==========================================================
            // BODYGUARD (2) - mengejar, tidak bisa diserang
            // ==========================================================
            if (inPlay) {
                const bcxT = player.x + player.size / 2, bcyT = player.y + player.size / 2;
                [g1, g2].forEach((g, idx) => {
                    const dx = bcxT - (g.x + g.size / 2);
                    const dy = bcyT - (g.y + g.size / 2);
                    if (Math.abs(dx) > Math.abs(dy)) g.facingDirection = dx > 0 ? 'right' : 'left';
                    else g.facingDirection = dy > 0 ? 'down' : 'up';
                    g.isWalking = stepToward(g, bcxT, bcyT, g.speed);
                    g.frameTimer++;
                    if (g.frameTimer >= 8) { g.frameIndex = (g.frameIndex + 1) % 3; g.frameTimer = 0; }

                    if (g.hitCd > 0) g.hitCd -= 1;
                    if (rectIntersect(pbBox, { x: g.x, y: g.y, width: g.size, height: g.size })) {
                        if (g.hitCd <= 0 && player.hurtCd <= 0) {
                            g.hitCd = 50;
                            player.hurtCd = 40;
                            player.health -= 12;
                            setPlayerHpPct(Math.max(0, (player.health / player.maxHealth) * 100));
                            setLastActionText('🕴️ Bodyguard bayaran menghantam Arya! Menjauh dari jangkauannya!');
                            if (player.health <= 0) {
                                setGameState('GAMEOVER');
                                setLastActionText('Arya tumbang di tangan bodyguard bayaran. Data aliran dana gelap selamanya tersembunyi.');
                            }
                        }
                    }
                });
            } else {
                g1.isWalking = false; g2.isWalking = false;
            }

            // ==========================================================
            // SANG DALANG
            // ==========================================================
            if (phase1) {
                // Kekebalan Politik: hanya mondar-mandir santai, tidak bisa dilukai
                boss.isWalking = false;
            } else if (phase2 && boss.health > 0) {
                const bcxT = player.x + player.size / 2, bcyT = player.y + player.size / 2;
                const dx = bcxT - (boss.x + boss.size / 2);
                const dy = bcyT - (boss.y + boss.size / 2);
                if (Math.abs(dx) > Math.abs(dy)) boss.facingDirection = dx > 0 ? 'right' : 'left';
                else boss.facingDirection = dy > 0 ? 'down' : 'up';
                boss.isWalking = stepToward(boss, bcxT, bcyT, boss.speed);
                boss.frameTimer++;
                if (boss.frameTimer >= 8) { boss.frameIndex = (boss.frameIndex + 1) % 3; boss.frameTimer = 0; }

                // tembak proyektil "Suap Miliaran Rupiah"
                boss.shootTimer -= 1;
                if (boss.shootTimer <= 0) {
                    boss.shootTimer = 80;
                    const bxc = boss.x + boss.size / 2, byc = boss.y + boss.size / 2;
                    const ang = Math.atan2(bcyT - byc, bcxT - bxc);
                    const spd = 6;
                    projectilesRef.current.push({
                        x: bxc, y: byc,
                        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
                        size: 28, life: 200,
                    });
                }

                if (boss.hitCd > 0) boss.hitCd -= 1;
                if (rectIntersect(pbBox, { x: boss.x, y: boss.y, width: boss.size, height: boss.size })) {
                    if (boss.hitCd <= 0 && player.hurtCd <= 0) {
                        boss.hitCd = 45;
                        player.hurtCd = 40;
                        player.health -= 14;
                        setPlayerHpPct(Math.max(0, (player.health / player.maxHealth) * 100));
                        setLastActionText('💰 Sang Dalang menekan Arya dengan kekuasaannya! Beri jarak & serang balik!');
                        if (player.health <= 0) {
                            setGameState('GAMEOVER');
                            setLastActionText('Arya kalah di ruang pribadi Sang Dalang. Oligarki kembali berkuasa tanpa jejak.');
                        }
                    }
                }
            }

            // ==========================================================
            // UPDATE PROYEKTIL ("Suap Miliaran Rupiah")
            // ==========================================================
            if (phase2) {
                const remaining = [];
                for (const pr of projectilesRef.current) {
                    pr.x += pr.vx; pr.y += pr.vy; pr.life -= 1;
                    let alive = pr.life > 0 && pr.x > area.x - 40 && pr.x < area.x + area.w + 40 && pr.y > area.y - 40 && pr.y < area.y + area.h + 40;
                    const prRect = { x: pr.x - pr.size / 2, y: pr.y - pr.size / 2, width: pr.size, height: pr.size };
                    if (alive && rectIntersect(pbBox, prRect)) {
                        alive = false;
                        if (player.hurtCd <= 0) {
                            player.hurtCd = 30;
                            player.health -= 9;
                            setPlayerHpPct(Math.max(0, (player.health / player.maxHealth) * 100));
                            setLastActionText('💰 Terkena "Suap Miliaran Rupiah"! Arya kehilangan HP!');
                            if (player.health <= 0) {
                                setGameState('GAMEOVER');
                                setLastActionText('Arya dibeli oleh suap miliaran rupiah. Perlawanan rakyat padam di lantai puncak.');
                            }
                        }
                    }
                    if (alive) remaining.push(pr);
                }
                projectilesRef.current = remaining;
            } else {
                projectilesRef.current = [];
            }

            // ==========================================================
            // SERANGAN SINAR LIVE STREAMING (hanya Fase 2)
            // ==========================================================
            if (phase2) {
                if (player.attackTimer > 0) { player.attackTimer--; if (player.attackTimer <= 0) player.isAttacking = false; }

                const beam = getLiveBeamRect(player);
                const doAttack = () => {
                    if (!player.isAttacking && !player.attackCooldown) {
                        player.isAttacking = true; player.attackTimer = 18; player.attackCooldown = true;
                        if (rectIntersect(beam, { x: boss.x, y: boss.y, width: boss.size, height: boss.size })) {
                            boss.health -= 40; // 500 HP -> 13 tembakan
                            setBossHpPct(Math.max(0, (boss.health / boss.maxHealth) * 100));
                            setLastActionText(`📡 SIARAN LANGSUNG NASIONAL! Aliran dana gelap terekspos! (-40 HP) → ${Math.max(0, boss.health)}/500`);
                            if (boss.health <= 0) {
                                setGameState('EPILOGUE');
                                setDialogIndex(0);
                                setLastActionText('🚨 Sirene aparat pusat (KPK) meraung! Sang Dalang akhirnya tertangkap di depan kamera seluruh Indonesia!');
                            }
                        } else {
                            setLastActionText('📡 Arya menyiarkan langsung... (arahkan sinar HP tepat ke Sang Dalang!)');
                        }
                        setTimeout(() => { player.attackCooldown = false; }, 260);
                    }
                };
                if (keys['f'] || keys[' ']) doAttack();
            } else if (phase1) {
                if (keys['f'] || keys[' ']) {
                    setLastActionText('🛡️ Sang Dalang masih memiliki "Kekebalan Politik". Retas 3 server dulu!');
                }
            }

            // ==========================================================
            // RENDER ENTITAS
            // ==========================================================
            if (inPlay || gameState === 'EPILOGUE') {
                renderSpriteSheet(ctx, csImgRef.current, cs, 'Whistleblower');
                if (gameState !== 'EPILOGUE' || boss.health > 0) {
                    // bodyguard
                    renderSpriteSheet(ctx, guardImgRef.current, g1, 'Bodyguard');
                    renderSpriteSheet(ctx, guardImgRef.current, g2, 'Bodyguard');
                }
                renderSpriteSheet(ctx, pejabatImgRef.current, boss, 'Sang Dalang');
                renderSpriteSheet(ctx, aryaImgRef.current, player, 'Arya');
            }

            // label kekebalan politik / live streaming
            if (phase1) {
                const pcx = boss.x + boss.size / 2, pcy = boss.y - 34;
                const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
                ctx.strokeStyle = `rgba(234,179,8,${0.5 + pulse * 0.5})`; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(pcx, boss.y + boss.size / 2, boss.size * 0.95, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = '#facc15'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
                ctx.fillText('🛡 KEKEBALAN POLITIK', pcx, pcy);
                ctx.textAlign = 'left';
            }

            // proyektil suap
            projectilesRef.current.forEach((pr) => {
                ctx.fillStyle = '#15803d';
                ctx.fillRect(pr.x - pr.size / 2, pr.y - pr.size / 2, pr.size, pr.size);
                ctx.strokeStyle = '#bbf7d0'; ctx.lineWidth = 2;
                ctx.strokeRect(pr.x - pr.size / 2, pr.y - pr.size / 2, pr.size, pr.size);
                ctx.fillStyle = '#fff'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
                ctx.fillText('SUAP', pr.x, pr.y - 2);
                ctx.fillText('MILIARAN', pr.x, pr.y + 7);
                ctx.textAlign = 'left';
            });

            // sinar live streaming
            if (player.isAttacking) {
                const beam = getLiveBeamRect(player);
                const grad = ctx.createLinearGradient(beam.x, beam.y, beam.x + beam.width, beam.y + beam.height);
                grad.addColorStop(0, 'rgba(239,68,68,0.65)');
                grad.addColorStop(1, 'rgba(250,204,21,0.35)');
                ctx.fillStyle = grad;
                ctx.fillRect(beam.x, beam.y, beam.width, beam.height);
                ctx.strokeStyle = '#fca5a5'; ctx.lineWidth = 2; ctx.strokeRect(beam.x, beam.y, beam.width, beam.height);
                // ikon rekaman berkedip
                ctx.fillStyle = Math.floor(Date.now() / 200) % 2 === 0 ? '#ef4444' : '#7f1d1d';
                ctx.beginPath(); ctx.arc(player.x + player.size / 2, player.y - 22, 6, 0, Math.PI * 2); ctx.fill();
            }

            // panduan arah ke server terdekat (Fase 1)
            if (phase1) {
                const pcx = player.x + player.size / 2, pcy = player.y + player.size / 2;
                let target = null, best = Infinity;
                servers.forEach((sv) => {
                    if (hackedRef.current[sv.id]) return;
                    const d = Math.hypot((sv.x + sv.w / 2) - pcx, (sv.y + sv.h / 2) - pcy);
                    if (d < best) { best = d; target = sv; }
                });
                if (target) {
                    const tx = target.x + target.w / 2, ty = target.y + target.h / 2;
                    const a = Math.atan2(ty - pcy, tx - pcx);
                    ctx.save();
                    ctx.translate(pcx, pcy - player.size * 0.95);
                    ctx.rotate(a);
                    ctx.fillStyle = '#facc15';
                    ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-8, -8); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill();
                    ctx.restore();
                }
            }

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        gameLoop();

        return () => { window.removeEventListener('resize', resizeCanvas); cancelAnimationFrame(animationFrameId); };
    }, [gameState]);

    const restartGame = () => {
        initedRef.current = false;
        projectilesRef.current = [];
        hackRef.current = [0, 0, 0];
        hackedRef.current = [false, false, false];
        hackUiRef.current = 0; hackPctUiRef.current = 0;
        playerRef.current = { ...playerRef.current, health: 100, speed: 5.0, isWalking: false, facingDirection: 'down', frameIndex: 1, hurtCd: 0 };
        bossRef.current = { ...bossRef.current, health: 500, isWalking: false, facingDirection: 'down', frameIndex: 1, hitCd: 0, shootTimer: 60 };
        guard1Ref.current = { ...guard1Ref.current, facingDirection: 'down', frameIndex: 1, hitCd: 0 };
        guard2Ref.current = { ...guard2Ref.current, facingDirection: 'down', frameIndex: 1, hitCd: 0 };
        setPlayerMoney(120000);
        setPlayerHpPct(100);
        setBossHpPct(100);
        setServersHacked(0);
        setHackPct(0);
        setDialogIndex(0);
        setLastActionText('');
        setGameState('STORY_INTRO');
    };

    const getLiveBeamRect = (p) => {
        const reach = 190, width = 38;
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
            ctx.fillStyle = label === 'Arya' ? '#22c55e' : label === 'Sang Dalang' ? '#ef4444' : label === 'Bodyguard' ? '#111827' : '#f59e0b';
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
    const isEpilogue = gameState === 'EPILOGUE';

    return (
        <div className="relative w-screen h-screen bg-neutral-950 text-white font-mono select-none overflow-hidden">
            {/* HUD HEADER */}
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between bg-neutral-900/90 border border-neutral-700 px-5 py-3 rounded-xl shadow-xl backdrop-blur">
                <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-red-500/25 border border-red-500 text-red-300 text-xs font-bold rounded-md">LEVEL 10 · FINAL</span>
                    <h1 className="text-sm font-bold tracking-wide text-white">SURVIVAL WNI : Tuan Tanah & Sang Dalang</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-neutral-600 rounded-lg">
                        <span className="text-[10px] text-red-400 font-bold">HP ARYA</span>
                        <div className="w-16 h-2 bg-neutral-700 rounded overflow-hidden">
                            <div className="h-full bg-red-500 transition-all" style={{ width: `${playerHpPct}%` }} />
                        </div>
                    </div>
                    {gameState === 'PHASE1' && (
                        <div className="px-3 py-1 text-xs font-bold rounded-lg border bg-neutral-800 border-cyan-600 text-cyan-300">
                            💻 Server {serversHacked}/3 · {hackPct}%
                        </div>
                    )}
                    {gameState === 'PHASE2' && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-red-700 rounded-lg">
                            <span className="text-[10px] text-yellow-400 font-bold">SANG DALANG</span>
                            <div className="w-24 h-2 bg-neutral-700 rounded overflow-hidden">
                                <div className="h-full bg-yellow-500 transition-all" style={{ width: `${bossHpPct}%` }} />
                            </div>
                        </div>
                    )}
                    {(gameState === 'PHASE1' || gameState === 'PHASE2') && (
                        <div className="px-3 py-1 text-xs font-bold rounded-lg border bg-red-950 border-red-700 text-red-300 animate-pulse">
                            🔴 LIVE
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
            {(gameState === 'STORY_INTRO' || gameState === 'JUKIR_DIALOG' || gameState === 'EPILOGUE') && (
                <div className={`absolute bottom-8 left-8 right-8 bg-neutral-900/95 border-2 p-6 rounded-2xl shadow-2xl backdrop-blur z-20 max-w-4xl mx-auto ${isEpilogue ? 'border-emerald-500' : gameState === 'JUKIR_DIALOG' ? 'border-red-500' : 'border-cyan-500'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <span className={`font-bold text-sm px-3 py-1 rounded ${activeDialogs[dialogIndex]?.speaker === 'Arya' ? 'bg-green-600 text-white' : (activeDialogs[dialogIndex]?.speaker === 'Sang Dalang' ? 'bg-red-600 text-white' : activeDialogs[dialogIndex]?.speaker === 'Kakek' ? 'bg-amber-600 text-white' : 'bg-cyan-600 text-white')}`}>
                            {activeDialogs[dialogIndex]?.speaker}
                        </span>
                        <span className="text-xs text-neutral-400 font-mono">{dialogIndex + 1} / {activeDialogs.length}</span>
                    </div>
                    <p className="text-sm text-neutral-100 italic leading-relaxed my-3 min-h-[48px]">"{activeDialogs[dialogIndex]?.text}"</p>
                    <button onClick={handleNextDialog} className={`w-full py-3 ${isEpilogue ? 'bg-emerald-500 hover:bg-emerald-400 border-emerald-700' : 'bg-red-500 hover:bg-red-400 border-red-700'} text-white font-bold text-xs rounded-xl border-b-4 cursor-pointer tracking-widest`}>
                        LANJUT ➔
                    </button>
                </div>
            )}

            {/* MISSION OVERLAY */}
            {gameState === 'MISSION_OVERLAY' && (
                <div onClick={() => setGameState('JUKIR_DIALOG')} className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 cursor-pointer text-center select-none backdrop-blur-md">
                    <div className="max-w-md bg-neutral-900 border border-neutral-700 p-8 rounded-2xl shadow-2xl space-y-5 hover:border-red-500/50 transition-colors">
                        <div className="w-16 h-16 bg-red-500/20 text-red-300 border border-red-500/40 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">🏙️</div>
                        <h2 className="text-xl font-bold text-red-300 tracking-wider">MISI FINAL LEVEL 10</h2>
                        <div className="text-left text-sm text-neutral-200 leading-relaxed space-y-2">
                            <p><span className="text-cyan-300 font-bold">FASE 1 — Retas Server:</span> Hindari 2 Bodyguard & berdiri di dekat 3 server selama 3 detik per server. Sang Dalang masih <span className="text-yellow-300 font-bold">kekal</span>.</p>
                            <p><span className="text-red-300 font-bold">FASE 2 — Bongkar Kekebalan:</span> Kekebalan hancur! Hindari proyektil <span className="text-green-400 font-bold">"Suap Miliaran Rupiah"</span> & tembak Sinar Live Streaming (HP 500).</p>
                        </div>
                        <div className="pt-4 border-t border-neutral-800"><p className="text-xs text-red-300 animate-pulse font-mono font-semibold">[ Klik di mana saja untuk memulai pertarungan akhir ]</p></div>
                    </div>
                </div>
            )}

            {/* HINT */}
            {(gameState === 'PHASE1' || gameState === 'PHASE2') && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 p-3 w-full max-w-3xl bg-neutral-900/90 border border-neutral-700 rounded-xl text-center text-xs text-red-300 tracking-wider shadow-2xl backdrop-blur z-20 pointer-events-none">
                    {lastActionText || (gameState === 'PHASE1'
                        ? "💻 Dekati 3 server (tahan 3 detik) & hindari bodyguard. Server terkunci: retas dulu!"
                        : "📡 Tekan F / SPASI untuk Siaran Langsung & kuras HP Sang Dalang! Hindari proyektil suap!")}
                </div>
            )}

            {/* VICTORY (cutscene akhir) */}
            {gameState === 'VICTORY' && (
                <div className="absolute inset-0 bg-black/97 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-yellow-400 to-red-600 animate-pulse" />
                    <div className="text-5xl mb-4">🇮🇩</div>
                    <h2 className="text-3xl font-bold text-yellow-400 mb-3 tracking-wider">TAMAT — SURVIVAL WNI</h2>
                    <p className="text-sm text-neutral-200 max-w-xl mb-2 leading-relaxed">
                        Database aliran dana gelap tersiar ke seluruh Indonesia. Sang Dalang dan seluruh jaringannya dari Level 1 hingga 10 resmi ditangkap aparat pusat.
                    </p>
                    <p className="text-sm text-emerald-300 max-w-xl mb-6 leading-relaxed">
                        {lastActionText || "Arya kembali ke rumah Kakek dengan kepala tegak. Kejujuran akhirnya menang."}
                    </p>
                    <div className="flex gap-4">
                        <button onClick={restartGame} className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-xl border border-neutral-600 cursor-pointer">Main Lagi dari Awal Level</button>
                        <button onClick={() => router.push('/menu')} className="px-8 py-3.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800 shadow-xl cursor-pointer">Kembali ke Menu Utama →</button>
                    </div>
                </div>
            )}

            {/* GAME OVER */}
            {gameState === 'GAMEOVER' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-3xl font-bold text-red-500 mb-3">SANG DALANG MENANG...</h2>
                    <p className="text-sm text-neutral-200 max-w-md mb-6 leading-relaxed">{lastActionText}</p>
                    <div className="flex gap-4">
                        <button onClick={restartGame} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800 cursor-pointer">Coba Lagi Level 10</button>
                        <button onClick={() => router.push('/menu')} className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl border border-neutral-600 cursor-pointer">Kembali ke Menu</button>
                    </div>
                </div>
            )}
        </div>
    );
}