// src/app/level8/page.js
// LEVEL 8 : SKANDAL BANSOS BERAS PLASTIK
// Gudang Logistik Balai Desa (Malam Hari): ruangan gelap luas, tumpukan karung beras,
// peti kayu logistik, dan truk pengangkut dekat pintu keluar.
// Karakter & gaya sama seperti Level 7.
//
// MEKANIK KHUSUS - GELAP & CAHAYA SENTER (Fog of War) + BUKTI KARUNG:
//  - Layar gelap; hanya area sekitar Arya + arah senter (facing) yang terlihat.
//  - Arya harus menemukan & memotret 3 Tumpukan Beras Premium Asli di balik peti gudang.
//  - Oknum Koordinator Penyalur Bansos mengejar selama pencarian.
//  - Setelah 3 bukti terkumpul, kamera HP aktif untuk menguras HP bos (HP 250).
//
// ALUR: STORY_INTRO -> MISSION_OVERLAY -> IBU_DIALOG (Petugas Kebersihan)
//       -> JUKIR_DIALOG (Oknum Penyalur) -> COLLECT (3 bukti, dikejar) -> FIGHT -> VICTORY/GAMEOVER
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Level8Page() {
    const router = useRouter();
    const canvasRef = useRef(null);

    const [gameState, setGameState] = useState('STORY_INTRO');
    const [dialogIndex, setDialogIndex] = useState(0);
    const [playerMoney, setPlayerMoney] = useState(120000);
    const [lastActionText, setLastActionText] = useState('');
    const [playerHpPct, setPlayerHpPct] = useState(100);
    const [bossHpPct, setBossHpPct] = useState(100);
    const [evidenceCount, setEvidenceCount] = useState(0);
    const [slowActive, setSlowActive] = useState(false);

    // ==================================================
    // NASKAH DIALOG LENGKAP (DARI SPEC)
    // ==================================================
    // A. Dialog Intro Level 8 (Di Rumah -> Depan Gudang - Arya & Kakek)
    const introDialogs = [
        { speaker: "Kakek", text: "Arya... coba lihat beras bantuan yang baru Kakek ambil dari balai desa tadi sore. Kok warnanya kuning kehitaman dan baunya menyengat begini ya?" },
        { speaker: "Arya", text: "(Memeriksa beras) Ya Tuhan, Kek! Ini beras busuk yang sudah berkutu, bahkan teksturnya aneh! Padahal di karungnya tertulis 'Beras Premium Bantuan Negara 10 Kg', tapi isinya cuma setengah karung!" },
        { speaker: "Kakek", text: "Sudahlah Nak, mungkin memang jatah untuk orang miskin seperti kita cuma segini..." },
        { speaker: "Arya", text: "Tidak, Kek! Anggaran negara untuk bantuan rakyat itu triliunan rupiah. Pasti ada permainan kotor di gudang penyalur desa. Malam ini Arya akan cek ke sana!" },
    ];

    // B. Dialog Informan (Pintu Samping Gudang - Arya & Petugas Kebersihan)
    const ibuDialogs = [
        { speaker: "Petugas Kebersihan", text: "Ssst! Nak Arya! Ngapain malam-malam di dekat gudang logistik desa?!" },
        { speaker: "Arya", text: "Pak, saya mau protes soal beras bantuan untuk Kakek saya yang tidak layak makan. Kenapa gudang masih ramai suara mesin jahit karung jam segini?" },
        { speaker: "Petugas Kebersihan", text: "Jangan keras-keras! Di dalam itu Pak Koordinator lagi bongkar muat. Beras asli yang putih bersih dari pemerintah dipindahkan ke karung polos buat dijual ke tengkulak." },
        { speaker: "Arya", text: "Lalu yang dibagikan ke warga lansia seperti Kakek saya tadi apa, Pak?!" },
        { speaker: "Petugas Kebersihan", text: "Beras rongsokan sisa gudang tahun lalu yang dicampur pemutih! Bapak nggak berani lapor karena diancam dipecat. Tumpukan beras aslinya disembunyikan di tiga titik belakang gudang. Hati-hati, lampunya sengaja dipadamkan!" },
    ];

    // C. Dialog Konfrontasi Bos (Dalam Gudang - Arya & Oknum Penyalur)
    const bossDialogs = [
        { speaker: "Oknum Penyalur", text: "Siapa itu yang nyalain senter?! Woi! Masuk tanpa izin ke gudang negara itu pidana!" },
        { speaker: "Arya", text: "Yang pidana itu Bapak! Saya sudah melihat tumpukan beras premium bantuan presiden yang Bapak kurung di belakang untuk dijual ke tengkulak!" },
        { speaker: "Oknum Penyalur", text: "Tahu apa bocah ingusan kayak kamu soal biaya operasional?! Mengurus distribusi itu butuh uang rokok dan bensin! Wajar kalau kami ambil 'sedikit' selisihnya!" },
        { speaker: "Arya", text: "Sedikit Bapak bilang?! Bapak memotong separuh takaran dan memberi makan orang tua serta warga miskin dengan beras busuk berkutu! Di mana hati nurani Bapak?!" },
        { speaker: "Oknum Penyalur", text: "Rakyat miskin dikasih gratis aja udah bagus, nggak usah banyak komplain soal rasa! Sini HP kamu, jangan sampai rekaman gudang ini keluar!" },
        { speaker: "Arya", text: "Hak orang miskin yang Bapak rampok ini akan menjadi bukti yang menyeret Bapak ke penjara!" },
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
    const csImgRef = useRef(null);      // Petugas Kebersihan
    const pejabatImgRef = useRef(null); // Oknum Penyalur (bos)
    const extTilesetRef = useRef(null);

    // Arya (Player): HP 100, Speed 4
    const playerRef = useRef({
        x: 0, y: 0, size: 66, colSize: 42, speed: 4.0, baseSpeed: 4.0, health: 100, maxHealth: 100,
        facingDirection: 'down', isWalking: false, frameIndex: 1, frameTimer: 0, isAttacking: false, attackTimer: 0, attackCooldown: false,
    });

    // Petugas Kebersihan (NPC Informan)
    const csRef = useRef({ x: 0, y: 0, size: 66, colSize: 42, facingDirection: 'down', frameIndex: 1, frameTimer: 0 });

    // Oknum Koordinator Penyalur Bansos (Bos): HP 250, Speed 2.8
    const bossRef = useRef({
        x: 0, y: 0, size: 66, colSize: 42, speed: 2.8, health: 250, maxHealth: 250,
        facingDirection: 'down', isWalking: false, frameIndex: 1, frameTimer: 0, hitCd: 0,
    });

    const keysRef = useRef({});
    const initedRef = useRef(false);
    const slowTimerRef = useRef(0);
    const slowUiRef = useRef(false);
    const nextEvidenceRef = useRef(1);   // bukti berikutnya (1..3)
    const evidenceUiRef = useRef(0);
    const collectedRef = useRef({ 1: false, 2: false, 3: false });

    useEffect(() => {
        const handleKeyDown = (e) => { keysRef.current[e.key.toLowerCase()] = true; };
        const handleKeyUp = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Load karakter (hapus background putih) - gaya sama Level 7
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
        loadCharImage('/assets/pak_rt.jpg', csImgRef);            // Petugas Kebersihan
        loadCharImage('/assets/petugas_pungli.jpg', pejabatImgRef); // Oknum Penyalur (bos)

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

            // ---------- Area gudang ----------
            const padTop = 96, padX = 40, padBottom = 40;
            const area = { x: padX, y: padTop, w: W - padX * 2, h: H - padTop - padBottom };

            // ---------- Peti Gudang (formasi lorong) ----------
            const crates = [
                { x: area.x + area.w * 0.12, y: area.y + area.h * 0.30, w: 130, h: 58 },
                { x: area.x + area.w * 0.38, y: area.y + area.h * 0.20, w: 58, h: 130 },
                { x: area.x + area.w * 0.66, y: area.y + area.h * 0.30, w: 130, h: 58 },
                { x: area.x + area.w * 0.30, y: area.y + area.h * 0.62, w: 130, h: 58 },
                { x: area.x + area.w * 0.62, y: area.y + area.h * 0.68, w: 58, h: 120 },
            ];

            // ---------- Truk pengangkut (dekat pintu keluar) ----------
            const truck = { x: area.x + area.w * 0.42, y: area.y + area.h * 0.86, w: 150, h: 56 };

            // ---------- 3 Tumpukan Beras Premium Asli (disembunyikan di balik peti) ----------
            const ricePiles = [
                { id: 1, x: area.x + area.w * 0.13, y: area.y + area.h * 0.13, w: 74, h: 74 },
                { id: 2, x: area.x + area.w * 0.83, y: area.y + area.h * 0.16, w: 74, h: 74 },
                { id: 3, x: area.x + area.w * 0.12, y: area.y + area.h * 0.80, w: 74, h: 74 },
            ];

            const solids = [...crates, truck];

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
                player.x = area.x + area.w * 0.5; player.y = area.y + area.h * 0.55; player.health = 100;
                cs.x = area.x + area.w * 0.50; cs.y = area.y + area.h * 0.05;
                boss.x = area.x + area.w * 0.86 - boss.size; boss.y = area.y + area.h * 0.50;
                boss.health = 250; boss.hitCd = 0;
                nextEvidenceRef.current = 1; evidenceUiRef.current = 0;
                collectedRef.current = { 1: false, 2: false, 3: false };
                initedRef.current = true;
            }

            // ==========================================================
            // RENDER GUDANG (dasar) - hanya tampak lewat cahaya
            // ==========================================================
            ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#2b2118'; ctx.fillRect(area.x, area.y, area.w, area.h);
            // lantai beton bergaris
            ctx.strokeStyle = '#3b2f24'; ctx.lineWidth = 1;
            for (let x = area.x; x <= area.x + area.w; x += 60) { ctx.beginPath(); ctx.moveTo(x, area.y); ctx.lineTo(x, area.y + area.h); ctx.stroke(); }
            for (let y = area.y; y <= area.y + area.h; y += 60) { ctx.beginPath(); ctx.moveTo(area.x, y); ctx.lineTo(area.x + area.w, y); ctx.stroke(); }

            // peti gudang
            crates.forEach((c) => {
                ctx.fillStyle = '#6b4a2f'; ctx.fillRect(c.x, c.y, c.w, c.h);
                ctx.fillStyle = '#8a6338'; ctx.fillRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8);
                ctx.strokeStyle = '#4a3421'; ctx.lineWidth = 2; ctx.strokeRect(c.x, c.y, c.w, c.h);
            });

            // truk
            ctx.fillStyle = '#334155'; ctx.fillRect(truck.x, truck.y, truck.w, truck.h);
            ctx.fillStyle = '#475569'; ctx.fillRect(truck.x + 5, truck.y + 5, truck.w - 10, truck.h - 10);
            ctx.fillStyle = '#0f172a'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
            ctx.fillText('TRUK LOGISTIK', truck.x + truck.w / 2, truck.y + truck.h / 2 + 4);
            ctx.textAlign = 'left';

            // tumpukan beras premium (yang belum terfoto)
            ricePiles.forEach((rp) => {
                const done = collectedRef.current[rp.id];
                if (!done) {
                    ctx.fillStyle = '#d9a441'; ctx.fillRect(rp.x, rp.y, rp.w, rp.h);
                    ctx.fillStyle = '#f3d08a'; ctx.fillRect(rp.x + 5, rp.y + 5, rp.w - 10, rp.h - 10);
                    ctx.fillStyle = '#8a6338'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
                    ctx.fillText('BERAS', rp.x + rp.w / 2, rp.y + rp.h / 2 - 2);
                    ctx.fillText('PREMIUM', rp.x + rp.w / 2, rp.y + rp.h / 2 + 11);
                    ctx.textAlign = 'left';
                }
            });

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
            // FOTO BUKTI (menyentuh 3 tumpukan beras, bebas urutan)
            // ==========================================================
            if (gameState === 'COLLECT') {
                const pb = boxOf(player);
                ricePiles.forEach((rp) => {
                    if (collectedRef.current[rp.id]) return;
                    if (rectIntersect(pb, { x: rp.x - 12, y: rp.y - 12, width: rp.w + 24, height: rp.h + 24 })) {
                        collectedRef.current[rp.id] = true;
                        evidenceUiRef.current = Object.values(collectedRef.current).filter(Boolean).length;
                        setEvidenceCount(evidenceUiRef.current);
                        if (evidenceUiRef.current >= 3) {
                            setGameState('FIGHT');
                            setLastActionText('📷 Ketiga tumpukan beras premium asli terfoto! Kamera HP aktif — kuras HP Oknum Penyalur!');
                        } else {
                            setLastActionText(`📷 Bukti terekam! (${evidenceUiRef.current}/3) Cari tumpukan beras premium lainnya.`);
                        }
                    }
                });
            }

            // ==========================================================
            // AI OKNUM PENYALUR (mengejar Arya)
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
                        player.health -= 10;
                        slowTimerRef.current = 110;
                        setPlayerHpPct(Math.max(0, (player.health / player.maxHealth) * 100));
                        setLastActionText('🔦 "Pencari masalah! Keluar dari gudang negara!" — Arya terhuyung & melambat!');
                        if (player.health <= 0) {
                            setGameState('GAMEOVER');
                            setLastActionText('Arya kehabisan tenaga di kegelapan gudang. Bukti penyelewengan bansos ikut terkubur.');
                        }
                    }
                }
            } else {
                boss.isWalking = false;
            }

            // ==========================================================
            // CAHAYA & KABUT (FOG OF WAR) - digambar SETELAH dunia
            // ==========================================================
            // lapisan gelap
            ctx.save();
            ctx.globalCompositeOperation = 'multiply';

            // gradient gelap: hitam pekat di tepi
            const grad = ctx.createRadialGradient(
                player.x + player.size / 2, player.y + player.size / 2, 40,
                player.x + player.size / 2, player.y + player.size / 2, Math.max(W, H) * 0.75
            );
            grad.addColorStop(0, 'rgba(120,120,120,1)');
            grad.addColorStop(0.22, 'rgba(70,70,70,1)');
            grad.addColorStop(0.5, 'rgba(28,28,28,1)');
            grad.addColorStop(1, 'rgba(8,8,8,1)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();

            // ==========================================================
            // SERANGAN KAMERA HP (aktif setelah 3 bukti)
            // ==========================================================
            if (gameState === 'FIGHT') {
                if (player.attackTimer > 0) { player.attackTimer--; if (player.attackTimer <= 0) player.isAttacking = false; }

                const beam = getHpBeamRect(player);
                const doAttack = () => {
                    if (!player.isAttacking && !player.attackCooldown) {
                        player.isAttacking = true; player.attackTimer = 18; player.attackCooldown = true;
                        if (rectIntersect(beam, { x: boss.x, y: boss.y, width: boss.size, height: boss.size })) {
                            boss.health -= 25; // 250 HP -> 10 rekaman
                            setBossHpPct(Math.max(0, (boss.health / boss.maxHealth) * 100));
                            setLastActionText(`📱 Rekaman memperlihatkan beras premium disembunyikan! HP penyalur turun! (${Math.max(0, boss.health)}/250)`);
                            if (boss.health <= 0) {
                                setGameState('VICTORY');
                                setLastActionText('Oknum Koordinator Penyalur Bansos tertangkap bukti! Beras premium dikembalikan ke warga, dan Kakek akhirnya menerima bantuan yang layak.');
                            }
                        } else {
                            setLastActionText('📱 Arya merekam... (arahkan senter/kamera tepat ke si penyalur!)');
                        }
                        setTimeout(() => { player.attackCooldown = false; }, 300);
                    }
                };
                if (keys['f'] || keys[' ']) doAttack();
            }

            // ==========================================================
            // RENDER ENTITAS
            // ==========================================================
            renderSpriteSheet(ctx, csImgRef.current, cs, 'Petugas Kebersihan');
            if (boss.health > 0) renderSpriteSheet(ctx, pejabatImgRef.current, boss, 'Oknum Penyalur');
            renderSpriteSheet(ctx, aryaImgRef.current, player, 'Arya');

            // halo slow
            if (isSlowed) {
                ctx.strokeStyle = 'rgba(56,189,248,0.85)'; ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(player.x + player.size / 2, player.y + player.size / 2, player.size * 0.72, 0, Math.PI * 2);
                ctx.stroke();
            }

            // cahaya senter (kerucut) + lingkaran sekitar Arya
            const pcx = player.x + player.size / 2, pcy = player.y + player.size / 2;
            const beamDirAngle =
                player.facingDirection === 'right' ? 0 :
                player.facingDirection === 'left' ? Math.PI :
                player.facingDirection === 'up' ? -Math.PI / 2 : Math.PI / 2;
            const beamLen = 320;
            const beamSpread = Math.PI / 5;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const beamGrad = ctx.createRadialGradient(pcx, pcy, 20, pcx, pcy, beamLen);
            beamGrad.addColorStop(0, 'rgba(255,240,180,0.35)');
            beamGrad.addColorStop(1, 'rgba(255,240,180,0)');
            ctx.fillStyle = beamGrad;
            ctx.beginPath();
            ctx.moveTo(pcx, pcy);
            ctx.arc(pcx, pcy, beamLen, beamDirAngle - beamSpread, beamDirAngle + beamSpread);
            ctx.closePath();
            ctx.fill();
            // halo sekitar Arya
            const haloGrad = ctx.createRadialGradient(pcx, pcy, 10, pcx, pcy, 160);
            haloGrad.addColorStop(0, 'rgba(255,250,220,0.22)');
            haloGrad.addColorStop(1, 'rgba(255,250,220,0)');
            ctx.fillStyle = haloGrad;
            ctx.beginPath();
            ctx.arc(pcx, pcy, 160, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // panduan arah ke bukti berikutnya saat COLLECT
            if (gameState === 'COLLECT') {
                const remaining = ricePiles.filter((rp) => !collectedRef.current[rp.id]);
                if (remaining.length > 0) {
                    let nearest = remaining[0], best = Infinity;
                    remaining.forEach((rp) => {
                        const d = Math.hypot((rp.x + rp.w / 2) - pcx, (rp.y + rp.h / 2) - pcy);
                        if (d < best) { best = d; nearest = rp; }
                    });
                    const tx = nearest.x + nearest.w / 2, ty = nearest.y + nearest.h / 2;
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
        slowTimerRef.current = 0;
        slowUiRef.current = false;
        nextEvidenceRef.current = 1;
        evidenceUiRef.current = 0;
        collectedRef.current = { 1: false, 2: false, 3: false };
        playerRef.current = { ...playerRef.current, health: 100, speed: 4.0, isWalking: false, facingDirection: 'down', frameIndex: 1 };
        bossRef.current = { ...bossRef.current, health: 250, isWalking: false, facingDirection: 'down', frameIndex: 1, hitCd: 0 };
        setPlayerMoney(120000);
        setPlayerHpPct(100);
        setBossHpPct(100);
        setEvidenceCount(0);
        setSlowActive(false);
        setDialogIndex(0);
        setLastActionText('');
        setGameState('STORY_INTRO');
    };

    const handleSurrender = () => {
        const denda = 250000;
        setPlayerMoney((prev) => Math.max(0, prev - denda));
        setGameState('GAMEOVER');
        setLastActionText(`Kamu menyerah. Bansos tetap tidak layak, dan Oknum Penyalur tetap menjual beras premium ke tengkulak.`);
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
            ctx.fillStyle = label === 'Arya' ? '#22c55e' : label === 'Oknum Penyalur' ? '#ef4444' : '#f59e0b';
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
                    <span className="px-3 py-1 bg-amber-500/25 border border-amber-500 text-amber-300 text-xs font-bold rounded-md">LEVEL 8</span>
                    <h1 className="text-sm font-bold tracking-wide text-white">SURVIVAL WNI : Skandal Bansos Beras Plastik</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-neutral-600 rounded-lg">
                        <span className="text-[10px] text-red-400 font-bold">HP ARYA</span>
                        <div className="w-16 h-2 bg-neutral-700 rounded overflow-hidden">
                            <div className="h-full bg-red-500 transition-all" style={{ width: `${playerHpPct}%` }} />
                        </div>
                    </div>
                    {(gameState === 'COLLECT' || gameState === 'FIGHT') && (
                        <div className={`px-3 py-1 text-xs font-bold rounded-lg border ${evidenceCount >= 3 ? 'bg-emerald-950 border-emerald-600 text-emerald-400' : 'bg-neutral-800 border-yellow-600 text-yellow-300'}`}>
                            📷 Bukti {evidenceCount}/3
                        </div>
                    )}
                    {gameState === 'FIGHT' && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-red-700 rounded-lg">
                            <span className="text-[10px] text-yellow-400 font-bold">PENYALUR</span>
                            <div className="w-20 h-2 bg-neutral-700 rounded overflow-hidden">
                                <div className="h-full bg-yellow-500 transition-all" style={{ width: `${bossHpPct}%` }} />
                            </div>
                        </div>
                    )}
                    {slowActive && (
                        <div className="px-3 py-1 text-xs font-bold rounded-lg border bg-sky-950 border-sky-600 text-sky-300">
                            🔦 Melambat
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
                <div className={`absolute bottom-8 left-8 right-8 bg-neutral-900/95 border-2 p-6 rounded-2xl shadow-2xl backdrop-blur z-20 max-w-4xl mx-auto ${gameState === 'JUKIR_DIALOG' ? 'border-red-500' : gameState === 'IBU_DIALOG' ? 'border-amber-500' : 'border-amber-700'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <span className={`font-bold text-sm px-3 py-1 rounded ${activeDialogs[dialogIndex]?.speaker === 'Arya' ? 'bg-green-600 text-white' : activeDialogs[dialogIndex]?.speaker === 'Oknum Penyalur' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'}`}>
                            {activeDialogs[dialogIndex]?.speaker}
                        </span>
                        <span className="text-xs text-neutral-400 font-mono">{dialogIndex + 1} / {activeDialogs.length}</span>
                    </div>
                    <p className="text-sm text-neutral-100 italic leading-relaxed my-3 min-h-[48px]">"{activeDialogs[dialogIndex]?.text}"</p>
                    <button onClick={handleNextDialog} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl border-b-4 border-amber-700 cursor-pointer tracking-widest">
                        LANJUT ➔
                    </button>
                </div>
            )}

            {/* MISSION OVERLAY */}
            {gameState === 'MISSION_OVERLAY' && (
                <div onClick={() => setGameState('IBU_DIALOG')} className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 cursor-pointer text-center select-none backdrop-blur-md">
                    <div className="max-w-md bg-neutral-900 border border-neutral-700 p-8 rounded-2xl shadow-2xl space-y-5 hover:border-amber-500/50 transition-colors">
                        <div className="w-16 h-16 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">🔦</div>
                        <h2 className="text-xl font-bold text-amber-300 tracking-wider">MISI UTAMA LEVEL 8</h2>
                        <p className="text-neutral-200 text-sm leading-relaxed">Gudang gelap gulita! Temukan & foto <span className="text-amber-400 font-bold">3 Tumpukan Beras Premium Asli</span> yang disembunyikan di balik peti. Hindari Oknum Penyalur yang mengejar. Setelah 3 bukti lengkap, <span className="text-emerald-400 font-bold">kamera HP</span> aktif untuk menguras HP-nya.</p>
                        <div className="pt-4 border-t border-neutral-800"><p className="text-xs text-amber-300 animate-pulse font-mono font-semibold">[ Klik di mana saja untuk mulai ]</p></div>
                    </div>
                </div>
            )}

            {/* HINT */}
            {(gameState === 'COLLECT' || gameState === 'FIGHT') && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 p-3 w-full max-w-3xl bg-neutral-900/90 border border-neutral-700 rounded-xl text-center text-xs text-amber-400 tracking-wider shadow-2xl backdrop-blur z-20 pointer-events-none">
                    {lastActionText || "🔦 Arahkan senter (gerak/WASD) mencari 3 beras premium di balik peti. Jangan sampai tersentuh Oknum Penyalur!"}
                </div>
            )}

            {/* PILIHAN AKSI */}
            {gameState === 'FIGHT_CHOICE' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <div className="flex flex-col gap-4 w-full max-w-md">
                        <button onClick={() => setGameState('COLLECT')} className="py-4 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl">MULAI</button>
                        <button onClick={handleSurrender} className="py-4 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-xl">🏳️ Menyerah</button>
                    </div>
                </div>
            )}

            {/* VICTORY */}
            {gameState === 'VICTORY' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-3xl font-bold text-green-400 mb-3">LEVEL 8 SELESAI! 🎉</h2>
                    <p className="text-sm text-neutral-200 max-w-md mb-6 leading-relaxed">{lastActionText}</p>
                    <button onClick={() => router.push('/shop?next=9')} className="px-8 py-3.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800 shadow-xl cursor-pointer">Lanjut ke Level 9 →</button>
                </div>
            )}

            {/* GAME OVER */}
            {gameState === 'GAMEOVER' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-3xl font-bold text-red-500 mb-3">TERJEBAK DALAM GELAP!</h2>
                    <p className="text-sm text-neutral-200 max-w-md mb-6 leading-relaxed">{lastActionText}</p>
                    <div className="flex gap-4">
                        <button onClick={restartGame} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800 cursor-pointer">Coba Lagi Level 8</button>
                        <button onClick={() => router.push('/menu')} className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl border border-neutral-600 cursor-pointer">Kembali ke Menu</button>
                    </div>
                </div>
            )}
        </div>
    );
}