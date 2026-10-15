// src/app/level7/page.js
// LEVEL 7 : LABIRIN BIROKRASI & IZIN USAHA
// Gedung Pelayanan Terpadu Satu Pintu (PTSP): ruangan besar dengan bilik-bilik (cubicle)
// yang membentuk labirin. 4 Meja Loket di keempat sudut + meja Kepala Seksi di tengah atas.
// Karakter & gaya sama seperti Level 6.
//
// MEKANIK KHUSUS - KUMPUL STEMPEL + TIME/CHASE:
//  - Arya harus menyentuh 4 Meja Loket BERURUTAN (Loket 1 -> 2 -> 3 -> 4) untuk 4 Stempel.
//  - Selama mengumpulkan, Oknum Pejabat mengejar Arya.
//  - Jika tersentuh: HP Arya berkurang + efek SLOW 2 detik (urutan stempel TIDAK hilang).
//  - Setelah 4 stempel terkumpul, kamera HP Arya aktif untuk mengalahkan bos (HP 220).
//
// ALUR: STORY_INTRO -> MISSION_OVERLAY -> IBU_DIALOG (Staf CS Jujur)
//       -> JUKIR_DIALOG (Oknum Pejabat) -> COLLECT (4 stempel, dikejar) -> FIGHT -> VICTORY/GAMEOVER
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Level7Page() {
    const router = useRouter();
    const canvasRef = useRef(null);

    const [gameState, setGameState] = useState('STORY_INTRO');
    const [dialogIndex, setDialogIndex] = useState(0);
    const [playerMoney, setPlayerMoney] = useState(120000);
    const [lastActionText, setLastActionText] = useState('');
    const [playerHpPct, setPlayerHpPct] = useState(100);
    const [bossHpPct, setBossHpPct] = useState(100);
    const [stampCount, setStampCount] = useState(0);
    const [slowActive, setSlowActive] = useState(false);

    // ==================================================
    // NASKAH DIALOG LENGKAP (DARI SPEC)
    // ==================================================
    // A. Dialog Intro Level 7 (Lobi Dinas Perizinan - Arya)
    const introDialogs = [
        { speaker: "Arya", text: "Hari ini aku harus mengurus izin resmi UMKM kulinerku. Katanya sekarang semua perizinan sudah dipermudah untuk rakyat kecil." },
        { speaker: "Arya", text: "Tapi kok dari tadi aku perhatikan banyak orang keluar ruangan sambil menggerutu ya? Aku tanya ke meja informasi dulu." },
    ];

    // B. Dialog Informan (Meja Informasi - Arya & Staf CS Jujur)
    const ibuDialogs = [
        { speaker: "Arya", text: "Selamat pagi, Mbak. Saya mau mengurus surat izin usaha mikro. Berkas persyaratan saya sudah lengkap di map ini." },
        { speaker: "Staf CS Jujur", text: "Selamat pagi, Mas Arya. Sebenarnya berkas Mas ini sudah 100% lengkap dan gratis. Mas tinggal minta stempel verifikasi di Loket 1 sampai Loket 4." },
        { speaker: "Arya", text: "Wah, mudah sekali ya Mbak. Terima kasih!" },
        { speaker: "Staf CS Jujur", text: "Tunggu dulu, Mas... Masalahnya, Bapak Kepala Seksi di tengah ruangan itu sering sengaja 'menghilangkan' berkas warga atau memutar-mutar aturan supaya warga menyerah dan memakai jasa calo miliknya." },
        { speaker: "Arya", text: "Jadi dipersulit secara sengaja?" },
        { speaker: "Staf CS Jujur", text: "Iya, Mas. Kalau Mas mau lolos secara murni, Mas harus gesit ambil keempat stempel di tiap sudut loket, lalu rekam bukti kalau Bapak itu mencoba memeras Mas!" },
    ];

    // C. Dialog Konfrontasi Bos (Tengah Ruangan - Arya & Oknum Pejabat)
    const bossDialogs = [
        { speaker: "Oknum Pejabat", text: "Heh, anak muda! Map berkas warna kuning yang kamu bawa itu belum bisa diproses!" },
        { speaker: "Arya", text: "Kenapa belum bisa, Pak? Semua persyaratan sudah sesuai dengan undang-undang pelayanan publik." },
        { speaker: "Oknum Pejabat", text: "Aturan baru per pagi ini: fotokopi KTP harus di kertas ukuran A4 miring 15 derajat, dan harus ada tanda tangan basah dari empat loket yang petugasnya lagi istirahat makan siang! Balik lagi tiga bulan depan!" },
        { speaker: "Arya", text: "Aturan mengada-ada macam apa itu?! Bapak sengaja mempersulit saya!" },
        { speaker: "Oknum Pejabat", text: "Kalau nggak mau repot bolak-balik tiga bulan, sini masuk ke 'Jalur Tol' bapak. Bayar biaya percepatan Rp250.000, lima menit lagi surat izinmu langsung turun dari langit!" },
        { speaker: "Arya", text: "Mental birokrasi zaman batu! Kalau bisa dipermudah kenapa harus dipersulit?! Saya akan ambil semua stempel itu sendiri dan memviralkan wajah Bapak!" },
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
            else if (gameState === 'JUKIR_DIALOG') setGameState('COLLECT');
        }
    };

    // ==================================================
    // REF ASSET & ENTITAS
    // ==================================================
    const aryaImgRef = useRef(null);
    const csImgRef = useRef(null);      // Staf CS Jujur
    const pejabatImgRef = useRef(null); // Oknum Pejabat (bos)
    const extTilesetRef = useRef(null);

    // Arya (Player): HP 100, Speed 4.5
    const playerRef = useRef({
        x: 0, y: 0, size: 66, colSize: 42, speed: 4.5, baseSpeed: 4.5, health: 100, maxHealth: 100,
        facingDirection: 'down', isWalking: false, frameIndex: 1, frameTimer: 0, isAttacking: false, attackTimer: 0, attackCooldown: false,
    });

    // Staf CS Jujur (NPC Informan)
    const csRef = useRef({ x: 0, y: 0, size: 66, colSize: 42, facingDirection: 'down', frameIndex: 1, frameTimer: 0 });

    // Oknum Pejabat Birokrasi & Calo Kantor (Bos): HP 220, Speed 3.0
    const bossRef = useRef({
        x: 0, y: 0, size: 66, colSize: 42, speed: 3.0, health: 220, maxHealth: 220,
        facingDirection: 'down', isWalking: false, frameIndex: 1, frameTimer: 0, hitCd: 0,
    });

    const keysRef = useRef({});
    const initedRef = useRef(false);
    const slowTimerRef = useRef(0);
    const slowUiRef = useRef(false);
    const nextStampRef = useRef(1);   // stempel berikutnya yang dicari (1..4)
    const stampUiRef = useRef(0);

    useEffect(() => {
        const handleKeyDown = (e) => { keysRef.current[e.key.toLowerCase()] = true; };
        const handleKeyUp = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Load karakter (hapus background putih) - gaya sama Level 6
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
        loadCharImage('/assets/pak_rt.jpg', csImgRef);            // Staf CS Jujur
        loadCharImage('/assets/petugas_pungli.jpg', pejabatImgRef); // Oknum Pejabat (bos)

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

            // ---------- Area ruangan PTSP ----------
            const padTop = 96, padX = 40, padBottom = 40;
            const area = { x: padX, y: padTop, w: W - padX * 2, h: H - padTop - padBottom };

            // ---------- Meja Loket (4 sudut) ----------
            const lW = Math.min(130, area.w * 0.15);
            const lH = lW * 0.58;
            const lokets = [
                { no: 1, x: area.x + area.w * 0.03, y: area.y + area.h * 0.04, w: lW, h: lH, color: '#2563eb' },
                { no: 2, x: area.x + area.w * 0.97 - lW, y: area.y + area.h * 0.04, w: lW, h: lH, color: '#7c3aed' },
                { no: 3, x: area.x + area.w * 0.97 - lW, y: area.y + area.h * 0.96 - lH, w: lW, h: lH, color: '#db2777' },
                { no: 4, x: area.x + area.w * 0.03, y: area.y + area.h * 0.96 - lH, w: lW, h: lH, color: '#0d9488' },
            ];

            // ---------- Meja Kepala Seksi (tengah atas) ----------
            const seksi = { x: area.x + area.w * 0.5 - 95, y: area.y + area.h * 0.09, w: 190, h: 82 };

            // ---------- Bilik/cubicle (membentuk labirin) ----------
            const partitions = [
                { x: area.x + area.w * 0.20, y: area.y + area.h * 0.22, w: 26, h: area.h * 0.30 },
                { x: area.x + area.w * 0.40, y: area.y + area.h * 0.28, w: 26, h: area.h * 0.34 },
                { x: area.x + area.w * 0.60, y: area.y + area.h * 0.28, w: 26, h: area.h * 0.34 },
                { x: area.x + area.w * 0.80, y: area.y + area.h * 0.22, w: 26, h: area.h * 0.30 },
                { x: area.x + area.w * 0.08, y: area.y + area.h * 0.47, w: area.w * 0.22, h: 24 },
                { x: area.x + area.w * 0.38, y: area.y + area.h * 0.47, w: area.w * 0.24, h: 24 },
                { x: area.x + area.w * 0.70, y: area.y + area.h * 0.47, w: area.w * 0.22, h: 24 },
                { x: area.x + area.w * 0.22, y: area.y + area.h * 0.70, w: area.w * 0.20, h: 24 },
                { x: area.x + area.w * 0.58, y: area.y + area.h * 0.70, w: area.w * 0.20, h: 24 },
            ];

            // semua penghalang gerak
            const solids = [...partitions, ...lokets, seksi];

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
                player.x = area.x + area.w * 0.5; player.y = area.y + area.h * 0.80; player.health = 100;
                cs.x = area.x + area.w * 0.13; cs.y = area.y + area.h * 0.30;
                boss.x = seksi.x + seksi.w / 2 - boss.size / 2; boss.y = seksi.y + seksi.h + 8;
                boss.health = 220; boss.hitCd = 0;
                nextStampRef.current = 1; stampUiRef.current = 0;
                initedRef.current = true;
            }

            // ==========================================================
            // RENDER GEDUNG
            // ==========================================================
            // dasar & lantai
            ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#e2e8f0'; ctx.fillRect(area.x, area.y, area.w, area.h);
            // pola keramik
            ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1;
            for (let x = area.x; x <= area.x + area.w; x += 46) { ctx.beginPath(); ctx.moveTo(x, area.y); ctx.lineTo(x, area.y + area.h); ctx.stroke(); }
            for (let y = area.y; y <= area.y + area.h; y += 46) { ctx.beginPath(); ctx.moveTo(area.x, y); ctx.lineTo(area.x + area.w, y); ctx.stroke(); }
            ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 4; ctx.strokeRect(area.x, area.y, area.w, area.h);

            // bilik cubicle
            partitions.forEach((p) => {
                ctx.fillStyle = '#94a3b8'; ctx.fillRect(p.x, p.y, p.w, p.h);
                ctx.fillStyle = '#64748b'; ctx.fillRect(p.x + 2, p.y + 2, p.w - 4, p.h - 4);
            });

            // Meja Kepala Seksi
            ctx.fillStyle = '#7f1d1d'; ctx.fillRect(seksi.x, seksi.y, seksi.w, seksi.h);
            ctx.fillStyle = '#991b1b'; ctx.fillRect(seksi.x + 4, seksi.y + 4, seksi.w - 8, seksi.h - 8);
            ctx.fillStyle = '#fecaca'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
            ctx.fillText('KEPALA SEKSI PERIZINAN', seksi.x + seksi.w / 2, seksi.y + 26);
            ctx.fillStyle = '#fca5a5'; ctx.font = 'bold 10px monospace';
            ctx.fillText('"JALUR TOL" 5 MENIT JADI', seksi.x + seksi.w / 2, seksi.y + 46);
            ctx.textAlign = 'left';

            // Meja Loket + indikator stempel
            lokets.forEach((l) => {
                const done = l.no < nextStampRef.current;
                const isNext = l.no === nextStampRef.current;
                ctx.fillStyle = '#1e293b'; ctx.fillRect(l.x, l.y, l.w, l.h);
                ctx.fillStyle = l.color; ctx.fillRect(l.x + 4, l.y + 4, l.w - 8, l.h - 8);
                ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
                ctx.fillText('LOKET ' + l.no, l.x + l.w / 2, l.y + l.h / 2 + 5);
                // papan nama
                ctx.fillStyle = done ? '#16a34a' : isNext ? '#facc15' : '#475569';
                ctx.fillRect(l.x + l.w / 2 - 26, l.y - 12, 52, 16);
                ctx.fillStyle = '#0f172a'; ctx.font = 'bold 10px monospace';
                ctx.fillText(done ? '✔ OK' : isNext ? '▶ NEXT' : '—', l.x + l.w / 2, l.y);
                ctx.textAlign = 'left';
                // stempel besar kalau sudah/V
                if (done) {
                    ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 5;
                    ctx.beginPath();
                    ctx.arc(l.x + l.w / 2, l.y + l.h / 2, Math.min(l.w, l.h) * 0.34, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (isNext) {
                    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
                    ctx.strokeStyle = `rgba(250,204,21,${0.4 + pulse * 0.6})`; ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.arc(l.x + l.w / 2, l.y + l.h / 2, Math.min(l.w, l.h) * (0.40 + pulse * 0.06), 0, Math.PI * 2);
                    ctx.stroke();
                }
            });

            // petunjuk stempel berikutnya
            ctx.fillStyle = '#1d4ed8'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
            if (nextStampRef.current <= 4) {
                ctx.fillText(`Cari LOKET ${nextStampRef.current} untuk stempel ke-${nextStampRef.current}`, area.x + area.w / 2, area.y - 14);
            }
            ctx.textAlign = 'left';

            // ==========================================================
            // STATUS & EFEK SLOW
            // ==========================================================
            const canControl = gameState === 'COLLECT' || gameState === 'FIGHT';
            if (slowTimerRef.current > 0) slowTimerRef.current -= 1;
            const isSlowed = slowTimerRef.current > 0;
            player.speed = isSlowed ? 2.2 : player.baseSpeed;
            if (canControl) {
                const uiSlow = slowTimerRef.current > 0;
                if (uiSlow !== slowUiRef.current) { slowUiRef.current = uiSlow; setSlowActive(uiSlow); }
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
            // AMBIL STEMPEL (menyentuh loket sesuai urutan)
            // ==========================================================
            if (gameState === 'COLLECT') {
                const pb = boxOf(player);
                const wanted = nextStampRef.current;
                const target = lokets.find((l) => l.no === wanted);
                if (target && wanted <= 4) {
                    if (rectIntersect(pb, { x: target.x - 10, y: target.y - 10, width: target.w + 20, height: target.h + 20 })) {
                        nextStampRef.current = wanted + 1;
                        setStampCount(nextStampRef.current - 1);
                        setLastActionText(`🖊️ Stempel ${wanted} dari Loket ${wanted} berhasil! ` + (wanted < 4 ? `Lanjut cari Loket ${wanted + 1}.` : 'Semua stempel lengkap! Kamera HP aktif — rekam si pejabat!'));
                        if (nextStampRef.current > 4) {
                            setGameState('FIGHT');
                        }
                    }
                }
            }

            // ==========================================================
            // AI OKNUM PEJABAT (mengejar Arya)
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

                // kontak fisik -> HP turun + SLOW
                if (boss.hitCd > 0) boss.hitCd -= 1;
                const pb = boxOf(player);
                if (rectIntersect(pb, { x: boss.x, y: boss.y, width: boss.size, height: boss.size })) {
                    if (boss.hitCd <= 0) {
                        boss.hitCd = 45;
                        player.health -= 8;
                        slowTimerRef.current = 120; // 2 detik melambat
                        setPlayerHpPct(Math.max(0, (player.health / player.maxHealth) * 100));
                        setLastActionText('🗂️ "Berkasmu kurang fotokopi!" — Arya diperlambat & kehilangan HP!');
                        if (player.health <= 0) {
                            setGameState('GAMEOVER');
                            setLastActionText('Arya menyerah di tengah labirin birokrasi. Berkasnya "hilang" dan izinnya tak kunjung terbit.');
                        }
                    }
                }
            } else {
                boss.isWalking = false;
            }

            // ==========================================================
            // SERANGAN KAMERA (aktif setelah 4 stempel)
            // ==========================================================
            if (gameState === 'FIGHT') {
                if (player.attackTimer > 0) { player.attackTimer--; if (player.attackTimer <= 0) player.isAttacking = false; }

                const doAttack = () => {
                    if (!player.isAttacking && !player.attackCooldown) {
                        player.isAttacking = true; player.attackTimer = 18; player.attackCooldown = true;
                        const beam = getHpBeamRect(player);
                        if (rectIntersect(beam, { x: boss.x, y: boss.y, width: boss.size, height: boss.size })) {
                            boss.health -= 20; // 220 HP -> 11 rekaman
                            setBossHpPct(Math.max(0, (boss.health / boss.maxHealth) * 100));
                            setLastActionText('📱 Praktik calo & aturan mengada-adanya terekam! Pejabat mulai panik! (-20 HP)');
                            if (boss.health <= 0) {
                                setGameState('VICTORY');
                                setLastActionText('Oknum pejabat birokrasi tumbang oleh bukti rekaman! Keempat stempel sah, dan NIB + SIUP Arya akhirnya terbit.');
                            }
                        } else {
                            setLastActionText('📱 Arya merekam... (arahkan tepat ke si pejabat!)');
                        }
                        setTimeout(() => { player.attackCooldown = false; }, 300);
                    }
                };
                if (keys['f'] || keys[' ']) doAttack();
            }

            // ==========================================================
            // RENDER ENTITAS
            // ==========================================================
            renderSpriteSheet(ctx, csImgRef.current, cs, 'Staf CS');
            if (boss.health > 0) renderSpriteSheet(ctx, pejabatImgRef.current, boss, 'Oknum Pejabat');
            renderSpriteSheet(ctx, aryaImgRef.current, player, 'Arya');

            // halo slow
            if (isSlowed) {
                ctx.strokeStyle = 'rgba(56,189,248,0.85)'; ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(player.x + player.size / 2, player.y + player.size / 2, player.size * 0.72, 0, Math.PI * 2);
                ctx.stroke();
            }

            // efek kamera
            if (player.isAttacking) {
                const beam = getHpBeamRect(player);
                ctx.fillStyle = 'rgba(59, 130, 246, 0.45)';
                ctx.fillRect(beam.x, beam.y, beam.width, beam.height);
                ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2; ctx.strokeRect(beam.x, beam.y, beam.width, beam.height);
            }

            // penunjuk arah ke loket berikutnya (saat COLLECT)
            if (gameState === 'COLLECT' && nextStampRef.current <= 4) {
                const t = lokets.find((l) => l.no === nextStampRef.current);
                if (t) {
                    const tx = t.x + t.w / 2, ty = t.y + t.h / 2;
                    const pcx = player.x + player.size / 2, pcy = player.y + player.size / 2;
                    const ang = Math.atan2(ty - pcy, tx - pcx);
                    ctx.save();
                    ctx.translate(pcx, pcy - player.size * 0.9);
                    ctx.rotate(ang);
                    ctx.fillStyle = '#facc15';
                    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -8); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill();
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
        slowTimerRef.current = 0;
        slowUiRef.current = false;
        nextStampRef.current = 1;
        stampUiRef.current = 0;
        playerRef.current = { ...playerRef.current, health: 100, speed: 4.5, isWalking: false, facingDirection: 'down', frameIndex: 1 };
        bossRef.current = { ...bossRef.current, health: 220, isWalking: false, facingDirection: 'down', frameIndex: 1, hitCd: 0 };
        setPlayerMoney(120000);
        setPlayerHpPct(100);
        setBossHpPct(100);
        setStampCount(0);
        setSlowActive(false);
        setDialogIndex(0);
        setLastActionText('');
        setGameState('STORY_INTRO');
    };

    const handleSurrender = () => {
        const denda = 250000;
        setPlayerMoney((prev) => Math.max(0, prev - denda));
        setGameState('GAMEOVER');
        setLastActionText(`Kamu menyerah dan membayar Rp ${denda.toLocaleString('id-ID')} untuk "Jalur Tol" calo. Izinmu jadi, tapi dompetmu terkuras.`);
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
            ctx.fillStyle = label === 'Arya' ? '#22c55e' : label === 'Oknum Pejabat' ? '#ef4444' : '#f59e0b';
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
                    <span className="px-3 py-1 bg-teal-500/25 border border-teal-500 text-teal-300 text-xs font-bold rounded-md">LEVEL 7</span>
                    <h1 className="text-sm font-bold tracking-wide text-white">SURVIVAL WNI : Labirin Birokrasi & Izin Usaha</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-neutral-600 rounded-lg">
                        <span className="text-[10px] text-red-400 font-bold">HP ARYA</span>
                        <div className="w-16 h-2 bg-neutral-700 rounded overflow-hidden">
                            <div className="h-full bg-red-500 transition-all" style={{ width: `${playerHpPct}%` }} />
                        </div>
                    </div>
                    {(gameState === 'COLLECT' || gameState === 'FIGHT') && (
                        <div className={`px-3 py-1 text-xs font-bold rounded-lg border ${stampCount >= 4 ? 'bg-emerald-950 border-emerald-600 text-emerald-400' : 'bg-neutral-800 border-yellow-600 text-yellow-300'}`}>
                            🖊️ Stempel {stampCount}/4
                        </div>
                    )}
                    {gameState === 'FIGHT' && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-red-700 rounded-lg">
                            <span className="text-[10px] text-yellow-400 font-bold">PEJABAT</span>
                            <div className="w-20 h-2 bg-neutral-700 rounded overflow-hidden">
                                <div className="h-full bg-yellow-500 transition-all" style={{ width: `${bossHpPct}%` }} />
                            </div>
                        </div>
                    )}
                    {slowActive && (
                        <div className="px-3 py-1 text-xs font-bold rounded-lg border bg-sky-950 border-sky-600 text-sky-300">
                            🗂️ Melambat
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
                <div className={`absolute bottom-8 left-8 right-8 bg-neutral-900/95 border-2 p-6 rounded-2xl shadow-2xl backdrop-blur z-20 max-w-4xl mx-auto ${gameState === 'JUKIR_DIALOG' ? 'border-red-500' : gameState === 'IBU_DIALOG' ? 'border-amber-500' : 'border-teal-500'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <span className={`font-bold text-sm px-3 py-1 rounded ${activeDialogs[dialogIndex]?.speaker === 'Arya' ? 'bg-green-600 text-white' : activeDialogs[dialogIndex]?.speaker === 'Oknum Pejabat' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'}`}>
                            {activeDialogs[dialogIndex]?.speaker}
                        </span>
                        <span className="text-xs text-neutral-400 font-mono">{dialogIndex + 1} / {activeDialogs.length}</span>
                    </div>
                    <p className="text-sm text-neutral-100 italic leading-relaxed my-3 min-h-[48px]">"{activeDialogs[dialogIndex]?.text}"</p>
                    <button onClick={handleNextDialog} className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-white font-bold text-xs rounded-xl border-b-4 border-teal-700 cursor-pointer tracking-widest">
                        LANJUT ➔
                    </button>
                </div>
            )}

            {/* MISSION OVERLAY */}
            {gameState === 'MISSION_OVERLAY' && (
                <div onClick={() => setGameState('IBU_DIALOG')} className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 cursor-pointer text-center select-none backdrop-blur-md">
                    <div className="max-w-md bg-neutral-900 border border-neutral-700 p-8 rounded-2xl shadow-2xl space-y-5 hover:border-teal-500/50 transition-colors">
                        <div className="w-16 h-16 bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">🏛️</div>
                        <h2 className="text-xl font-bold text-teal-300 tracking-wider">MISI UTAMA LEVEL 7</h2>
                        <p className="text-neutral-200 text-sm leading-relaxed">Kumpulkan <span className="text-yellow-400 font-bold">4 Stempel</span> dari Loket <span className="font-bold">1 → 2 → 3 → 4</span> secara berurutan di sudut ruangan, sambil menghindari Oknum Pejabat yang mengejar. Setelah lengkap, <span className="text-emerald-400 font-bold">rekam wajahnya</span> dengan kamera HP!</p>
                        <div className="pt-4 border-t border-neutral-800"><p className="text-xs text-teal-300 animate-pulse font-mono font-semibold">[ Klik di mana saja untuk mulai ]</p></div>
                    </div>
                </div>
            )}

            {/* HINT */}
            {(gameState === 'COLLECT' || gameState === 'FIGHT') && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 p-3 w-full max-w-3xl bg-neutral-900/90 border border-neutral-700 rounded-xl text-center text-xs text-yellow-400 tracking-wider shadow-2xl backdrop-blur z-20 pointer-events-none">
                    {lastActionText || "🖊️ Ambil stempel Loket 1 → 2 → 3 → 4, jangan sampai tersentuh Oknum Pejabat!"}
                </div>
            )}

            {/* PILIHAN AKSI */}
            {gameState === 'FIGHT_CHOICE' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <div className="flex flex-col gap-4 w-full max-w-md">
                        <button onClick={() => setGameState('COLLECT')} className="py-4 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl">MULAI</button>
                        <button onClick={handleSurrender} className="py-4 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-xl">🏳️ Menyerah</button>
                    </div>
                </div>
            )}

            {/* VICTORY */}
            {gameState === 'VICTORY' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-3xl font-bold text-green-400 mb-3">LEVEL 7 SELESAI! 🎉</h2>
                    <p className="text-sm text-neutral-200 max-w-md mb-6 leading-relaxed">{lastActionText}</p>
                    <button onClick={() => router.push('/shop?next=8')} className="px-8 py-3.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800 shadow-xl cursor-pointer">Lanjut ke Level 8 →</button>
                </div>
            )}

            {/* GAME OVER */}
            {gameState === 'GAMEOVER' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-3xl font-bold text-red-500 mb-3">TERJEBAK BIROKRASI!</h2>
                    <p className="text-sm text-neutral-200 max-w-md mb-6 leading-relaxed">{lastActionText}</p>
                    <div className="flex gap-4">
                        <button onClick={restartGame} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800 cursor-pointer">Coba Lagi Level 7</button>
                        <button onClick={() => router.push('/menu')} className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl border border-neutral-600 cursor-pointer">Kembali ke Menu</button>
                    </div>
                </div>
            )}
        </div>
    );
}