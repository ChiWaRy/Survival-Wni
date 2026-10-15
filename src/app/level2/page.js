// src/app/level2/page.js
// LEVEL 2 : LOKER JALUR ORANG DALAM (ORDAL)
// Outdoor komplek PT. Maju Mundur Sentosa (gaya sama seperti Level 1)
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
    const [bossHpPct, setBossHpPct] = useState(100);
    const [playerHpPct, setPlayerHpPct] = useState(100);

    // ==================================================
    // NASKAH DIALOG LENGKAP (DARI SPEC)
    // ==================================================
    // A. Dialog Intro Level 2 (Monolog Arya)
    const introDialogs = [
        { speaker: "Arya", text: "Akhirnya surat pengantar dari kelurahan sudah di tangan. Hari ini aku ada jadwal wawancara kerja di PT. Maju Mundur Sentosa." },
        { speaker: "Arya", text: "Kakek pasti bangga kalau aku bisa diterima kerja di pabrik ini. Aku harus bertanya ke Satpam dulu di mana ruangan HRD-nya." },
    ];

    // B. Dialog Informan (Lobi - Arya & Komandan Satpam)
    const satpamDialogs = [
        { speaker: "Arya", text: "Permisi, Pak. Saya Arya, mau menghadiri panggilan wawancara kerja tahap akhir." },
        { speaker: "Komandan Satpam", text: "Oh, pelamar baru ya? Tadi hasil tes tertulis sudah ditempel, nama kamu dapat skor paling tinggi tuh." },
        { speaker: "Arya", text: "Syukurlah, Pak! Lalu saya harus menghadap ke mana sekarang?" },
        { speaker: "Komandan Satpam", text: "Langsung saja masuk ke lorong ruangan HRD di sebelah kiri sana, pintu berkarpet abu-abu. Tapi... bapak mau bisikin sesuatu, Dek." },
        { speaker: "Arya", text: "Ada apa ya, Pak?" },
        { speaker: "Komandan Satpam", text: "Hati-hati, HRD di dalam itu terkenal licik. Banyak pelamar pintar yang gagal cuma karena kalah sama 'amplop' dan titipan orang dalam. Siapkan mentalmu." },
    ];

    // C. Dialog Konfrontasi Bos (Ruang Interview - Arya & Oknum HRD)
    const hrdDialogs = [
        { speaker: "Oknum HRD", text: "Silakan masuk, Arya. Saya sudah lihat berkas dan hasil ujianmu. Nilaimu sempurna, sangat memenuhi kualifikasi pabrik kami." },
        { speaker: "Arya", text: "Terima kasih, Pak! Apakah artinya saya bisa mulai bekerja minggu depan?" },
        { speaker: "Oknum HRD", text: "Tunggu dulu, jangan buru-buru senang. Kursi operator di sini sangat terbatas, dan kebetulan ada keponakan manajer yang juga mengincar posisi ini." },
        { speaker: "Arya", text: "Tapi bukankah rekrutmen ini terbuka secara murni berdasarkan nilai tes, Pak?" },
        { speaker: "Oknum HRD", text: "Nilai tes itu cuma formalitas di atas kertas! Kalau kamu mau namamu yang saya ketik di surat kelulusan, bayar biaya 'pengamanan kursi' Rp200.000 sekarang juga sebagai tanda terima kasih ke saya." },
        { speaker: "Arya", text: "Ini pemerasan namanya, Pak! Saya melamar dengan ijazah dan keahlian yang sah. Praktik jual-beli loker Bapak ini akan saya rekam dan bongkar ke publik!" },
        { speaker: "Oknum HRD", text: "Kurang ajar! Sini kamu, saya sobek berkas lamaranmu sekarang juga!" },
    ];

    const getActiveDialogs = () => {
        if (gameState === 'STORY_INTRO') return introDialogs;
        if (gameState === 'SATPAM_DIALOG') return satpamDialogs;
        if (gameState === 'HRD_DIALOG') return hrdDialogs;
        return [];
    };

    const handleNextDialog = () => {
        const list = getActiveDialogs();
        if (dialogIndex < list.length - 1) {
            setDialogIndex(dialogIndex + 1);
        } else {
            if (gameState === 'STORY_INTRO') setGameState('MISSION_OVERLAY');
            else if (gameState === 'SATPAM_DIALOG') setGameState('WALK_TO_HRD');
            else if (gameState === 'HRD_DIALOG') setGameState('FIGHT_CHOICE');
        }
    };

    // ==================================================
    // REF ASSET & ENTITAS
    // ==================================================
    const aryaImgRef = useRef(null);
    const satpamImgRef = useRef(null);
    const hrdImgRef = useRef(null);
    const cityTilesetRef = useRef(null); // gedung.jpg
    const extTilesetRef = useRef(null);  // tilemap_packed.png (aspal)

    // Arya (Player): HP 100, Speed 4
    const playerRef = useRef({
        x: 0, y: 0, size: 72, speed: 4, health: 100, maxHealth: 100, facingDirection: 'down',
        isWalking: false, frameIndex: 1, frameTimer: 0, isAttacking: false, attackTimer: 0, attackCooldown: false,
    });

    // Komandan Satpam (NPC Informan)
    const satpamRef = useRef({ x: 0, y: 0, size: 72, facingDirection: 'down', frameIndex: 1, frameTimer: 0 });

    // Oknum HRD (Bos Level 2): HP 150, Speed 2.5, Damage 1.0/frame
    const hrdRef = useRef({ x: 0, y: 0, size: 72, speed: 2.5, health: 150, maxHealth: 150, facingDirection: 'down', isWalking: false, frameIndex: 1, frameTimer: 0 });

    const keysRef = useRef({});
    const initedRef = useRef(false);

    useEffect(() => {
        const handleKeyDown = (e) => { keysRef.current[e.key.toLowerCase()] = true; };
        const handleKeyUp = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Load karakter (hapus background putih) - sama seperti Level 1
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

        // Load gedung.jpg (hapus background hitam pekat) - sama seperti Level 1
        const loadBuildingImage = (src, ref) => {
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
                    if (data[i] < 15 && data[i + 1] < 15 && data[i + 2] < 15) data[i + 3] = 0;
                }
                tempCtx.putImageData(imgData, 0, 0);
                const processedImg = new Image();
                processedImg.src = tempCanvas.toDataURL();
                processedImg.onload = () => { ref.current = processedImg; };
            };
        };

        loadCharImage('/assets/arya.jpg', aryaImgRef);            // Arya (Player)
        loadCharImage('/assets/pak_rt.jpg', satpamImgRef);        // Komandan Satpam
        loadCharImage('/assets/petugas_pungli.jpg', hrdImgRef);   // Oknum HRD
        loadBuildingImage('/assets/gedung.jpg', cityTilesetRef);  // Gedung-gedung

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
            const satpam = satpamRef.current;
            const hrd = hrdRef.current;
            const keys = keysRef.current;
            const cityTileset = cityTilesetRef.current;
            const extTileset = extTilesetRef.current;
            const tileSize = 64;

            // ==========================================================
            // TATA LETAK JALAN (aspal) - membentuk cincin agar bisa kiting
            // ==========================================================
            const roadSideW = W * 0.12;          // lebar jalan vertikal
            const leftX = W * 0.08;              // x jalan vertikal kiri
            const rightX = W * 0.80;             // x jalan vertikal kanan
            const topY = H * 0.22;               // y jalan horizontal atas
            const topH = H * 0.12;               // tinggi jalan horizontal atas
            const botY = H * 0.45;               // y jalan horizontal bawah (utama)
            const botH = H * 0.15;               // tinggi jalan horizontal bawah
            const vertBottom = botY + botH;

            const roadSegs = [
                { x: 0, y: botY, w: W, h: botH },                                     // horizontal bawah (utama)
                { x: leftX, y: topY, w: (rightX + roadSideW) - leftX, h: topH },      // horizontal atas
                { x: leftX, y: topY, w: roadSideW, h: vertBottom - topY },            // vertikal kiri
                { x: rightX, y: topY, w: roadSideW, h: vertBottom - topY },           // vertikal kanan
            ];

            // Titik pintu masuk gedung HRD (di atas jalan utama, tengah)
            const hrdEntrance = { x: W * 0.5, y: botY };
            const hrdBuilding = { x: leftX + roadSideW, y: topY + topH, w: (rightX) - (leftX + roadSideW), h: botY - (topY + topH) };

            const isOnRoad = (x, y, size) => {
                for (const s of roadSegs) {
                    if (x >= s.x && x + size <= s.x + s.w && y >= s.y && y + size <= s.y + s.h) return true;
                }
                return false;
            };

            // Inisialisasi posisi sekali saja
            if (!initedRef.current) {
                player.x = W * 0.5;
                player.y = botY + (botH - player.size) / 2;
                player.health = 100;

                // Satpam berjaga di jalan utama, dekat pintu masuk
                satpam.x = W * 0.34;
                satpam.y = botY + (botH - satpam.size) / 2;

                // HRD muncul di jalan utama saat pertarungan
                hrd.x = W * 0.5;
                hrd.y = botY + (botH - hrd.size) / 2;
                hrd.health = 150;

                initedRef.current = true;
            }

            // ==========================================================
            // RENDER MAP OUTDOOR (gaya Level 1)
            // ==========================================================
            // Rumput hijau
            ctx.fillStyle = '#2d4c1e';
            ctx.fillRect(0, 0, W, H);

            // Jalan aspal (dari tilemap_packed.png - crop 16,272,16,16)
            if (extTileset) {
                for (const s of roadSegs) {
                    for (let x = s.x; x < s.x + s.w; x += tileSize) {
                        for (let y = s.y; y < s.y + s.h; y += tileSize) {
                            const tw = Math.min(tileSize, s.x + s.w - x);
                            const th = Math.min(tileSize, s.y + s.h - y);
                            ctx.drawImage(extTileset, 16, 272, 16, 16, x, y, tw, th);
                        }
                    }
                    // Garis marka jalan putih
                    ctx.fillStyle = 'rgba(255,255,255,0.55)';
                    if (s.w > s.h) {
                        for (let x = s.x + 16; x < s.x + s.w; x += 128) ctx.fillRect(x, s.y + s.h / 2 - 4, 64, 8);
                    } else {
                        for (let y = s.y + 16; y < s.y + s.h; y += 128) ctx.fillRect(s.x + s.w / 2 - 4, y, 8, 64);
                    }
                }
            }

            // ==========================================================
            // GEDUNG-GEDUNG (dari gedung.jpg)
            // ==========================================================
            if (cityTileset && cityTileset.naturalWidth > 0) {
                const w = cityTileset.naturalWidth;
                const h = cityTileset.naturalHeight;

                // 1. Gedung PABRIK/HRD utama (di dalam cincin jalan)
                ctx.drawImage(cityTileset, w * 0.48, 0, w * 0.52, h * 0.45,
                    hrdBuilding.x, hrdBuilding.y, hrdBuilding.w, hrdBuilding.h);

                // 2. Gedung kantor pendamping (kiri bawah, di rumput)
                ctx.drawImage(cityTileset, 0, h * 0.45, w * 0.30, h * 0.55,
                    W * 0.01, H * 0.62, W * 0.16, H * 0.32);

                // 3. Rumah/pos kecil (kanan bawah, di rumput)
                ctx.drawImage(cityTileset, 0, 0, w * 0.14, h * 0.38,
                    W * 0.86, H * 0.64, W * 0.11, H * 0.26);

                // 4. Pohon rindang tersebar di rumput
                const tree = (tx, ty, tw, th) => ctx.drawImage(cityTileset, w * 0.6, h * 0.4, w * 0.16, h * 0.3, tx, ty, tw, th);
                tree(W * 0.22, H * 0.63, W * 0.1, H * 0.16);
                tree(W * 0.68, H * 0.63, W * 0.1, H * 0.16);
                tree(W * 0.45, H * 0.05, W * 0.1, H * 0.14);
                tree(W * 0.05, H * 0.03, W * 0.1, H * 0.14);
            }

            // Pintu masuk gedung HRD (penanda)
            if (gameState === 'WALK_TO_HRD') {
                ctx.fillStyle = 'rgba(250, 204, 21, 0.85)';
                ctx.fillRect(hrdEntrance.x - 40, hrdEntrance.y - 12, 80, 20);
                ctx.fillStyle = '#0f172a'; ctx.font = 'bold 12px monospace';
                ctx.fillText('PINTU HRD', hrdEntrance.x - 34, hrdEntrance.y + 3);
            }

            // ==========================================================
            // LOGIKA PERGERAKAN PEMAIN (tertahan di aspal)
            // ==========================================================
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

                    if (isOnRoad(nextX, nextY, player.size)) {
                        player.x = nextX; player.y = nextY;
                    } else if (isOnRoad(nextX, player.y, player.size)) {
                        player.x = nextX; // geser horizontal saja (sliding)
                    } else if (isOnRoad(player.x, nextY, player.size)) {
                        player.y = nextY; // geser vertikal saja (sliding)
                    }
                }
            }

            if (player.isWalking) {
                player.frameTimer++;
                if (player.frameTimer >= 8) { player.frameIndex = (player.frameIndex + 1) % 3; player.frameTimer = 0; }
            } else {
                player.frameIndex = 1;
            }

            // ==========================================================
            // TRIGGER EVENT CERITA
            // ==========================================================
            if (gameState === 'EXPLORE_LOBBY') {
                const distToSatpam = Math.hypot(player.x - satpam.x, player.y - satpam.y);
                if (distToSatpam < 130) {
                    ctx.fillStyle = '#facc15'; ctx.font = 'bold 13px monospace';
                    ctx.fillText('[ Tekan E untuk Bertanya pada Satpam ]', satpam.x - 110, satpam.y - 18);
                    if (keys['e']) { setDialogIndex(0); setGameState('SATPAM_DIALOG'); }
                }
            } else if (gameState === 'WALK_TO_HRD') {
                const distToEntrance = Math.hypot(player.x - hrdEntrance.x, player.y - hrdEntrance.y);
                if (distToEntrance < 90) { setDialogIndex(0); setGameState('HRD_DIALOG'); }
            } else if (gameState === 'PLAYING') {
                // ---------------- AI OKNUM HRD (mengejar di aspal) ----------------
                hrd.isWalking = true;

                const dx = player.x - hrd.x; const dy = player.y - hrd.y;
                if (Math.abs(dx) > Math.abs(dy)) { hrd.facingDirection = dx > 0 ? 'right' : 'left'; }
                else { hrd.facingDirection = dy > 0 ? 'down' : 'up'; }

                let nextHrdX = hrd.x; let nextHrdY = hrd.y;
                if (hrd.x < player.x) nextHrdX += hrd.speed;
                if (hrd.x > player.x) nextHrdX -= hrd.speed;
                if (hrd.y < player.y) nextHrdY += hrd.speed;
                if (hrd.y > player.y) nextHrdY -= hrd.speed;

                if (isOnRoad(nextHrdX, nextHrdY, hrd.size)) {
                    hrd.x = nextHrdX; hrd.y = nextHrdY;
                } else {
                    if (isOnRoad(nextHrdX, hrd.y, hrd.size)) hrd.x = nextHrdX;
                    if (isOnRoad(hrd.x, nextHrdY, hrd.size)) hrd.y = nextHrdY;
                }

                hrd.frameTimer++;
                if (hrd.frameTimer >= 8) { hrd.frameIndex = (hrd.frameIndex + 1) % 3; hrd.frameTimer = 0; }

                if (player.attackTimer > 0) {
                    player.attackTimer--; if (player.attackTimer <= 0) player.isAttacking = false;
                }

                // Serangan: rekam bukti pakai kamera HP (F / Space)
                const triggerAttack = () => {
                    if (!player.isAttacking && !player.attackCooldown) {
                        player.isAttacking = true; player.attackTimer = 18; player.attackCooldown = true;
                        const beam = getHpBeamRect(player);
                        if (rectIntersect(beam, hrd)) {
                            hrd.health -= 25; setLastActionText('📱 Bukti pemerasan terekam! Mental Oknum HRD goyah! (-25 HP)');
                            setBossHpPct(Math.max(0, (hrd.health / hrd.maxHealth) * 100));
                            if (hrd.health <= 0) {
                                setGameState('VICTORY');
                                setLastActionText('Praktik jual-beli loker berhasil kamu bongkar! Oknum HRD dicopot dari jabatannya.');
                            }
                        } else {
                            setLastActionText('📱 Arya merekam aksi Oknum HRD... (arahkan tepat ke arah HRD!)');
                        }
                        setTimeout(() => { player.attackCooldown = false; }, 300);
                    }
                };

                if (keys['f'] || keys[' ']) triggerAttack();

                // Damage 1.0 / frame saat bersentuhan
                if (rectIntersect(player, hrd) && !player.isAttacking) {
                    player.health -= 1.0;
                    setPlayerHpPct(Math.max(0, (player.health / player.maxHealth) * 100));
                    setLastActionText('⚠️ Dokumen lamaranmu mau disobek Oknum HRD! Menjauhlah!');
                    if (player.health <= 0) {
                        setGameState('GAMEOVER');
                        setLastActionText('Mentalmu hancur! Kamu diusir dari perusahaan karena menolak bayar uang penempatan (Ordal).');
                    }
                }
            }

            // ==========================================================
            // RENDER SPRITES (gaya Level 1: label putih)
            // ==========================================================
            renderSpriteSheet(ctx, satpamImgRef.current, satpam, 'Satpam');

            if (gameState === 'HRD_DIALOG' || gameState === 'FIGHT_CHOICE' || gameState === 'PLAYING') {
                renderSpriteSheet(ctx, hrdImgRef.current, hrd, 'Oknum HRD');
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
        const botY = H * 0.45, botH = H * 0.15;

        playerRef.current = { ...playerRef.current, x: W * 0.5, y: botY + (botH - 72) / 2, health: 100, isWalking: false, facingDirection: 'down', frameIndex: 1 };
        hrdRef.current = { ...hrdRef.current, x: W * 0.5, y: botY + (botH - 72) / 2, health: 150, isWalking: false, facingDirection: 'down', frameIndex: 1 };
        setPlayerMoney(200000); setBossHpPct(100); setPlayerHpPct(100);
        setDialogIndex(0); setLastActionText('');
        setGameState('EXPLORE_LOBBY');
    };

    const handleSurrender = () => {
        const denda = 200000; setPlayerMoney((prev) => Math.max(0, prev - denda));
        setGameState('GAMEOVER');
        setLastActionText(`Kamu memilih membayar "uang penempatan" Rp ${denda.toLocaleString('id-ID')} ke Oknum HRD. Tabunganmu habis dan perusahaan ini terbukti toxic!`);
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
            ctx.fillStyle = label === 'Arya' ? '#22c55e' : label === 'Oknum HRD' ? '#ef4444' : '#3b82f6';
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
                    <span className="px-3 py-1 bg-blue-500/25 border border-blue-500 text-blue-400 text-xs font-bold rounded-md">LEVEL 2</span>
                    <h1 className="text-sm font-bold tracking-wide text-white">SURVIVAL WNI : Loker Jalur Orang Dalam</h1>
                </div>
                <div className="flex items-center gap-3">
                    {/* HP Arya */}
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-neutral-600 rounded-lg">
                        <span className="text-[10px] text-red-400 font-bold">HP ARYA</span>
                        <div className="w-20 h-2 bg-neutral-700 rounded overflow-hidden">
                            <div className="h-full bg-red-500 transition-all" style={{ width: `${playerHpPct}%` }} />
                        </div>
                    </div>
                    {/* HP Bos */}
                    {(gameState === 'PLAYING' || gameState === 'FIGHT_CHOICE') && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-red-700 rounded-lg">
                            <span className="text-[10px] text-yellow-400 font-bold">OKNUM HRD</span>
                            <div className="w-20 h-2 bg-neutral-700 rounded overflow-hidden">
                                <div className="h-full bg-yellow-500 transition-all" style={{ width: `${bossHpPct}%` }} />
                            </div>
                        </div>
                    )}
                    <div className="px-3 py-1 bg-emerald-950 border border-emerald-600 text-emerald-400 text-xs font-bold rounded-lg">
                        💵 Rp {playerMoney.toLocaleString('id-ID')}
                    </div>
                    <button onClick={() => router.push('/game')} className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs border border-neutral-600 rounded-lg transition cursor-pointer">← Kembali</button>
                </div>
            </div>

            <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full z-0" />

            {/* DIALOG (Intro / Satpam / HRD) */}
            {(gameState === 'STORY_INTRO' || gameState === 'SATPAM_DIALOG' || gameState === 'HRD_DIALOG') && (
                <div className={`absolute bottom-8 left-8 right-8 bg-neutral-900/95 border-2 p-6 rounded-2xl shadow-2xl backdrop-blur z-20 max-w-4xl mx-auto ${gameState === 'HRD_DIALOG' ? 'border-red-500' : gameState === 'SATPAM_DIALOG' ? 'border-slate-500' : 'border-blue-500'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <span className={`font-bold text-sm px-3 py-1 rounded ${activeDialogs[dialogIndex]?.speaker === 'Arya' ? 'bg-green-600 text-white' : activeDialogs[dialogIndex]?.speaker === 'Oknum HRD' ? 'bg-red-600 text-white' : 'bg-slate-600 text-white'}`}>
                            {activeDialogs[dialogIndex]?.speaker}
                        </span>
                        <span className="text-xs text-neutral-400 font-mono">{dialogIndex + 1} / {activeDialogs.length}</span>
                    </div>
                    <p className="text-sm text-neutral-100 italic leading-relaxed my-3 min-h-[48px]">"{activeDialogs[dialogIndex]?.text}"</p>
                    <button onClick={handleNextDialog} className="w-full py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs rounded-xl border-b-4 border-blue-700 cursor-pointer tracking-widest">LANJUT ➔</button>
                </div>
            )}

            {/* MISSION OVERLAY */}
            {gameState === 'MISSION_OVERLAY' && (
                <div onClick={() => setGameState('EXPLORE_LOBBY')} className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 cursor-pointer text-center select-none backdrop-blur-md">
                    <div className="max-w-md bg-neutral-900 border border-neutral-700 p-8 rounded-2xl shadow-2xl space-y-5 hover:border-blue-500/50 transition-colors">
                        <div className="w-16 h-16 bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">🏭</div>
                        <h2 className="text-xl font-bold text-blue-400 tracking-wider">MISI UTAMA LEVEL 2</h2>
                        <p className="text-neutral-200 text-sm leading-relaxed">Arya baru tiba di komplek PT. Maju Mundur Sentosa untuk wawancara. Temui <span className="text-yellow-400 font-bold">Komandan Satpam</span> di jalan aspal untuk menanyakan letak ruangan HRD.</p>
                        <div className="pt-4 border-t border-neutral-800"><p className="text-xs text-blue-300 animate-pulse font-mono font-semibold">[ Klik di mana saja untuk mulai berjalan ]</p></div>
                    </div>
                </div>
            )}

            {gameState === 'WALK_TO_HRD' && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 p-3 bg-neutral-900/90 border border-neutral-700 rounded-xl text-center text-xs text-yellow-400 tracking-wider shadow-2xl backdrop-blur z-20">
                    Ikuti jalan aspal menuju Pintu HRD (gedung utama)!
                </div>
            )}

            {/* PILIHAN AKSI FIGHT */}
            {gameState === 'FIGHT_CHOICE' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-2xl font-bold text-blue-400 mb-2">PILIH LANGKAH ARYA!</h2>
                    <p className="text-xs text-neutral-300 max-w-lg mb-6 leading-relaxed">Oknum HRD mencoba merampas dan menyobek dokumenmu! Hindari dia dan rekam bukti pemerasan Rp200.000 ini dengan HP-mu sebelum berkasmu hancur!</p>
                    <div className="flex flex-col gap-4 w-full max-w-md">
                        <button onClick={() => { setGameState('PLAYING'); setBossHpPct(100); setPlayerHpPct(100); setLastActionText('GUNAKAN WASD UNTUK MENGHINDAR DI JALAN & TEKAN F/SPACE UNTUK MEREKAM!'); }} className="py-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl border-b-4 border-blue-800 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer">
                            <span>📱</span> LAWAN DENGAN KAMERA (Bongkar Bukti Ordal)
                        </button>
                        <button onClick={handleSurrender} className="py-4 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-xl border-b-4 border-red-900 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer">
                            <span>💸</span> 🏳️ Menyerah (Bayar Uang Penempatan Rp200.000)
                        </button>
                    </div>
                </div>
            )}

            {/* VICTORY SCREEN */}
            {gameState === 'VICTORY' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-3xl font-bold text-green-400 mb-3">LEVEL 2 SELESAI! 🎉</h2>
                    <p className="text-sm text-neutral-200 max-w-md mb-6 leading-relaxed">{lastActionText}</p>
                    <button onClick={() => router.push('/shop?next=3')} className="px-8 py-3.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800 shadow-xl cursor-pointer">Lanjut ke Level 3 →</button>
                </div>
            )}

            {/* GAME OVER SCREEN */}
            {gameState === 'GAMEOVER' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-3xl font-bold text-red-500 mb-3">GAGAL MENDAPAT PEKERJAAN!</h2>
                    <p className="text-sm text-neutral-200 max-w-md mb-6 leading-relaxed">{lastActionText}</p>
                    <div className="flex gap-4">
                        <button onClick={restartGame} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800 cursor-pointer">Coba Lagi Level 2</button>
                        <button onClick={() => router.push('/menu')} className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl border border-neutral-600 cursor-pointer">Kembali ke Menu</button>
                    </div>
                </div>
            )}

            {gameState === 'PLAYING' && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 p-3 w-full max-w-3xl bg-neutral-900/90 border border-neutral-700 rounded-xl text-center text-xs text-yellow-400 tracking-wider shadow-2xl backdrop-blur z-20">
                    {lastActionText || "Arahkan Arya (WASD) menjauhi Oknum HRD & Tekan F/Space untuk merekam bukti!"}
                </div>
            )}
        </div>
    );
}