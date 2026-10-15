// src/app/level3/page.js
// LEVEL 3 : PALAK PREMAN BERKEDOK PARKIR
// Area parkir pertokoan / minimarket "Indoapril" (gaya sama seperti Level 2)
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Level3Page() {
    const router = useRouter();
    const canvasRef = useRef(null);

    const [gameState, setGameState] = useState('STORY_INTRO');
    const [dialogIndex, setDialogIndex] = useState(0);
    const [playerMoney, setPlayerMoney] = useState(100000);
    const [lastActionText, setLastActionText] = useState('');
    const [bossHpPct, setBossHpPct] = useState(100);
    const [playerHpPct, setPlayerHpPct] = useState(100);
    const [hasKey, setHasKey] = useState(false);

    // ==================================================
    // NASKAH DIALOG LENGKAP (DARI SPEC)
    // ==================================================
    // A. Dialog Intro Level 3 (Monolog Arya)
    const introDialogs = [
        { speaker: "Arya", text: "Lelah sekali hari ini. Untung obat buat Kakek sudah terbeli di minimarket ini." },
        { speaker: "Arya", text: "Loh, perasaan tadi aku taruh motor di dekat sini... Siapa abang-abang rompi oranye yang bersandar di motorku itu?" },
    ];

    // B. Dialog Informan (Sudut Parkiran - Arya & Ibu Warung)
    const ibuDialogs = [
        { speaker: "Ibu Warung", text: "Dek, motor yang warna hitam di ujung itu motor kamu ya?" },
        { speaker: "Arya", text: "Iya, Bu. Itu motor saya. Kenapa ya Bu?" },
        { speaker: "Ibu Warung", text: "Waduh, hati-hati Dek. Itu si Bang Jago, preman sini yang suka ngaku-ngaku petugas parkir. Tadi Ibu lihat dia ngotak-ngatik kunci motormu." },
        { speaker: "Arya", text: "Loh, di spanduk minimarket kan jelas-jelas ditulis 'Parkir Gratis Khusus Pelanggan', Bu?" },
        { speaker: "Ibu Warung", text: "Jangan ditanya, Dek. Kemarin aja ada mahasiswa dipalak Rp20.000, pas nolak helmnya langsung dibanting. Dia suka ngelempar botol kalau marah!" },
        { speaker: "Arya", text: "Nggak bisa dibiarkan ini, Bu. Uang saya pas-pasan buat makan sama Kakek. Saya harus ambil balik kunci saya!" },
    ];

    // C. Dialog Konfrontasi Bos (Parkiran Minimarket - Arya & Jukir Liar)
    const jukirDialogs = [
        { speaker: "Jukir Liar", text: "Priiiit! Mau ke mana lu, Tong? Enak aja main nyelonong ambil motor!" },
        { speaker: "Arya", text: "Ini motor saya, Bang! Tolong kembalikan kuncinya. Saya cuma mampir beli obat lima menit." },
        { speaker: "Jukir Liar", text: "Lima menit kek, sedetik kek, lu injak tanah wilayah gue, bayar! Sini setor Rp20.000 buat uang koordinasi keamanan!" },
        { speaker: "Arya", text: "Dua puluh ribu?! Parkir motor normal aja cuma dua ribu, itu pun kalau ada karcis resmi dari Dishub! Abang tadi pas saya datang aja nggak ada, pas saya mau pulang baru nongol!" },
        { speaker: "Jukir Liar", text: "Wah, banyak bacot lu ya! Kunci motor lu gue lempar ke pojokan tuh! Kalau nggak bayar Rp20.000 sekarang, bukan cuma kunci, spion motor lu gue patahin!" },
        { speaker: "Arya", text: "Preman berkedok juru parkir! Saya ambil kunci saya, dan wajah Abang bakal masuk berita kriminal sore ini!" },
    ];

    const getActiveDialogs = () => {
        if (gameState === 'STORY_INTRO') return introDialogs;
        if (gameState === 'IBU_DIALOG') return ibuDialogs;
        if (gameState === 'JUKIR_DIALOG') return jukirDialogs;
        return [];
    };

    const handleNextDialog = () => {
        const list = getActiveDialogs();
        if (dialogIndex < list.length - 1) {
            setDialogIndex(dialogIndex + 1);
        } else {
            if (gameState === 'STORY_INTRO') setGameState('MISSION_OVERLAY');
            else if (gameState === 'IBU_DIALOG') setGameState('WALK_TO_PARKING');
            else if (gameState === 'JUKIR_DIALOG') setGameState('FIGHT_CHOICE');
        }
    };

    // ==================================================
    // REF ASSET & ENTITAS
    // ==================================================
    const aryaImgRef = useRef(null);
    const ibuImgRef = useRef(null);
    const jukirImgRef = useRef(null);
    const extTilesetRef = useRef(null); // tilemap_packed.png (aspal/paving, mobil, lampu)

    // Arya (Player): HP 100, Speed 4.5 (lebih gesit)
    const playerRef = useRef({
        x: 0, y: 0, size: 72, speed: 4.5, health: 100, maxHealth: 100, facingDirection: 'down',
        isWalking: false, frameIndex: 1, frameTimer: 0, isAttacking: false, attackTimer: 0, attackCooldown: false,
    });

    // Ibu Penjaga Warung (NPC Informan)
    const ibuRef = useRef({ x: 0, y: 0, size: 72, facingDirection: 'down', frameIndex: 1, frameTimer: 0 });

    // Jukir Liar / Preman Parkir (Bos Level 3): HP 175, Speed 2.8, lempar proyektil
    const jukirRef = useRef({ x: 0, y: 0, size: 72, speed: 2.8, health: 175, maxHealth: 175, facingDirection: 'down', isWalking: false, frameIndex: 1, frameTimer: 0 });

    // Kunci motor (item objektif)
    const keyItemRef = useRef({ x: 0, y: 0, size: 34, taken: false });

    // Proyektil botol/batu
    const projectilesRef = useRef([]);
    // Timer lempar proyektil (setiap 3 detik)
    const throwTimerRef = useRef(0);

    const keysRef = useRef({});
    const initedRef = useRef(false);

    useEffect(() => {
        const handleKeyDown = (e) => { keysRef.current[e.key.toLowerCase()] = true; };
        const handleKeyUp = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Load karakter (hapus background putih) - gaya sama Level 2
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
        loadCharImage('/assets/kakek.jpg', ibuImgRef);            // Ibu Penjaga Warung
        loadCharImage('/assets/petugas_pungli.jpg', jukirImgRef); // Jukir Liar

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
            const jukir = jukirRef.current;
            const keyItem = keyItemRef.current;
            const keys = keysRef.current;
            const extTileset = extTilesetRef.current;
            const tileSize = 64;

            // ==========================================================
            // TATA LETAK MAP (Parkiran berpaving + jalan raya + ruko)
            // ==========================================================
            const lotTop = 90;                              // batas atas (dinding/roko)
            const lotBottom = H - 120;                      // batas bawah halaman parkir
            const roadY = H - 120;                          // jalan raya di bagian bawah

            // Ruko / minimarket sepanjang atas
            const shopX = W * 0.12, shopW = W * 0.76;

            // Mobil-mobil terparkir (kolisi)
            const cars = [
                { x: W * 0.20, y: H * 0.30, w: 96, h: 110 },   // mobil merah (belakang)
                { x: W * 0.42, y: H * 0.28, w: 96, h: 110 },   // mobil oranye
                { x: W * 0.64, y: H * 0.31, w: 96, h: 110 },   // mobil hijau
                { x: W * 0.82, y: H * 0.50, w: 96, h: 110 },   // mobil merah 2
            ];

            // Gerobak kaki lima (di pinggir, atas kiri)
            const gerobak = { x: W * 0.03, y: H * 0.20, w: 108, h: 70 };

            // Tiang lampu jalan
            const lamps = [
                { x: W * 0.10, y: H * 0.62 },
                { x: W * 0.55, y: H * 0.62 },
                { x: W * 0.90, y: H * 0.62 },
            ];

            // Semak (tempat preman muncul)
            const bush = { x: W * 0.14, y: H * 0.52, w: 120, h: 60 };

            const inParking = (x, y, size) => {
                return x >= 0 && x + size <= W &&
                    y >= lotTop && y + size <= lotBottom;
            };
            const onRoad = (x, y, size) => {
                return x >= 0 && x + size <= W && y >= roadY && y + size <= H;
            };
            const canWalk = (x, y, size) => inParking(x, y, size) || onRoad(x, y, size);

            // Inisialisasi posisi sekali saja
            if (!initedRef.current) {
                player.x = W * 0.5;
                player.y = H * 0.80;    // Arya mulai dari arah jalan raya
                player.health = 100;

                // Ibu warung di sudut parkiran (kanan bawah)
                ibu.x = W * 0.86;
                ibu.y = H * 0.80;

                // Jukir liar mulai di dekat motor (kiri)
                jukir.x = W * 0.16;
                jukir.y = H * 0.44;
                jukir.health = 175;

                // Kunci motor terjatuh di sudut parkiran (kiri bawah)
                keyItem.x = W * 0.08;
                keyItem.y = H * 0.66;
                keyItem.taken = false;

                initedRef.current = true;
            }

            // ==========================================================
            // RENDER MAP
            // ==========================================================
            // Aspal gelap dasar
            ctx.fillStyle = '#3b3b45';
            ctx.fillRect(0, 0, W, H);

            // Halaman parkir berpaving (area tengah)
            if (extTileset) {
                const pavingTile = { sx: 0, sy: 224, sw: 16, sh: 16 };
                for (let x = 0; x < W; x += tileSize) {
                    for (let y = lotTop; y < lotBottom; y += tileSize) {
                        ctx.drawImage(extTileset, pavingTile.sx, pavingTile.sy, pavingTile.sw, pavingTile.sh, x, y, tileSize, tileSize);
                    }
                }
                // Jalan raya bawah (aspal dengan marka)
                const roadTile = { sx: 16, sy: 272, sw: 16, sh: 16 };
                for (let x = 0; x < W; x += tileSize) {
                    for (let y = roadY; y < H; y += tileSize) {
                        ctx.drawImage(extTileset, roadTile.sx, roadTile.sy, roadTile.sw, roadTile.sh, x, y, tileSize, tileSize);
                    }
                }
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                for (let x = 24; x < W; x += 140) ctx.fillRect(x, roadY + (H - roadY) / 2 - 4, 70, 8);

                // Garis parkir (kotak-kotak) di halaman
                ctx.strokeStyle = 'rgba(255,255,255,0.35)';
                ctx.lineWidth = 3;
                for (let x = W * 0.10; x < W * 0.95; x += 130) {
                    ctx.beginPath(); ctx.moveTo(x, lotTop + 20); ctx.lineTo(x, lotBottom - 20); ctx.stroke();
                }
            }

            // Ruko / minimarket "Indoapril" (atas)
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(shopX, lotTop - 70, shopW, 70);
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(shopX, lotTop - 70, shopW, 16);
            // spanduk merah
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(shopX + 10, lotTop - 58, shopW - 20, 34);
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center';
            ctx.fillText('IND0APRIL  •  PARKIR GRATIS KHUSUS PELANGGAN', shopX + shopW / 2, lotTop - 34);
            ctx.textAlign = 'left';
            // pintu kaca
            ctx.fillStyle = '#93c5fd';
            for (let i = 0; i < 5; i++) ctx.fillRect(shopX + 40 + i * (shopW - 90) / 5, lotTop - 22, 40, 22);

            // Gerobak kaki lima
            ctx.fillStyle = '#a16207'; ctx.fillRect(gerobak.x, gerobak.y, gerobak.w, gerobak.h);
            ctx.fillStyle = '#f59e0b'; ctx.fillRect(gerobak.x, gerobak.y - 14, gerobak.w, 18);
            ctx.fillStyle = '#166534'; ctx.beginPath(); ctx.arc(gerobak.x + 20, gerobak.y - 20, 14, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 11px monospace';
            ctx.fillText('WARUNG', gerobak.x + 24, gerobak.y + 42);

            // Semak
            ctx.fillStyle = '#166534';
            ctx.beginPath(); ctx.ellipse(bush.x + bush.w / 2, bush.y + bush.h / 2, bush.w / 2, bush.h / 2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#15803d';
            ctx.beginPath(); ctx.ellipse(bush.x + 30, bush.y + 24, 30, 22, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(bush.x + 80, bush.y + 30, 34, 24, 0, 0, Math.PI * 2); ctx.fill();

            // Mobil-mobil terparkir (dari tilemap)
            if (extTileset) {
                const carSprites = [
                    { sx: 288, sy: 256, sw: 32, sh: 32 }, // merah
                    { sx: 288, sy: 224, sw: 32, sh: 32 }, // oranye
                    { sx: 344, sy: 224, sw: 24, sh: 32 }, // hijau
                    { sx: 288, sy: 256, sw: 32, sh: 32 }, // merah 2
                ];
                cars.forEach((c, i) => {
                    const sp = carSprites[i % carSprites.length];
                    ctx.drawImage(extTileset, sp.sx, sp.sy, sp.sw, sp.sh, c.x, c.y, c.w, c.h);
                });
            }

            // Tiang lampu
            lamps.forEach((l) => {
                ctx.strokeStyle = '#334155'; ctx.lineWidth = 6;
                ctx.beginPath(); ctx.moveTo(l.x, lotBottom); ctx.lineTo(l.x, l.y); ctx.stroke();
                ctx.fillStyle = '#facc15';
                ctx.beginPath(); ctx.arc(l.x, l.y, 12, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(250, 204, 21, 0.15)';
                ctx.beginPath(); ctx.arc(l.x, l.y, 40, 0, Math.PI * 2); ctx.fill();
            });

            // Kunci motor (item objektif)
            if (!keyItem.taken) {
                ctx.fillStyle = '#facc15';
                ctx.beginPath(); ctx.arc(keyItem.x + keyItem.size / 2, keyItem.y + keyItem.size / 2, keyItem.size / 2 + Math.sin(Date.now() / 200) * 3, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#0f172a'; ctx.font = 'bold 16px monospace';
                ctx.fillText('🔑', keyItem.x, keyItem.y + keyItem.size - 4);
                ctx.fillStyle = '#facc15'; ctx.font = 'bold 12px monospace';
                ctx.fillText('KUNCI MOTOR', keyItem.x - 20, keyItem.y - 10);
            }

            // ==========================================================
            // LOGIKA PERGERAKAN PEMAIN (dibatasi area parkir + jalan)
            // ==========================================================
            player.isWalking = false;

            if (gameState === 'EXPLORE' || gameState === 'WALK_TO_PARKING' || gameState === 'PLAYING') {
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

                    const blockedByObj = (bx, by) => {
                        const box = { x: bx, y: by, width: player.size, height: player.size };
                        for (const c of cars) if (rectIntersect(box, c)) return true;
                        if (rectIntersect(box, gerobak)) return true;
                        return false;
                    };

                    if (canWalk(nextX, nextY, player.size) && !blockedByObj(nextX, nextY)) {
                        player.x = nextX; player.y = nextY;
                    } else if (canWalk(nextX, player.y, player.size) && !blockedByObj(nextX, player.y)) {
                        player.x = nextX;
                    } else if (canWalk(player.x, nextY, player.size) && !blockedByObj(player.x, nextY)) {
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

            // Ambil kunci motor (objektif)
            if (!keyItem.taken && rectIntersect(player, { x: keyItem.x, y: keyItem.y, width: keyItem.size, height: keyItem.size })) {
                keyItem.taken = true;
                setHasKey(true);
                setLastActionText('🔑 Kunci motor berhasil diambil! Sekarang kamu bisa merekam preman!');
            }

            // ==========================================================
            // TRIGGER EVENT CERITA
            // ==========================================================
            if (gameState === 'EXPLORE') {
                const distToIbu = Math.hypot(player.x - ibu.x, player.y - ibu.y);
                if (distToIbu < 130) {
                    ctx.fillStyle = '#facc15'; ctx.font = 'bold 13px monospace';
                    ctx.fillText('[ Tekan E untuk Bicara dengan Ibu Warung ]', ibu.x - 120, ibu.y - 18);
                    if (keys['e']) { setDialogIndex(0); setGameState('IBU_DIALOG'); }
                }
            } else if (gameState === 'WALK_TO_PARKING') {
                // Dekati area motor/kunci -> konfrontasi preman
                const dist = Math.hypot(player.x - jukir.x, player.y - jukir.y);
                if (dist < 150) { setDialogIndex(0); setGameState('JUKIR_DIALOG'); }
            } else if (gameState === 'PLAYING') {
                // ---------------- AI JUKIR LIAR ----------------
                // Bergerak mengejar Arya (hanya di area parkir/jalan)
                const dx = player.x - jukir.x; const dy = player.y - jukir.y;
                if (Math.abs(dx) > Math.abs(dy)) { jukir.facingDirection = dx > 0 ? 'right' : 'left'; }
                else { jukir.facingDirection = dy > 0 ? 'down' : 'up'; }

                // Patroli/kejar, kecuali sedang melempar (menunggu sebentar)
                const isThrowing = throwTimerRef.current > 0 && throwTimerRef.current < 25;
                let nextJukirX = jukir.x; let nextJukirY = jukir.y;
                if (!isThrowing) {
                    jukir.isWalking = true;
                    if (jukir.x < player.x) nextJukirX += jukir.speed;
                    if (jukir.x > player.x) nextJukirX -= jukir.speed;
                    if (jukir.y < player.y) nextJukirY += jukir.speed;
                    if (jukir.y > player.y) nextJukirY -= jukir.speed;

                    const blockedJ = (bx, by) => {
                        const box = { x: bx, y: by, width: jukir.size, height: jukir.size };
                        for (const c of cars) if (rectIntersect(box, c)) return true;
                        if (rectIntersect(box, gerobak)) return true;
                        return false;
                    };
                    if (canWalk(nextJukirX, nextJukirY, jukir.size) && !blockedJ(nextJukirX, nextJukirY)) {
                        jukir.x = nextJukirX; jukir.y = nextJukirY;
                    } else {
                        if (canWalk(nextJukirX, jukir.y, jukir.size) && !blockedJ(nextJukirX, jukir.y)) jukir.x = nextJukirX;
                        if (canWalk(jukir.x, nextJukirY, jukir.size) && !blockedJ(jukir.x, nextJukirY)) jukir.y = nextJukirY;
                    }
                    jukir.frameTimer++;
                    if (jukir.frameTimer >= 8) { jukir.frameIndex = (jukir.frameIndex + 1) % 3; jukir.frameTimer = 0; }
                } else {
                    jukir.isWalking = false;
                }

                // Timer lempar proyektil tiap 3 detik (180 frame @60fps)
                throwTimerRef.current++;
                if (throwTimerRef.current >= 180) {
                    throwTimerRef.current = 0;
                    // Arah ke pemain
                    const tdx = (player.x + player.size / 2) - (jukir.x + jukir.size / 2);
                    const tdy = (player.y + player.size / 2) - (jukir.y + jukir.size / 2);
                    const len = Math.hypot(tdx, tdy) || 1;
                    projectilesRef.current.push({
                        x: jukir.x + jukir.size / 2,
                        y: jukir.y + jukir.size / 2,
                        vx: (tdx / len) * 7,
                        vy: (tdy / len) * 7,
                        life: 120,
                    });
                    setLastActionText('🍾 Preman melempar botol! Sembunyi di balik mobil!');
                }

                // Update proyektil
                projectilesRef.current = projectilesRef.current.filter((p) => {
                    p.x += p.vx; p.y += p.vy; p.life--;
                    // kolisi dengan mobil -> hilang
                    const pBox = { x: p.x - 8, y: p.y - 8, width: 16, height: 16 };
                    for (const c of cars) if (rectIntersect(pBox, c)) return false;
                    if (rectIntersect(pBox, gerobak)) return false;
                    // kena pemain
                    if (rectIntersect(pBox, player)) {
                        player.health -= 8;
                        setPlayerHpPct(Math.max(0, (player.health / player.maxHealth) * 100));
                        setLastActionText('💥 Arya kena lemparan botol preman! (-8 HP)');
                        if (player.health <= 0) {
                            setGameState('GAMEOVER');
                            setLastActionText('Arya tumbang kena lemparan botol preman. Dompetmu dirampas di parkiran!');
                        }
                        return false;
                    }
                    return p.life > 0;
                });

                // Serangan: rekam bukti (hanya bisa jika kunci sudah diambil)
                if (player.attackTimer > 0) {
                    player.attackTimer--; if (player.attackTimer <= 0) player.isAttacking = false;
                }

                const triggerAttack = () => {
                    if (!player.isAttacking && !player.attackCooldown) {
                        if (!keyItem.taken) {
                            setLastActionText('🔒 Ambil dulu Kunci Motor di sudut parkiran sebelum melawan!');
                            return;
                        }
                        player.isAttacking = true; player.attackTimer = 18; player.attackCooldown = true;
                        const beam = getHpBeamRect(player);
                        if (rectIntersect(beam, jukir)) {
                            jukir.health -= 25; setLastActionText('📱 Aksi pemalakan terekam! Preman mulai panik! (-25 HP)');
                            setBossHpPct(Math.max(0, (jukir.health / jukir.maxHealth) * 100));
                            if (jukir.health <= 0) {
                                setGameState('VICTORY');
                                setLastActionText('Preman berkedok juru parkir berhasil kamu viralkan! Polisi datang mengamankan si Bang Jago.');
                            }
                        } else {
                            setLastActionText('📱 Arya merekam... (arahkan tepat ke arah preman!)');
                        }
                        setTimeout(() => { player.attackCooldown = false; }, 300);
                    }
                };

                if (keys['f'] || keys[' ']) triggerAttack();

                // Kontak fisik dengan preman
                if (rectIntersect(player, jukir)) {
                    player.health -= 0.6;
                    setPlayerHpPct(Math.max(0, (player.health / player.maxHealth) * 100));
                    if (player.health <= 0) {
                        setGameState('GAMEOVER');
                        setLastActionText('Arya terdesak oleh preman di parkiran!');
                    }
                }
            }

            // ==========================================================
            // RENDER PROYEKTIL
            // ==========================================================
            projectilesRef.current.forEach((p) => {
                ctx.fillStyle = '#16a34a';
                ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#bbf7d0';
                ctx.beginPath(); ctx.arc(p.x - 3, p.y - 3, 3, 0, Math.PI * 2); ctx.fill();
            });

            // ==========================================================
            // RENDER SPRITES (gaya Level 2: label putih)
            // ==========================================================
            renderSpriteSheet(ctx, ibuImgRef.current, ibu, 'Ibu Warung');

            if (gameState === 'JUKIR_DIALOG' || gameState === 'FIGHT_CHOICE' || gameState === 'PLAYING') {
                renderSpriteSheet(ctx, jukirImgRef.current, jukir, 'Jukir Liar');
            }

            renderSpriteSheet(ctx, aryaImgRef.current, player, 'Arya');

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
        const canvas = canvasRef.current;
        const W = canvas ? canvas.width : 1200;
        const H = canvas ? canvas.height : 720;

        playerRef.current = { ...playerRef.current, x: W * 0.5, y: H * 0.80, health: 100, isWalking: false, facingDirection: 'down', frameIndex: 1 };
        jukirRef.current = { ...jukirRef.current, x: W * 0.16, y: H * 0.44, health: 175, isWalking: false, facingDirection: 'down', frameIndex: 1 };
        keyItemRef.current = { ...keyItemRef.current, x: W * 0.08, y: H * 0.66, taken: false };
        projectilesRef.current = [];
        throwTimerRef.current = 0;
        setPlayerMoney(100000); setBossHpPct(100); setPlayerHpPct(100); setHasKey(false);
        setDialogIndex(0); setLastActionText('');
        setGameState('EXPLORE');
    };

    const handleSurrender = () => {
        const denda = 20000; setPlayerMoney((prev) => Math.max(0, prev - denda));
        setGameState('GAMEOVER');
        setLastActionText(`Kamu memilih membayar Rp ${denda.toLocaleString('id-ID')} ke preman parkir. Uang makanmu habis demi "uang keamanan" palsu.`);
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
            if (entity.facingDirection === 'down') row = 0;
            if (entity.facingDirection === 'left') row = 1;
            if (entity.facingDirection === 'right') row = 2;
            if (entity.facingDirection === 'up') row = 3;
            ctx.drawImage(img, entity.frameIndex * frameW, row * frameH, frameW, frameH, entity.x, entity.y, entity.size, entity.size * 1.15);
        } else {
            ctx.fillStyle = label === 'Arya' ? '#22c55e' : label === 'Jukir Liar' ? '#ef4444' : '#f59e0b';
            ctx.fillRect(entity.x, entity.y, entity.size, entity.size);
        }

        if (entity.health !== undefined) {
            const pct = Math.max(0, entity.health / entity.maxHealth); const barW = entity.size + 10, barH = 5;
            ctx.fillStyle = '#ef4444'; ctx.fillRect(entity.x - (barW - entity.size) / 2, entity.y - 10, barW, barH);
            ctx.fillStyle = label === 'Arya' ? '#22c55e' : '#facc15'; ctx.fillRect(entity.x - (barW - entity.size) / 2, entity.y - 10, barW * pct, barH);
        }

        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 12px monospace'; const textW = ctx.measureText(label).width;
        ctx.fillText(label, entity.x + (entity.size - textW) / 2, entity.y - 16);
    };

    const activeDialogs = getActiveDialogs();

    return (
        <div className="relative w-screen h-screen bg-neutral-950 text-white font-mono select-none overflow-hidden">
            {/* HUD HEADER */}
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between bg-neutral-900/90 border border-neutral-700 px-5 py-3 rounded-xl shadow-xl backdrop-blur">
                <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-orange-500/25 border border-orange-500 text-orange-400 text-xs font-bold rounded-md">LEVEL 3</span>
                    <h1 className="text-sm font-bold tracking-wide text-white">SURVIVAL WNI : Palak Preman Berkedok Parkir</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`hidden sm:flex items-center gap-2 px-3 py-1 bg-neutral-800 border rounded-lg ${hasKey ? 'border-emerald-600' : 'border-neutral-600'}`}>
                        <span className="text-[10px] text-red-400 font-bold">HP ARYA</span>
                        <div className="w-20 h-2 bg-neutral-700 rounded overflow-hidden">
                            <div className="h-full bg-red-500 transition-all" style={{ width: `${playerHpPct}%` }} />
                        </div>
                    </div>
                    <div className={`px-3 py-1 text-xs font-bold rounded-lg border ${hasKey ? 'bg-emerald-950 border-emerald-600 text-emerald-400' : 'bg-neutral-800 border-neutral-600 text-neutral-400'}`}>
                        🔑 {hasKey ? 'Kunci Didapat' : 'Cari Kunci'}
                    </div>
                    {(gameState === 'PLAYING' || gameState === 'FIGHT_CHOICE') && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-red-700 rounded-lg">
                            <span className="text-[10px] text-yellow-400 font-bold">JUKIR LIAR</span>
                            <div className="w-20 h-2 bg-neutral-700 rounded overflow-hidden">
                                <div className="h-full bg-yellow-500 transition-all" style={{ width: `${bossHpPct}%` }} />
                            </div>
                        </div>
                    )}
                    <div className="px-3 py-1 bg-emerald-950 border border-emerald-600 text-emerald-400 text-xs font-bold rounded-lg">
                        💵 Rp {playerMoney.toLocaleString('id-ID')}
                    </div>
                    <button onClick={() => router.push('/menu')} className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs border border-neutral-600 rounded-lg transition cursor-pointer">← Menu</button>
                </div>
            </div>

            <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full z-0" />

            {/* DIALOG (Intro / Ibu / Jukir) */}
            {(gameState === 'STORY_INTRO' || gameState === 'IBU_DIALOG' || gameState === 'JUKIR_DIALOG') && (
                <div className={`absolute bottom-8 left-8 right-8 bg-neutral-900/95 border-2 p-6 rounded-2xl shadow-2xl backdrop-blur z-20 max-w-4xl mx-auto ${gameState === 'JUKIR_DIALOG' ? 'border-red-500' : gameState === 'IBU_DIALOG' ? 'border-amber-500' : 'border-orange-500'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <span className={`font-bold text-sm px-3 py-1 rounded ${activeDialogs[dialogIndex]?.speaker === 'Arya' ? 'bg-green-600 text-white' : activeDialogs[dialogIndex]?.speaker === 'Jukir Liar' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'}`}>
                            {activeDialogs[dialogIndex]?.speaker}
                        </span>
                        <span className="text-xs text-neutral-400 font-mono">{dialogIndex + 1} / {activeDialogs.length}</span>
                    </div>
                    <p className="text-sm text-neutral-100 italic leading-relaxed my-3 min-h-[48px]">"{activeDialogs[dialogIndex]?.text}"</p>
                    <button onClick={handleNextDialog} className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs rounded-xl border-b-4 border-orange-700 cursor-pointer tracking-widest">LANJUT ➔</button>
                </div>
            )}

            {/* MISSION OVERLAY */}
            {gameState === 'MISSION_OVERLAY' && (
                <div onClick={() => setGameState('EXPLORE')} className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 cursor-pointer text-center select-none backdrop-blur-md">
                    <div className="max-w-md bg-neutral-900 border border-neutral-700 p-8 rounded-2xl shadow-2xl space-y-5 hover:border-orange-500/50 transition-colors">
                        <div className="w-16 h-16 bg-orange-500/20 text-orange-400 border border-orange-500/40 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">🅿️</div>
                        <h2 className="text-xl font-bold text-orange-400 tracking-wider">MISI UTAMA LEVEL 3</h2>
                        <p className="text-neutral-200 text-sm leading-relaxed">Kunci motor Arya dirampas preman parkir. Temui <span className="text-yellow-400 font-bold">Ibu Warung</span> di sudut parkiran, lalu <span className="text-emerald-400 font-bold">ambil Kunci Motor</span> yang terjatuh sebelum merekam si preman!</p>
                        <div className="pt-4 border-t border-neutral-800"><p className="text-xs text-orange-300 animate-pulse font-mono font-semibold">[ Klik di mana saja untuk mulai berjalan ]</p></div>
                    </div>
                </div>
            )}

            {gameState === 'WALK_TO_PARKING' && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 p-3 bg-neutral-900/90 border border-neutral-700 rounded-xl text-center text-xs text-yellow-400 tracking-wider shadow-2xl backdrop-blur z-20">
                    Dekati motor & kunci yang jatuh di sudut parkiran!
                </div>
            )}

            {/* PILIHAN AKSI FIGHT */}
            {gameState === 'FIGHT_CHOICE' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-2xl font-bold text-orange-400 mb-2">PILIH LANGKAH ARYA!</h2>
                    <p className="text-xs text-neutral-300 max-w-lg mb-6 leading-relaxed">Ambil dulu <span className="text-yellow-400 font-bold">Kunci Motor</span> di sudut parkiran, hindari lemparan botol preman dengan bersembunyi di balik mobil, lalu rekam aksi pemalakan Rp20.000 itu!</p>
                    <div className="flex flex-col gap-4 w-full max-w-md">
                        <button onClick={() => { setGameState('PLAYING'); setBossHpPct(100); setPlayerHpPct(100); throwTimerRef.current = 0; setLastActionText('AMBIL KUNCI MOTOR DI SUDUT PARKIRAN, lalu tekan F/SPACE untuk merekam!'); }} className="py-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl border-b-4 border-blue-800 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer">
                            <span>📱</span> LAWAN & REKAM PREMAN (Bongkar Bukti)
                        </button>
                        <button onClick={handleSurrender} className="py-4 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-xl border-b-4 border-red-900 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer">
                            <span>💸</span> 🏳️ Menyerah (Bayar Rp20.000)
                        </button>
                    </div>
                </div>
            )}

            {/* VICTORY SCREEN */}
            {gameState === 'VICTORY' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-3xl font-bold text-green-400 mb-3">LEVEL 3 SELESAI! 🎉</h2>
                    <p className="text-sm text-neutral-200 max-w-md mb-6 leading-relaxed">{lastActionText}</p>
                    <button onClick={() => router.push('/shop?next=4')} className="px-8 py-3.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800 shadow-xl cursor-pointer">Lanjut ke Level 4 →</button>
                </div>
            )}

            {/* GAME OVER SCREEN */}
            {gameState === 'GAMEOVER' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-3xl font-bold text-red-500 mb-3">GAGAL & DIPALAK PREMAN!</h2>
                    <p className="text-sm text-neutral-200 max-w-md mb-6 leading-relaxed">{lastActionText}</p>
                    <div className="flex gap-4">
                        <button onClick={restartGame} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800 cursor-pointer">Coba Lagi Level 3</button>
                        <button onClick={() => router.push('/menu')} className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl border border-neutral-600 cursor-pointer">Kembali ke Menu</button>
                    </div>
                </div>
            )}

            {gameState === 'PLAYING' && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 p-3 w-full max-w-3xl bg-neutral-900/90 border border-neutral-700 rounded-xl text-center text-xs text-yellow-400 tracking-wider shadow-2xl backdrop-blur z-20">
                    {lastActionText || "Ambil Kunci Motor, hindari lemparan botol (sembunyi di balik mobil) & Tekan F/Space untuk merekam!"}
                </div>
            )}
        </div>
    );
}