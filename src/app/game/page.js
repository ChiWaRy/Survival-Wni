// src/app/game/page.js
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSaveData, getEffectiveStats, setPlayerHp, completeLevel } from '../../lib/gameData';
import { loadSpriteWithTransparentBg, loadImage } from '../../utils/assetLoader';
import { rectIntersect, spawnFromPercent, clamp } from '../../utils/collision';

export default function GamePage() {
    const router = useRouter();
    const canvasRef = useRef(null);

    const [gameState, setGameState] = useState('EXPLORE_HOUSE');
    const [dialogIndex, setDialogIndex] = useState(0);
    const [playerMoney, setPlayerMoney] = useState(200000);
    const [lastActionText, setLastActionText] = useState('');

    const introDialogs = [
        { speaker: "Kakek", text: "Arya, duduk sebentar... Kakek mau cerita sedikit. Dulu pas masa muda, Kakek selalu percaya kalau kerja keras dan kejujuran itu cukup buat bertahan hidup." },
        { speaker: "Arya", text: "Terus kenapa Kakek malah diberhentikan dari pekerjaan Kakek yang dulu?" },
        { speaker: "Kakek", text: "Karena Kakek menolak ikut arus. Saat yang lain main belakang dan pungli, Kakek tetap lurus. Akibatnya? Kakek tersingkir. Zaman sekarang, kejujuran sering dianggap beban." },
        { speaker: "Arya", text: "Jadi... kita harus menyerah gitu aja sama keadaan sekarang, Kek?" },
        { speaker: "Kakek", text: "Bukan menyerah, Arya. Ingat pesan Kakek: Jalan lurus itu memang terjal dan sepi, tapi itu satu-satunya jalan yang bikin kamu bisa tidur tenang. Jangan pernah gadaikan harga dirimu demi jalan pintas." },
        { speaker: "Arya", text: "Iya, Kek. Arya bakal ingat terus pesan Kakek." }
    ];

    const handleNextGrandpaDialog = () => {
        if (dialogIndex < introDialogs.length - 1) setDialogIndex(dialogIndex + 1);
        else setGameState('MISSION_OVERLAY');
    };

    const aryaImgRef = useRef(null);
    const kakekImgRef = useRef(null);
    const pakRtImgRef = useRef(null);
    const enemyImgRef = useRef(null);
    const tilesetImgRef = useRef(null);
    const extTilesetImgRef = useRef(null);
    const cityTilesetRef = useRef(null);

    const playerRef = useRef({
        x: 0, y: 0, size: 72, speed: 4, health: 100, maxHealth: 100, facingDirection: 'down',
        isWalking: false, frameIndex: 0, frameTimer: 0, isAttacking: false, attackTimer: 0, attackCooldown: false,
    });

    const kakekRef = useRef({ x: 0, y: 0, size: 72, facingDirection: 'right', frameIndex: 1, frameTimer: 0 });
    const pakRtRef = useRef({ x: 550, y: 330, size: 72, facingDirection: 'down', frameIndex: 1, frameTimer: 0 });
    const enemyRef = useRef({ x: 950, y: 330, size: 72, speed: 2, health: 100, maxHealth: 100, facingDirection: 'left', isWalking: false, frameIndex: 0, frameTimer: 0 });
    const keysRef = useRef({});

    useEffect(() => {
        const handleKeyDown = (e) => { keysRef.current[e.key.toLowerCase()] = true; };
        const handleKeyUp = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Tileset dimuat apa adanya (background asli dipertahankan).
        loadImage('/assets/tileset_interior.png', tilesetImgRef);
        loadImage('/assets/tilemap_packed.png', extTilesetImgRef);

        // Karakter: buang background PUTIH.
        loadSpriteWithTransparentBg('/assets/arya.jpg', aryaImgRef);
        loadSpriteWithTransparentBg('/assets/kakek.jpg', kakekImgRef);
        loadSpriteWithTransparentBg('/assets/pak_rt.jpg', pakRtImgRef);
        loadSpriteWithTransparentBg('/assets/petugas_pungli.jpg', enemyImgRef);

        // Gedung: buang background HITAM pekat.
        loadSpriteWithTransparentBg('/assets/gedung.jpg', cityTilesetRef, { background: 'black' });

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

            // Spawn aman berbasis persentase (anti "zona mati" saat resize).
            // Sebelumnya dipatok startY + 320, yang bisa jatuh ke luar area jalan
            // ketika tinggi layar kecil. Sekarang: x = 30% lebar, y = 62% tinggi,
            // lalu di-clamp ke dalam ruang rumah agar selalu valid.
            const houseW = 740, houseH = 480;
            const startX = (canvas.width - houseW) / 2, startY = (canvas.height - houseH) / 2;
            const houseBounds = {
                left: startX + 20,
                top: startY + 110,
                right: startX + houseW - 20,
                bottom: startY + houseH - 14,
            };

            if (playerRef.current.x === 0) {
                const p = spawnFromPercent(canvas, { xPct: 0.3, yPct: 0.62, size: 72, bounds: houseBounds });
                playerRef.current.x = p.x;
                playerRef.current.y = p.y;
            }
            if (kakekRef.current.x === 0) {
                kakekRef.current.x = startX + 150;
                kakekRef.current.y = startY + 190;
            }
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Band saling tumpang-tindih (overlap) sehingga tidak ada celah setinggi badan.
// Referensi desain 1200x720: main road y≈320 (0.44H), tinggi≈192 (0.27H).
        const roadBands = () => {
            const W = canvas.width, H = canvas.height;
            const mainY = H * 0.44;
            const mainH = Math.max(120, H * 0.27);
            const mainBottom = mainY + mainH; // ≈ H * 0.71
            return [
                { x: 0,   y: mainY, width: W,   height: mainH },                 // jalan utama
                { x: 50,  y: mainY, width: 192, height: Math.max(60, H - mainY) }, // jalan kiri (overlap)
                { x: 750, y: 0,     width: 192, height: Math.max(60, mainBottom) }, // jalan kanan (overlap)
            ];
        };

        const isOnRoad = (x, y, size) => roadBands().some((s) => (
            x >= s.x && x + size <= s.x + s.width && y >= s.y && y + size <= s.y + s.height
        ));

        let animationFrameId;

        const gameLoop = () => {
            const player = playerRef.current; const kakek = kakekRef.current; const pakRt = pakRtRef.current; const enemy = enemyRef.current;
            const keys = keysRef.current;
            const tileset = tilesetImgRef.current; const extTileset = extTilesetImgRef.current; const cityTileset = cityTilesetRef.current;
            const houseW = 740, houseH = 480;
            const startX = (canvas.width - houseW) / 2, startY = (canvas.height - houseH) / 2;

            if (gameState === 'EXPLORE_HOUSE' || gameState === 'GRANDPA_DIALOG' || gameState === 'WALK_TO_DOOR') {
                ctx.fillStyle = '#09090b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#78350f'; ctx.fillRect(startX, startY + 110, houseW, houseH - 110);
                ctx.strokeStyle = '#451a03'; ctx.lineWidth = 2;
                for (let y = startY + 110; y < startY + houseH; y += 32) { ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(startX + houseW, y); ctx.stroke(); }
                for (let x = startX; x < startX + houseW; x += 64) {
                    for (let y = startY + 110; y < startY + houseH; y += 32) { ctx.beginPath(); ctx.moveTo(x + ((y / 32) % 2 === 0 ? 0 : 32), y); ctx.lineTo(x + ((y / 32) % 2 === 0 ? 0 : 32), y + 32); ctx.stroke(); }
                }
                ctx.fillStyle = '#fef3c7'; ctx.fillRect(startX, startY, houseW, 110);
                ctx.fillStyle = '#451a03'; ctx.fillRect(startX, startY, houseW, 16); ctx.fillRect(startX, startY + 98, houseW, 12); ctx.fillRect(startX, startY, 16, houseH); ctx.fillRect(startX + houseW - 16, startY, 16, houseH);

                if (tileset) {
                    ctx.drawImage(tileset, 0, 80, 80, 80, startX + 340, startY + 135, 190, 185);
                    ctx.drawImage(tileset, 128, 0, 32, 40, startX + 390, startY + 20, 70, 75);
                    ctx.drawImage(tileset, 128, 128, 48, 40, startX + 380, startY + 16, 90, 85);
                    ctx.drawImage(tileset, 80, 80, 48, 80, startX + 370, startY + 120, 120, 165);
                    ctx.drawImage(tileset, 176, 48, 48, 48, startX + 60, startY + 130, 110, 100);
                    ctx.drawImage(tileset, 176, 112, 48, 64, startX + 580, startY + 105, 55, 120);
                    ctx.drawImage(tileset, 208, 224, 16, 16, startX + 210, startY + 160, 35, 40);
                }

                const doorW = 90, doorX = startX + 170, doorY = startY + houseH - 14;
                ctx.fillStyle = '#b45309'; ctx.fillRect(doorX, doorY, doorW, 14);
                ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 2; ctx.strokeRect(doorX, doorY, doorW, 14);

                if (gameState === 'WALK_TO_DOOR') {
                    ctx.fillStyle = '#facc15'; ctx.font = 'bold 12px monospace'; ctx.fillText('🚪 PINTU KELUAR', doorX - 5, doorY - 12);
                }

            } else {
                ctx.fillStyle = '#2d4c1e'; ctx.fillRect(0, 0, canvas.width, canvas.height);

                if (extTileset) {
                    const tileSize = 64;
                    const drawRoadBlock = (rx, ry, rw, rh) => {
                        for (let x = rx; x < rx + rw; x += tileSize) {
                            for (let y = ry; y < ry + rh; y += tileSize) {
                                ctx.drawImage(extTileset, 16, 272, 16, 16, x, y, tileSize, tileSize);
                            }
                        }
                    };
                    // Ukuran band jalan berbasis persentase canvas (sinkron dengan roadBands()).
                // Referensi desain 1200x720: main road y≈320 (0.44H), tinggi≈192 (0.27H).
                const mainY = H * 0.44;
                const mainH = Math.max(120, H * 0.27);
                const mainBottom = mainY + mainH; // ≈ H * 0.71

                // Gambar tiga segmen jalan (overlap -> tidak ada celah).
                drawRoadBlock(0, mainY, canvas.width, mainH);                     // jalan utama
                drawRoadBlock(50, mainBottom, 192, canvas.height - mainBottom);   // jalan kiri
                drawRoadBlock(750, 0, 192, mainBottom);                           // jalan kanan

                // Garis marka jalan putih
                ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
                // marka horizontal (tengah jalan utama)
                for (let x = 0; x < canvas.width; x += 128) {
                    ctx.fillRect(x + 32, mainY + mainH / 2 - 4, 64, 8);
                }
                // marka vertikal (tengah jalan kiri & kanan)
                for (let y = mainBottom; y < canvas.height; y += 128) {
                    ctx.fillRect(50 + 96 - 4, y, 8, 64);
                }
                for (let y = 0; y < mainBottom; y += 128) {
                    ctx.fillRect(750 + 96 - 4, y, 8, 64);
                }
                }

                // ========================================================
                // RENDER GAMBAR GEDUNG BARU (DARI PINTEREST / DEVIANTART)
                // Menggunakan rumus presentase Crop agar akurat 100%!
                // ========================================================
                if (cityTileset && cityTileset.naturalWidth > 0) {
                    const w = cityTileset.naturalWidth;
                    const h = cityTileset.naturalHeight;

                    // 1. KANTOR KELURAHAN (Gedung Bata Besar) -> Pojok Kanan Atas
                    // Crop dari X:48%, Y:0%, W:52%, H:45%
                    ctx.drawImage(cityTileset, w * 0.48, 0, w * 0.52, h * 0.45, 960, 20, 380, 280);

                    // 2. APARTEMEN (Gedung Abu-abu) -> Kiri Bawah
                    // Crop dari X:0%, Y:45%, W:48%, H:55%
                    ctx.drawImage(cityTileset, 0, h * 0.45, w * 0.48, h * 0.55, 280, 530, 250, 300);

                    // 3. RUMAH KAKEK (Rumah Bata Kecil) -> Tengah Atas
                    // Crop dari X:0%, Y:0%, W:14%, H:38%
                    ctx.drawImage(cityTileset, 0, 0, w * 0.14, h * 0.38, 300, 100, 110, 200);

                    // 4. POHON RINDANG -> Tersebar di taman
                    // Crop dari X:60%, Y:40%, W:16%, H:30% (Pohon Besar)
                    ctx.drawImage(cityTileset, w * 0.6, h * 0.4, w * 0.16, h * 0.3, 450, 150, 100, 130); // Sebelah rumah kakek
                    ctx.drawImage(cityTileset, w * 0.6, h * 0.4, w * 0.16, h * 0.3, 80, 120, 100, 130);  // Kiri atas
                    ctx.drawImage(cityTileset, w * 0.6, h * 0.4, w * 0.16, h * 0.3, 600, 600, 100, 130); // Kanan bawah
                }

                // Area Tanda Tanah Lahan Kakek (Tepat di bawah/depan Rumah Kakek)
                const yardW = 160, yardX = 275, yardY = 280;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.fillRect(yardX, yardY, yardW, 35);
                ctx.strokeStyle = 'rgba(250, 204, 21, 0.6)';
                ctx.setLineDash([4, 4]); ctx.lineWidth = 1; ctx.strokeRect(yardX, yardY, yardW, 35); ctx.setLineDash([]);
                ctx.fillStyle = '#facc15'; ctx.font = 'bold 11px monospace';
                ctx.fillText('📍 Rumah Kakek', yardX + 35, yardY + 22);
            }

            player.isWalking = false;

            if (gameState === 'EXPLORE_HOUSE' || gameState === 'WALK_TO_DOOR' || gameState === 'EXPLORE_RT' || gameState === 'PLAYING') {
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

                    if (gameState === 'EXPLORE_HOUSE' || gameState === 'WALK_TO_DOOR') {
                        if (nextX < startX + 20 || nextX > startX + houseW - player.size - 20) canMove = false;
                        if (nextY < startY + 110) canMove = false;
                        if (nextY > startY + houseH - player.size - 14) {
                            const doorW = 90, doorX = startX + 170;
                            if (!(nextX >= doorX - 10 && nextX <= doorX + doorW - 10)) canMove = false;
                        }
                        const bedBox = { x: startX + 370, y: startY + 120, width: 120, height: 165 };
                        const tableBox = { x: startX + 60, y: startY + 130, width: 110, height: 100 };
                        const shelfBox = { x: startX + 580, y: startY + 105, width: 55, height: 120 };
                        const potBox = { x: startX + 210, y: startY + 160, width: 35, height: 40 };
                        const grandpaBox = { x: kakek.x, y: kakek.y, width: kakek.size, height: kakek.size };
                        const playerBox = { x: nextX, y: nextY, width: player.size, height: player.size };
                        if (rectIntersect(playerBox, bedBox) || rectIntersect(playerBox, tableBox) || rectIntersect(playerBox, shelfBox) || rectIntersect(playerBox, potBox) || rectIntersect(playerBox, grandpaBox)) {
                            canMove = false;
                        }
                    } else {
                        if (!isOnRoad(nextX, nextY, player.size)) canMove = false;
                    }

                    if (canMove) { player.x = nextX; player.y = nextY; }
                }
            }

            if (player.isWalking) {
                player.frameTimer++;
                if (player.frameTimer >= 8) { player.frameIndex = (player.frameIndex + 1) % 3; player.frameTimer = 0; }
            } else {
                player.frameIndex = 1;
            }

            if (gameState === 'EXPLORE_HOUSE') {
                const distToGrandpa = Math.hypot(player.x - kakek.x, player.y - kakek.y);
                if (distToGrandpa < 90 && keys['e']) setGameState('GRANDPA_DIALOG');
            } else if (gameState === 'WALK_TO_DOOR') {
                const doorY = startY + houseH - 22;
                if (player.y >= doorY) {
                    // Keluar rumah -> spawn ke jalan utama pakai persentase (aman di semua resolusi).
                    const mainY = H * 0.44;
                    const mainH = Math.max(120, H * 0.27);
                    const sp = spawnFromPercent(canvas, {
                        xPct: 0.5,
                        yPct: (mainY + mainH / 2) / H,
                        size: player.size,
                    });
                    player.x = sp.x;
                    player.y = clamp(sp.y, mainY + 4, mainY + mainH - player.size - 4);
                    setGameState('EXPLORE_RT');
                }
            } else if (gameState === 'EXPLORE_RT') {
                const distToRt = Math.hypot(player.x - pakRt.x, player.y - pakRt.y);
                if (distToRt < 90 && keys['e']) setGameState('RT_DIALOG');
            } else if (gameState === 'PUNGLI_APPROACH') {
                enemy.isWalking = true; enemy.facingDirection = 'left';
                const targetX = player.x + 90;
                if (enemy.x > targetX) {
                    enemy.x -= enemy.speed * 1.5; enemy.frameTimer++;
                    if (enemy.frameTimer >= 8) { enemy.frameIndex = (enemy.frameIndex + 1) % 3; enemy.frameTimer = 0; }
                } else {
                    enemy.isWalking = false; enemy.frameIndex = 1; setGameState('ENEMY_DIALOG');
                }
            } else if (gameState === 'PLAYING') {
                enemy.isWalking = true;
                const dx = player.x - enemy.x; const dy = player.y - enemy.y;
                if (Math.abs(dx) > Math.abs(dy)) { enemy.facingDirection = dx > 0 ? 'right' : 'left'; } else { enemy.facingDirection = dy > 0 ? 'down' : 'up'; }

                let nextEnemyX = enemy.x; let nextEnemyY = enemy.y;
                if (enemy.x < player.x) nextEnemyX += enemy.speed;
                if (enemy.x > player.x) nextEnemyX -= enemy.speed;
                if (enemy.y < player.y) nextEnemyY += enemy.speed;
                if (enemy.y > player.y) nextEnemyY -= enemy.speed;

                if (isOnRoad(nextEnemyX, nextEnemyY, enemy.size)) {
                    enemy.x = nextEnemyX; enemy.y = nextEnemyY;
                } else {
                    if (isOnRoad(nextEnemyX, enemy.y, enemy.size)) enemy.x = nextEnemyX;
                    if (isOnRoad(enemy.x, nextEnemyY, enemy.size)) enemy.y = nextEnemyY;
                }

                enemy.frameTimer++;
                if (enemy.frameTimer >= 8) { enemy.frameIndex = (enemy.frameIndex + 1) % 3; enemy.frameTimer = 0; }

                if (player.attackTimer > 0) {
                    player.attackTimer--; if (player.attackTimer <= 0) player.isAttacking = false;
                }

                const triggerAttack = () => {
                    if (!player.isAttacking && !player.attackCooldown) {
                        player.isAttacking = true; player.attackTimer = 18; player.attackCooldown = true;
                        const beam = getHpBeamRect(player);
                        if (rectIntersect(beam, enemy)) {
                            enemy.health -= 25; setLastActionText('📱 Sinar HP Arya mengenai Oknum Pungli! (-25 HP)');
                            if (enemy.health <= 0) { setGameState('VICTORY'); setLastActionText('Aksi Pungli berhasil kamu viralkan! Oknum Pungli kabur ketakutan.'); }
                        } else {
                            setLastActionText('📱 Arya merekam aksi pungli!');
                        }
                        setTimeout(() => { player.attackCooldown = false; }, 300);
                    }
                };

                if (keys['f'] || keys[' ']) triggerAttack();

                if (rectIntersect(player, enemy) && !player.isAttacking) {
                    player.health -= 0.8; setLastActionText('⚠️ Kamu tersudut oleh Oknum Pungli!');
                    if (player.health <= 0) { setGameState('GAMEOVER'); setLastActionText('Nyawa perjuanganmu habis! Berkas izin kerjamu ditahan...'); }
                }
            }

            if (gameState === 'EXPLORE_HOUSE' || gameState === 'GRANDPA_DIALOG' || gameState === 'WALK_TO_DOOR') {
                renderSpriteSheet(ctx, kakekImgRef.current, kakek, 'Kakek');
            } else {
                renderSpriteSheet(ctx, pakRtImgRef.current, pakRt, 'Pak RT');
                renderSpriteSheet(ctx, enemyImgRef.current, enemy, 'Oknum Pungli');
            }

            renderSpriteSheet(ctx, aryaImgRef.current, player, 'Arya');

            if (player.isAttacking) {
                const beam = getHpBeamRect(player);
                ctx.fillStyle = 'rgba(250, 204, 21, 0.45)'; ctx.fillRect(beam.x, beam.y, beam.width, beam.height);
                ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.strokeRect(beam.x, beam.y, beam.width, beam.height);
            }

            if (gameState === 'EXPLORE_HOUSE') {
                const distToGrandpa = Math.hypot(player.x - kakek.x, player.y - kakek.y);
                if (distToGrandpa < 90) { ctx.fillStyle = '#facc15'; ctx.font = 'bold 13px monospace'; ctx.fillText('[ Tekan E untuk Bicara dengan Kakek ]', kakek.x - 90, kakek.y - 15); }
            } else if (gameState === 'WALK_TO_DOOR') {
                ctx.fillStyle = '#facc15'; ctx.font = 'bold 13px monospace'; ctx.fillText('🚶 Berjalanlah ke Pintu Keluar di bawah!', startX + 220, startY + 450);
            } else if (gameState === 'EXPLORE_RT') {
                const distToRt = Math.hypot(player.x - pakRt.x, player.y - pakRt.y);
                if (distToRt < 90) { ctx.fillStyle = '#facc15'; ctx.font = 'bold 13px monospace'; ctx.fillText('[ Tekan E untuk Bicara dengan Pak RT ]', pakRt.x - 120, pakRt.y - 45); }
            }

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        gameLoop();

        return () => { window.removeEventListener('resize', resizeCanvas); cancelAnimationFrame(animationFrameId); };
    }, [gameState]);

    const restartGame = () => {
        const canvas = canvasRef.current;
        const houseW = 740, houseH = 480;
        const startX = canvas ? (canvas.width - houseW) / 2 : 200;
        const startY = canvas ? (canvas.height - houseH) / 2 : 100;
        const houseBounds = {
            left: startX + 20,
            top: startY + 110,
            right: startX + houseW - 20,
            bottom: startY + houseH - 14,
        };
        const p = canvas
            ? spawnFromPercent(canvas, { xPct: 0.3, yPct: 0.62, size: 72, bounds: houseBounds })
            : { x: startX + 220, y: startY + 320 };

        playerRef.current = { ...playerRef.current, x: p.x, y: p.y, health: 100, isWalking: false, facingDirection: 'down', frameIndex: 1 };
        enemyRef.current = { ...enemyRef.current, x: 950, y: 330, health: 100, isWalking: false, facingDirection: 'left', frameIndex: 1 };
        setPlayerMoney(200000); setGameState('EXPLORE_HOUSE'); setDialogIndex(0); setLastActionText('');
    };

    const handleSurrender = () => {
        const denda = 150000; setPlayerMoney((prev) => Math.max(0, prev - denda));
        setGameState('GAMEOVER'); setLastActionText(`Kamu memilih menyerah dan membayar denda/pelicin sebesar Rp ${denda.toLocaleString('id-ID')}. Birokrasi menang!`);
    };

    const getHpBeamRect = (p) => {
        const reach = 170, width = 36;
        if (p.facingDirection === 'right') return { x: p.x + p.size, y: p.y + (p.size - width) / 2, width: reach, height: width };
        if (p.facingDirection === 'left') return { x: p.x - reach, y: p.y + (p.size - width) / 2, width: reach, height: width };
        if (p.facingDirection === 'up') return { x: p.x + (p.size - width) / 2, y: p.y - reach, width: width, height: reach };
        return { x: p.x + (p.size - width) / 2, y: p.y + p.size, width: width, height: reach };
    };

    // (Kolisi rectIntersect kini diimpor dari src/utils/collision.js)

    const renderSpriteSheet = (ctx, img, entity, label) => {
        if (img) {
            const frameW = img.naturalWidth / 3, frameH = img.naturalHeight / 4;
            let row = 0;
            if (entity.facingDirection === 'down') row = 0; if (entity.facingDirection === 'left') row = 1; if (entity.facingDirection === 'right') row = 2; if (entity.facingDirection === 'up') row = 3;
            ctx.drawImage(img, entity.frameIndex * frameW, row * frameH, frameW, frameH, entity.x, entity.y, entity.size, entity.size * 1.15);
        } else {
            ctx.fillStyle = label === 'Arya' ? '#22c55e' : label === 'Kakek' ? '#f59e0b' : label === 'Pak RT' ? '#3b82f6' : '#ef4444';
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

    return (
        <div className="relative w-screen h-screen bg-neutral-950 text-white font-mono select-none overflow-hidden">
            {/* HUD HEADER TOP */}
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between bg-neutral-900/90 border border-neutral-700 px-5 py-3 rounded-xl shadow-xl backdrop-blur">
                <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-yellow-500/25 border border-yellow-500 text-yellow-400 text-xs font-bold rounded-md">
                        {gameState === 'EXPLORE_HOUSE' || gameState === 'GRANDPA_DIALOG' || gameState === 'WALK_TO_DOOR' ? 'PROLOG' : 'LEVEL 1'}
                    </span>
                    <h1 className="text-sm font-bold tracking-wide text-white">SURVIVAL WNI : Pungli Surat Izin Kerja</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="px-3 py-1 bg-emerald-950 border border-emerald-600 text-emerald-400 text-xs font-bold rounded-lg">
                        💵 Uang Arya: Rp {playerMoney.toLocaleString('id-ID')}
                    </div>
                    <button onClick={() => router.push('/menu')} className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs border border-neutral-600 rounded-lg transition cursor-pointer">← Keluar</button>
                </div>
            </div>

            <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full z-0" />

            {gameState === 'GRANDPA_DIALOG' && (
                <div className="absolute bottom-8 left-8 right-8 bg-neutral-900/95 border-2 border-amber-500 p-6 rounded-2xl shadow-2xl backdrop-blur z-20 max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-2">
                        <span className={`font-bold text-sm px-3 py-1 rounded ${introDialogs[dialogIndex].speaker === 'Kakek' ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white'}`}>{introDialogs[dialogIndex].speaker}</span>
                        <span className="text-xs text-neutral-400 font-mono">{dialogIndex + 1} / {introDialogs.length}</span>
                    </div>
                    <p className="text-sm text-neutral-100 italic leading-relaxed my-3 min-h-[48px]">"{introDialogs[dialogIndex].text}"</p>
                    <button onClick={handleNextGrandpaDialog} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition tracking-widest border-b-4 border-amber-700 cursor-pointer">LANJUT (KLIK / TEKAN) ➔</button>
                </div>
            )}

            {gameState === 'MISSION_OVERLAY' && (
                <div onClick={() => setGameState('WALK_TO_DOOR')} className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 cursor-pointer text-center select-none backdrop-blur-md">
                    <div className="max-w-md bg-neutral-900 border border-neutral-700 p-8 rounded-2xl shadow-2xl space-y-5 hover:border-yellow-500/50 transition-colors">
                        <div className="w-16 h-16 bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">📜</div>
                        <h2 className="text-xl font-bold text-yellow-400 tracking-wider">MISI UTAMA LEVEL 1</h2>
                        <p className="text-neutral-200 text-sm leading-relaxed">Arya memutuskan pergi menemui Pak RT untuk mencari informasi dan meminta pengantar surat izin kerja demi menyambung hidup bersama Kakek.</p>
                        <div className="pt-4 border-t border-neutral-800"><p className="text-xs text-yellow-300 animate-pulse font-mono font-semibold">[ Klik di mana saja untuk berjalan keluar rumah ]</p></div>
                    </div>
                </div>
            )}

            {gameState === 'RT_DIALOG' && (
                <div className="absolute bottom-8 left-8 right-8 bg-neutral-900/95 border-2 border-yellow-500 p-6 rounded-2xl shadow-2xl backdrop-blur z-20 max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-3"><span className="font-bold text-yellow-400 text-base">Pak RT Setempat</span><span className="text-xs text-amber-300 bg-amber-950/80 px-3 py-1 rounded border border-amber-700/50">📍 Pos Ronda</span></div>
                    <p className="text-sm text-neutral-200 italic leading-relaxed my-2">"Nak Arya, mau ngurus surat izin kerja kelurahan ya? Ingat pesan bapak, birokrasi di sana kadang sengaja dibuat berbelit-belit kalau kamu tidak menyelipkan 'amplop pelicin' untuk para oknum. Jangan biarkan integritasmu luntur!"</p>
                    <p className="text-xs text-green-400 font-bold mb-5">Arya: "Terima kasih banyak infonya, Pak RT. Saya tidak akan menyerah begitu saja, ijazah SMK dan hak kerja saya akan saya perjuangkan secara bersih!"</p>
                    <button onClick={() => setGameState('PUNGLI_APPROACH')} className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-neutral-950 text-xs font-bold rounded-xl transition tracking-widest border-b-4 border-yellow-800 cursor-pointer">LANJUT (BERANGKAT KE GERBANG KELURAHAN) →</button>
                </div>
            )}

            {gameState === 'ENEMY_DIALOG' && (
                <div className="absolute bottom-8 left-8 right-8 bg-neutral-900/95 border-2 border-red-500 p-6 rounded-2xl shadow-2xl backdrop-blur z-20 max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-3"><span className="font-bold text-red-400 text-base">Oknum Pungli Kelurahan</span><span className="text-xs text-rose-300 bg-rose-950/80 px-3 py-1 rounded border border-rose-700/50">📍 Pintu Masuk Kelurahan</span></div>
                    <p className="text-sm text-neutral-200 italic leading-relaxed my-2">"Stop! Mau lewat? Jangan harap berkas izin kerjamu diproses kalau kamu tidak membayar uang administrasi kilat sebesar Rp 150.000 secara tunai sekarang juga di tempat ini!"</p>
                    <p className="text-xs text-green-400 font-bold mb-5">Arya: "Pungutan liar macam apa ini?! Jelas-jelas aturan resminya gratis! Saya tidak akan membiarkan praktik korupsi kecil ini merusak masa depan rakyat!"</p>
                    <button onClick={() => setGameState('FIGHT_CHOICE')} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition tracking-widest border-b-4 border-red-800 cursor-pointer">AMBIL KEPUTUSAN TEGAS! ⚡</button>
                </div>
            )}

            {gameState === 'FIGHT_CHOICE' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-2xl font-bold text-yellow-400 mb-2">PILIH LANGKAH ARYA!</h2>
                    <p className="text-xs text-neutral-300 max-w-lg mb-6 leading-relaxed">Oknum pungli memaksa meminta uang pelicin. Selamatkan ijazah SMK dengan merekam dan memviralkan tindakan mereka!</p>
                    <div className="flex flex-col gap-4 w-full max-w-md">
                        <button onClick={() => { setGameState('PLAYING'); setLastActionText('GUNAKAN WASD UNTUK LARI & TEKAN F / SPACE UNTUK MEREKAM HP!'); }} className="py-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl border-b-4 border-blue-800 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"><span>⚔️</span> 📱 LAWAN & VIRALKAN (Kekuatan Warganet)</button>
                        <button onClick={handleSurrender} className="py-4 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-xl border-b-4 border-red-900 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"><span>💸</span> 🏳️ Menyerah (Bayar Uang Pelicin)</button>
                    </div>
                </div>
            )}

            {gameState === 'VICTORY' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-3xl font-bold text-green-400 mb-3">LEVEL 1 BERHASIL DITAKLUKKAN! 🎉</h2>
                    <p className="text-sm text-neutral-200 max-w-md mb-6 leading-relaxed">{lastActionText}</p>
                    <button onClick={() => router.push('/shop?next=2')} className="px-8 py-3.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800 shadow-xl cursor-pointer">Lanjut ke Level 2 →</button>
                </div>
            )}

            {gameState === 'GAMEOVER' && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
                    <h2 className="text-3xl font-bold text-red-500 mb-3">GAGAL & TERJEBAK PUNGLI!</h2>
                    <p className="text-sm text-neutral-200 max-w-md mb-6 leading-relaxed">{lastActionText}</p>
                    <div className="flex gap-4">
                        <button onClick={restartGame} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl border-b-4 border-green-800 cursor-pointer">Coba Lagi</button>
                        <button onClick={() => router.push('/menu')} className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl border border-neutral-600 cursor-pointer">Kembali ke Menu</button>
                    </div>
                </div>
            )}

            {gameState === 'PLAYING' && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 p-3 w-full max-w-3xl bg-neutral-900/90 border border-neutral-700 rounded-xl text-center text-xs text-yellow-400 tracking-wider shadow-2xl backdrop-blur z-20">
                    {lastActionText || "Arahkan Arya (WASD) & Tekan F / Space untuk merekam Oknum Pungli!"}
                </div>
            )}
        </div>
    );
}