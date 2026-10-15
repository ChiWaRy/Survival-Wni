// src/app/level9/page.js
// LEVEL 9 : KRIMINALISASI & PASAL KARET
// Ruang Pemeriksaan & Lorong Kantor Hukum: lantai marmer gelap, meja interogasi besi
// di tengah, rak-rak arsip hukum tinggi, simbol timbangan keadilan di dinding belakang.
// Karakter & gaya sama seperti Level 8.
//
// MEKANIK KHUSUS - DEBAT & TANGKIS PROYEKTIL + PERISAI HUKUM:
//  - Oknum Kuasa Hukum mengejar Arya DAN menembakkan proyektil "TUNTUTAN PALSU".
//  - Pengacara LBH di sudut ruangan memunculkan item "Pasal Pembelaan Kepentingan Umum".
//  - Mengambil item -> Perisai Kebal 5 detik + Damage rekaman 2x (50).
//  - HP Bos 300. Rekaman normal 25, saat perisai aktif 50.
//
// ALUR: STORY_INTRO -> MISSION_OVERLAY -> IBU_DIALOG (Pengacara LBH)
//       -> JUKIR_DIALOG (Oknum Kuasa Hukum) -> FIGHT -> VICTORY/GAMEOVER
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Level9Page() {
    const router = useRouter();
    const canvasRef = useRef(null);

    const [gameState, setGameState] = useState('STORY_INTRO');
    const [dialogIndex, setDialogIndex] = useState(0);
    const [playerMoney, setPlayerMoney] = useState(120000);
    const [lastActionText, setLastActionText] = useState('');
    const [playerHpPct, setPlayerHpPct] = useState(100);
    const [bossHpPct, setBossHpPct] = useState(100);
    const [shieldActive, setShieldActive] = useState(false);

    // ==================================================
    // NASKAH DIALOG LENGKAP (DARI SPEC)
    // ==================================================
    // A. Dialog Intro Level 9 (Lorong Gedung - Arya)
    const introDialogs = [
        { speaker: "Arya", text: "Aku tidak menyangka... Niatku hanya membela hak Kakek dan warga kecil dari pungli dan penipuan, tapi hari ini aku malah dipanggil atas tuduhan mencemarkan nama baik para koruptor itu." },
        { speaker: "Arya", text: "Untung ada tim pengacara bantuan hukum masyarakat yang bersedia mendampingiku di dalam." },
    ];

    // B. Dialog Informan (Ruang Tunggu - Arya & Pengacara LBH)
    const ibuDialogs = [
        { speaker: "Pengacara LBH", text: "Tetap tenang, Arya. Saya sudah mempelajari berkas laporan mereka. Ini murni upaya kriminalisasi (SLAPP) untuk membungkam saksi dan pelapor seperti kamu." },
        { speaker: "Arya", text: "Mereka menuntut saya ganti rugi ratusan juta atau masuk penjara kalau saya tidak menghapus semua video bukti pungli itu, Pak." },
        { speaker: "Pengacara LBH", text: "Jangan pernah tanda tangani surat damai yang menyuruhmu mengaku bersalah! Secara hukum, merekam tindak pidana pemerasan dan korupsi demi kepentingan publik itu dilindungi undang-undang." },
        { speaker: "Arya", text: "Lalu apa yang harus saya lakukan saat berhadapan dengan oknum kuasa hukum mereka di dalam?" },
        { speaker: "Pengacara LBH", text: "Dia akan menekan mentalmu dengan tuduhan pasal karet yang dipelintir. Hindari intimidasinya, ambil berkas 'Bukti Pembelaan Hukum' yang saya siapkan di meja sudut ruangan, dan rekam upaya pengancaman yang dia lakukan!" },
    ];

    // C. Dialog Konfrontasi Bos (Ruang Interogasi - Arya & Oknum Kuasa Hukum)
    const bossDialogs = [
        { speaker: "Oknum Kuasa Hukum", text: "Duduk, Arya! Perkenalkan, saya kuasa hukum dari klien-klien terhormat yang sudah kamu hancurkan karirnya lewat video-video amatirmu itu!" },
        { speaker: "Arya", text: "Klien terhormat?! Maksud Bapak para pelaku pungli kelurahan, pemeras loker pabrik, dan pencuri beras bansos itu?!" },
        { speaker: "Oknum Kuasa Hukum", text: "Jaga ucapanmu! Di mata hukum, sebelum ada putusan pengadilan, video tanpa izin yang kamu sebar itu adalah pencemaran nama baik dan pembunuhan karakter! Ancaman hukumannya penjara empat tahun!" },
        { speaker: "Arya", text: "Hukum macam apa yang melindungi pencuri dan malah memenjarakan orang yang berteriak saat dicuri?!" },
        { speaker: "Oknum Kuasa Hukum", text: "Hukum itu milik mereka yang mampu membayar pasal, anak muda! Sekarang pilih: tanda tangani surat pengakuan bahwa semua videomu itu rekayasa hoax, atau saya pastikan kamu membusuk di sel malam ini juga!" },
        { speaker: "Arya", text: "Kebenaran tidak akan pernah tunduk pada intimidasi pasal karet! Saya tidak akan menghapus satu detik pun dari video perjuangan rakyat itu!" },
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
            else if (gameState === 'JUKIR_DIALOG') setGameState('FIGHT');
        }
    };

    // ==================================================
    // REF ASSET & ENTITAS
    // ==================================================
    const aryaImgRef = useRef(null);
    const csImgRef = useRef(null);      // Pengacara LBH
    const pejabatImgRef = useRef(null); // Oknum Kuasa Hukum (bos)
    const extTilesetRef = useRef(null);

    // Arya (Player): HP 100, Speed 4.5
    const playerRef = useRef({
        x: 0, y: 0, size: 66, colSize: 42, speed: 4.5, baseSpeed: 4.5, health: 100, maxHealth: 100,
        facingDirection: 'down', isWalking: false, frameIndex: 1, frameTimer: 0,
        isAttacking: false, attackTimer: 0, attackCooldown: false, hurtCd: 0,
    });

    // Pengacara LBH (NPC Informan)
    const csRef = useRef({ x: 0, y: 0, size: 66, colSize: 42, facingDirection: 'down', frameIndex: 1, frameTimer: 0 });

    // Oknum Pengacara Korup / Penyidik Nakal (Bos): HP 300, Speed 3.0
    const bossRef = useRef({
        x: 0, y: 0, size: 66, colSize: 42, speed: 3.0, health: 300, maxHealth: 300,
        facingDirection: 'down', isWalking: false, frameIndex: 1, frameTimer: 0, hitCd: 0, shootTimer: 0,
    });

    const keysRef = useRef({});
    const initedRef = useRef(false);
    const projectilesRef = useRef([]);
    const shieldRef = useRef({ active: false, timer: 0 });       // 5 detik = 300 frame
    const shieldUiRef = useRef(false);
    const shieldItemRef = useRef({ x: 0, y: 0, w: 40, h: 40, present: true, respawn: 0 });

    useEffect(() => {
        const handleKeyDown = (e) => { keysRef.current[e.key.toLowerCase()] = true; };
        const handleKeyUp = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Load karakter (hapus background putih) - gaya sama Level 8
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
        loadCharImage('/assets/pak_rt.jpg', csImgRef);            // Pengacara LBH
        loadCharImage('/assets/petugas_pungli.jpg', pejabatImgRef); // Oknum Kuasa Hukum (bos)

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
            const keys = keysRef.current;

            // ---------- Area ruang pemeriksaan & lorong ----------
            const padTop = 96, padX = 40, padBottom = 40;
            const area = { x: padX, y: padTop, w: W - padX * 2, h: H - padTop - padBottom };

            // ---------- Meja interogasi besi (tengah) ----------
            const table = { x: area.x + area.w * 0.5 - 95, y: area.y + area.h * 0.44, w: 190, h: 82 };

            // ---------- Rak-rak arsip hukum tinggi ----------
            const shelves = [
                { x: area.x + 6, y: area.y + area.h * 0.12, w: 48, h: area.h * 0.42 },
                { x: area.x + 6, y: area.y + area.h * 0.62, w: 48, h: area.h * 0.30 },
                { x: area.x + area.w - 54, y: area.y + area.h * 0.12, w: 48, h: area.h * 0.42 },
                { x: area.x + area.w - 54, y: area.y + area.h * 0.62, w: 48, h: area.h * 0.30 },
                { x: area.x + area.w * 0.30, y: area.y + area.h * 0.80, w: area.w * 0.16, h: 40 },
            ];

            // ---------- Meja sudut (tempat item perisai) ----------
            const cornerTable = { x: area.x + area.w * 0.06, y: area.y + area.h * 0.78, w: 90, h: 46 };

            const solids = [table, ...shelves, cornerTable];

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

            const canStand = (bx, by, colSize) => {
                if (!inArea(bx, by, colSize)) return false;
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
                player.x = area.x + area.w * 0.5; player.y = area.y + area.h * 0.86; player.health = 100;
                cs.x = area.x + area.w * 0.80; cs.y = area.y + area.h * 0.88;
                boss.x = area.x + area.w * 0.5 - boss.size / 2; boss.y = area.y + area.h * 0.05;
                boss.health = 300; boss.hitCd = 0; boss.shootTimer = 60;
                projectilesRef.current = [];
                shieldRef.current = { active: false, timer: 0 };
                shieldItemRef.current = { x: cornerTable.x + 25, y: cornerTable.y - 46, w: 40, h: 40, present: true, respawn: 0 };
                initedRef.current = true;
            }

            // ==========================================================
            // RENDER RUANG PEMERIKSAAN
            // ==========================================================
            ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, W, H);
            // lantai marmer gelap
            ctx.fillStyle = '#1b2436'; ctx.fillRect(area.x, area.y, area.w, area.h);
            // urat marmer
            ctx.strokeStyle = 'rgba(148,163,184,0.16)'; ctx.lineWidth = 1;
            for (let i = 0; i < 22; i++) {
                const sx = area.x + ((i * 137) % area.w);
                ctx.beginPath();
                ctx.moveTo(sx, area.y);
                ctx.bezierCurveTo(sx + 40, area.y + area.h * 0.3, sx - 40, area.y + area.h * 0.6, sx + 20, area.y + area.h);
                ctx.stroke();
            }
            ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 4; ctx.strokeRect(area.x, area.y, area.w, area.h);

            // dinding belakang + simbol timbangan keadilan
            const wallH = 44;
            ctx.fillStyle = '#111827'; ctx.fillRect(area.x, area.y, area.w, wallH);
            const sx0 = area.x + area.w * 0.5;
            const sy0 = area.y + 22;
            ctx.strokeStyle = '#eab308'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(sx0, sy0 - 14); ctx.lineTo(sx0, sy0 + 10); ctx.stroke();          // tiang
            ctx.beginPath(); ctx.moveTo(sx0 - 28, sy0 - 10); ctx.lineTo(sx0 + 28, sy0 - 10); ctx.stroke(); // palang
            ctx.beginPath(); ctx.moveTo(sx0 - 28, sy0 - 10); ctx.lineTo(sx0 - 28, sy0 + 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx0 + 28, sy0 - 10); ctx.lineTo(sx0 + 28, sy0 + 2); ctx.stroke();
            // piringan
            ctx.beginPath(); ctx.arc(sx0 - 28, sy0 + 6, 8, 0, Math.PI); ctx.stroke();
            ctx.beginPath(); ctx.arc(sx0 + 28, sy0 + 6, 8, 0, Math.PI); ctx.stroke();
            // dasar tiang
            ctx.beginPath(); ctx.moveTo(sx0 - 10, sy0 + 12); ctx.lineTo(sx0 + 10, sy0 + 12); ctx.stroke();
            ctx.fillStyle = '#eab308'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
            ctx.fillText('KEADILAN', sx0, sy0 + 30);
            ctx.textAlign = 'left';

            // rak arsip hukum
            shelves.forEach((s) => {
                ctx.fillStyle = '#3f2d1c'; ctx.fillRect(s.x, s.y, s.w, s.h);
                ctx.fillStyle = '#5b4128'; ctx.fillRect(s.x + 3, s.y + 3, s.w - 6, s.h - 6);
                for (let yy = s.y + 10; yy < s.y + s.h - 8; yy += 16) {
                    ctx.fillStyle = '#78350f'; ctx.fillRect(s.x + 6, yy, s.w - 12, 8);
                    ctx.fillStyle = '#fbbf24';
                    ctx.fillRect(s.x + 8, yy + 1, 3, 6);
                    ctx.fillRect(s.x + s.w - 14, yy + 1, 3, 6);
                }
            });

            // meja interogasi besi
            ctx.fillStyle = '#111827'; ctx.fillRect(table.x, table.y, table.w, table.h);
            ctx.fillStyle = '#374151'; ctx.fillRect(table.x + 5, table.y + 5, table.w - 10, table.h - 10);
            ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.strokeRect(table.x, table.y, table.w, table.h);
            ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
            ctx.fillText('MEJA INTEROGASI', table.x + table.w / 2, table.y + table.h / 2 + 4);
            ctx.textAlign = 'left';
            // lampu meja
            ctx.fillStyle = '#facc15';
            ctx.beginPath(); ctx.arc(table.x + table.w - 20, table.y + 16, 6, 0, Math.PI * 2); ctx.fill();

            // meja sudut
            ctx.fillStyle = '#1e293b'; ctx.fillRect(cornerTable.x, cornerTable.y, cornerTable.w, cornerTable.h);
            ctx.fillStyle = '#334155'; ctx.fillRect(cornerTable.x + 4, cornerTable.y + 4, cornerTable.w - 8, cornerTable.h - 8);

            // layar monitor arsip di lantai dekoratif
            ctx.fillStyle = 'rgba(59,130,246,0.08)';
            ctx.fillRect(area.x + area.w * 0.62, area.y + area.h * 0.16, 130, 70);
            ctx.strokeStyle = 'rgba(96,165,250,0.5)'; ctx.lineWidth = 1;
            ctx.strokeRect(area.x + area.w * 0.62, area.y + area.h * 0.16, 130, 70);
            ctx.fillStyle = 'rgba(147,197,253,0.8)'; ctx.font = 'bold 9px monospace';
            ctx.fillText('ARSIP', area.x + area.w * 0.62 + 8, area.y + area.h * 0.16 + 20);
            ctx.fillText('PASAL', area.x + area.w * 0.62 + 8, area.y + area.h * 0.16 + 34);
            ctx.fillText('KARET', area.x + area.w * 0.62 + 8, area.y + area.h * 0.16 + 48);

            // ==========================================================
            // STATUS
            // ==========================================================
            const canControl = gameState === 'FIGHT';
            const pbBox = boxOf(player);
            if (player.hurtCd > 0) player.hurtCd -= 1;

            // perisai timer
            if (shieldRef.current.active) {
                shieldRef.current.timer -= 1;
                if (shieldRef.current.timer <= 0) {
                    shieldRef.current.active = false;
                }
            }
            if (canControl) {
                const ui = shieldRef.current.active;
                if (ui !== shieldUiRef.current) { shieldUiRef.current = ui; setShieldActive(ui); }
            }

            // ==========================================================
            // PEMAIN
            // ==========================================================
            player.isWalking = false;
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
            // AMBIL ITEM PERISAI HUKUM
            // ==========================================================
            const item = shieldItemRef.current;
            if (canControl) {
                if (!item.present) {
                    item.respawn -= 1;
                    if (item.respawn <= 0) item.present = true;
                } else {
                    if (rectIntersect(pbBox, { x: item.x, y: item.y, width: item.w, height: item.h })) {
                        item.present = false;
                        item.respawn = 420; // 7 detik sebelum muncul lagi
                        shieldRef.current.active = true;
                        shieldRef.current.timer = 300; // 5 detik kebal
                        setLastActionText('⚖️ Berkas "Pasal Pembelaan Kepentingan Umum" diambil! Perisai kebal 5 detik + damage rekaman 2x!');
                    }
                }
            }

            // ==========================================================
            // AI OKNUM KUASA HUKUM (mengejar + menembak proyektil)
            // ==========================================================
            if (canControl && boss.health > 0) {
                const bcx = player.x + player.size / 2, bcy = player.y + player.size / 2;
                const dx = bcx - (boss.x + boss.size / 2);
                const dy = bcy - (boss.y + boss.size / 2);
                if (Math.abs(dx) > Math.abs(dy)) boss.facingDirection = dx > 0 ? 'right' : 'left';
                else boss.facingDirection = dy > 0 ? 'down' : 'up';
                boss.isWalking = stepToward(boss, bcx, bcy, boss.speed);
                boss.frameTimer++;
                if (boss.frameTimer >= 8) { boss.frameIndex = (boss.frameIndex + 1) % 3; boss.frameTimer = 0; }

                // tembak proyektil "TUNTUTAN PALSU"
                boss.shootTimer -= 1;
                if (boss.shootTimer <= 0) {
                    boss.shootTimer = 70; // setiap ~1.17 detik
                    const bxc = boss.x + boss.size / 2, byc = boss.y + boss.size / 2;
                    const ang = Math.atan2(bcy - byc, bcx - bxc);
                    const spd = 5.5;
                    projectilesRef.current.push({
                        x: bxc, y: byc,
                        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
                        size: 26, life: 180,
                    });
                }

                // kontak fisik -> HP turun
                if (boss.hitCd > 0) boss.hitCd -= 1;
                if (rectIntersect(pbBox, { x: boss.x, y: boss.y, width: boss.size, height: boss.size })) {
                    if (boss.hitCd <= 0 && !shieldRef.current.active) {
                        boss.hitCd = 40;
                        player.health -= 10;
                        setPlayerHpPct(Math.max(0, (player.health / player.maxHealth) * 100));
                        setLastActionText('📜 "Tanda tangan surat damai itu, atau kamu kubawa ke sel!" — Arya tertekan!');
                        if (player.health <= 0) {
                            setGameState('GAMEOVER');
                            setLastActionText('Arya terintimidasi dan menandatangani pengakuan palsu. Semua video bukti rakyat lenyap.');
                        }
                    }
                }
            } else {
                boss.isWalking = false;
            }

            // ==========================================================
            // UPDATE PROYEKTIL
            // ==========================================================
            if (canControl) {
                const remaining = [];
                for (const pr of projectilesRef.current) {
                    pr.x += pr.vx; pr.y += pr.vy; pr.life -= 1;
                    let alive = pr.life > 0 && pr.x > area.x - 40 && pr.x < area.x + area.w + 40 && pr.y > area.y - 40 && pr.y < area.y + area.h + 40;
                    const prRect = { x: pr.x - pr.size / 2, y: pr.y - pr.size / 2, width: pr.size, height: pr.size };
                    if (alive && rectIntersect(pbBox, prRect)) {
                        alive = false;
                        if (shieldRef.current.active) {
                            setLastActionText('🛡️ Proyektil "TUNTUTAN PALSU" ditangkis perisai hukum!');
                        } else if (player.hurtCd <= 0) {
                            player.hurtCd = 25;
                            player.health -= 8;
                            setPlayerHpPct(Math.max(0, (player.health / player.maxHealth) * 100));
                            setLastActionText('📜 Terkena "TUNTUTAN PALSU"! Arya kehilangan HP!');
                            if (player.health <= 0) {
                                setGameState('GAMEOVER');
                                setLastActionText('Arya tumbang oleh rentetan pasal karet. Keadilan kalah oleh kuasa hukum koruptor.');
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
            // SERANGAN REKAMAN HP
            // ==========================================================
            if (canControl) {
                if (player.attackTimer > 0) { player.attackTimer--; if (player.attackTimer <= 0) player.isAttacking = false; }

                const beam = getHpBeamRect(player);
                const doAttack = () => {
                    if (!player.isAttacking && !player.attackCooldown) {
                        player.isAttacking = true; player.attackTimer = 18; player.attackCooldown = true;
                        if (rectIntersect(beam, { x: boss.x, y: boss.y, width: boss.size, height: boss.size })) {
                            const dmg = shieldRef.current.active ? 50 : 25;
                            boss.health -= dmg;
                            setBossHpPct(Math.max(0, (boss.health / boss.maxHealth) * 100));
                            setLastActionText(shieldRef.current.active
                                ? `📱 Dengan "Pasal Pembelaan Kepentingan Umum", bukti rekaman 2x lipat! (-${dmg} HP)`
                                : `📱 Rekaman pengancaman kuasa hukum korup terekam! (-${dmg} HP)`);
                            if (boss.health <= 0) {
                                setGameState('VICTORY');
                                setLastActionText('Oknum kuasa hukum tersudut oleh bukti & fakta hukum! Upaya kriminalisasi (SLAPP) gagal total, dan Arya bebas tanpa menghapus satu video pun.');
                            }
                        } else {
                            setLastActionText('📱 Arya merekam... (arahkan tepat ke oknum kuasa hukum!)');
                        }
                        setTimeout(() => { player.attackCooldown = false; }, 280);
                    }
                };
                if (keys['f'] || keys[' ']) doAttack();
            }

            // ==========================================================
            // RENDER ENTITAS
            // ==========================================================
            renderSpriteSheet(ctx, csImgRef.current, cs, 'Pengacara LBH');
            if (boss.health > 0) renderSpriteSheet(ctx, pejabatImgRef.current, boss, 'Oknum Kuasa Hukum');
            renderSpriteSheet(ctx, aryaImgRef.current, player, 'Arya');

            // item perisai hukum
            if (item.present && canControl) {
                const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
                ctx.save();
                ctx.globalAlpha = 0.55 + pulse * 0.45;
                ctx.fillStyle = '#22d3ee';
                ctx.fillRect(item.x, item.y, item.w, item.h);
                ctx.strokeStyle = '#a5f3fc'; ctx.lineWidth = 2;
                ctx.strokeRect(item.x, item.y, item.w, item.h);
                ctx.restore();
                ctx.fillStyle = '#082f49'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
                ctx.fillText('⚖', item.x + item.w / 2, item.y + item.h / 2 + 5);
                ctx.textAlign = 'left';
                ctx.fillStyle = '#a5f3fc'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
                ctx.fillText('PASAL', item.x + item.w / 2, item.y - 14);
                ctx.fillText('PEMBELAAN', item.x + item.w / 2, item.y - 4);
                ctx.textAlign = 'left';
            }

            // proyektil "TUNTUTAN PALSU"
            projectilesRef.current.forEach((pr) => {
                ctx.fillStyle = '#b91c1c';
                ctx.fillRect(pr.x - pr.size / 2, pr.y - pr.size / 2, pr.size, pr.size);
                ctx.strokeStyle = '#fecaca'; ctx.lineWidth = 2;
                ctx.strokeRect(pr.x - pr.size / 2, pr.y - pr.size / 2, pr.size, pr.size);
                ctx.fillStyle = '#fff'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
                ctx.fillText('TUNTUTAN', pr.x, pr.y - 2);
                ctx.fillText('PALSU', pr.x, pr.y + 7);
                ctx.textAlign = 'left';
            });

            // perisai aktif -> lingkaran pelindung
            if (shieldRef.current.active) {
                const pcx = player.x + player.size / 2, pcy = player.y + player.size / 2;
                const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 120);
                ctx.strokeStyle = `rgba(34,211,238,${0.5 + pulse * 0.5})`; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc(pcx, pcy, player.size * 0.80, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = `rgba(34,211,238,${0.10 + pulse * 0.10})`;
                ctx.beginPath(); ctx.arc(pcx, pcy, player.size * 0.80, 0, Math.PI * 2); ctx.fill();
                // sisa waktu perisai
                ctx.fillStyle = '#a5f3fc'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
                ctx.fillText(`🛡 ${(shieldRef.current.timer / 60).toFixed(1)}s`, pcx, pcy - player.size * 0.95);
                ctx.textAlign = 'left';
            }

            // efek rekaman
            if (player.isAttacking) {
                const beam = getHpBeamRect(player);
                ctx.fillStyle = shieldRef.current.active ? 'rgba(34,211,238,0.5)' : 'rgba(59,130,246,0.45)';
                ctx.fillRect(beam.x, beam.y, beam.width, beam.height);
                ctx.strokeStyle = shieldRef.current.active ? '#67e8f9' : '#60a5fa'; ctx.lineWidth = 2;
                ctx.strokeRect(beam.x, beam.y, beam.width, beam.height);
            }

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        gameLoop();

        return () => { window.removeEventListener('resize', resizeCanvas); cancelAnimationFrame(animationFrameId); };
    }, [gameState]);

    const restartGame = () => {
        initedRef.current = false;
        shieldUiRef.current = false;
        projectilesRef.current = [];
        shieldRef.current = { active: false, timer: 0 };
        playerRef.current = { ...playerRef.current, health: 100, speed: 4.5, isWalking: false, facingDirection: 'down', frameIndex: 1, hurtCd: 0 };
        bossRef.current = { ...bossRef.current, health: 300, isWalking: false, facingDirection: 'down', frameIndex: 1, hitCd: 0, shootTimer: 60 };
        setPlayerMoney(120000);
        setPlayerHpPct(100);
        setBossHpPct(100);
        setShieldActive(false);
        setDialogIndex(0);
        setLastActionText('');
        setGameState('STORY_INTRO');
    };

    const handleSurrender = () => {
        setGameState('GAMEOVER');
        setLastActionText('Arya menyerah dan menandatangani surat damai palsu. Semua rekaman bukti korupsi resmi dihapus, dan para oknum kembali bebas.');
    };

    const getHpBeamRect = (p) => {
        const reach = 170, width = 34;
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
            ctx.fillStyle = label === 'Arya' ? '#22c55e' : label === 'Oknum Kuasa Hukum' ? '#ef4444' : '#f59e0b';
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
                    <span className="px-3 py-1 bg-blue-500/25 border border-blue-500 text-blue-300 text-xs font-bold rounded-md">LEVEL 9</span>
                    <h1 className="text-sm font-bold tracking-wide text-white">SURVIVAL WNI : Kriminalisasi & Pasal Karet</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-neutral-600 rounded-lg">
                        <span className="text-[10px] text-red-400 font-bold">HP ARYA</span>
                        <div className="w-16 h-2 bg-neutral-700 rounded overflow-hidden">
                            <div className="h-full bg-red-500 transition-all" style={{ width: `${playerHpPct}%` }} />
                        </div>
                    </div>
                    {gameState === 'FIGHT' && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-red-700 rounded-lg">
                            <span className="text-[10px] text-yellow-400 font-bold">KUASA HUKUM</span>
                            <div className="w-20 h-2 bg-neutral-700 rounded overflow-hidden">
                                <div className="h-full bg-yellow-500 transition-all" style={{ width: `${bossHpPct}%` }} />
                            </div>
                        </div>
                    )}
                    {shieldActive && (
                        <div className="px-3 py-1 text-xs font-bold rounded-lg border bg-cyan-950 border-cyan-600 text-cyan-300">
                            🛡 Perisai Hukum & 2x Damage
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
                        <span className={`font-bold text-sm px-3 py-1 rounded ${activeDialogs[dialogIndex]?.speaker === 'Arya' ? 'bg-green-600 text-white' : activeDialogs[dialogIndex]?.speaker === 'Oknum Kuasa Hukum' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'}`}>
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
                <div onClick={() => setGameState('IBU_DIALOG')} className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 cursor-pointer text-center select-none backdrop-blur-md">
                    <div className="max-w-md bg-neutral-900 border border-neutral-700 p-8 rounded-2xl shadow-2xl space-y-5 hover:border-blue-500/50 transition-colors">
                        <div className="w-16 h-16 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">⚖️</div>
                        <h2 className="text-xl font-bold text-blue-300 tracking-wider">MISI UTAMA LEVEL 9</h2>
                        <p className="text-neutral-200 text-sm leading-relaxed">Hadapi Oknum Kuasa Hukum yang mengejar & melempar proyektil <span className="text-red-400 font-bold">"TUNTUTAN PALSU"</span>. Ambil item <span className="text-cyan-300 font-bold">"Pasal Pembelaan Kepentingan Umum"</span> di sudut ruangan untuk mendapat <span className="text-cyan-300 font-bold">perisai kebal 5 detik</span> & damage rekaman <span className="text-emerald-400 font-bold">2x (50)</span>. Kuras HP 300-nya dengan merekam!</p>
                        <div className="pt-4 border-t border-neutral-800"><p className="text-xs text-blue-300 animate-pulse font-mono font-semibold">[ Klik di mana saja untuk mulai ]</p></div>
                    </div>
                </div>
            )}

            {/* HINT */}
            {gameState === 'FIGHT' && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 p-3 w-full max-w-3xl bg-neutral-900/90 border border-neutral-700 rounded-xl text-center text-xs text-cyan-300 tracking-wider shadow-2xl backdrop-blur z-20 pointer-events-none">
                    {lastActionText || "⚖️ Hindari proyektil 'TUNTUTAN PALSU' & ambil item perisai di sudut. Tekan F / SPASI untuk merekam oknum kuasa hukum!"}
                </div>
            )}

            {/* PILIHAN AKSI */}
            {gameState === 'FIGHT_CHOICE' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <div className="flex flex-col gap-4 w-full max-w-md">
                        <button onClick={() => setGameState('FIGHT')} className="py-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl">MULAI</button>
                        <button onClick={handleSurrender} className="py-4 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-xl">🏳️ Menyerah</button>
                    </div>
                </div>
            )}

            {/* VICTORY */}
            {gameState === 'VICTORY' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-3xl font-bold text-green-400 mb-3">LEVEL 9 SELESAI! 🎉</h2>
                    <p className="text-sm text-neutral-200 max-w-md mb-6 leading-relaxed">{lastActionText}</p>
                    <button onClick={() => router.push('/shop?next=10')} className="px-8 py-3.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800 shadow-xl cursor-pointer">Lanjut ke Level 10 →</button>
                </div>
            )}

            {/* GAME OVER */}
            {gameState === 'GAMEOVER' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-3xl font-bold text-red-500 mb-3">TERBUANG OLEH PASAL KARET!</h2>
                    <p className="text-sm text-neutral-200 max-w-md mb-6 leading-relaxed">{lastActionText}</p>
                    <div className="flex gap-4">
                        <button onClick={restartGame} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800 cursor-pointer">Coba Lagi Level 9</button>
                        <button onClick={() => router.push('/menu')} className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl border border-neutral-600 cursor-pointer">Kembali ke Menu</button>
                    </div>
                </div>
            )}
        </div>
    );
}