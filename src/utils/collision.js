// src/utils/collision.js
// ---------------------------------------------------------------------------
// COLLISION & SPAWN STANDARD (STEP 2)
// ---------------------------------------------------------------------------
// Dipakai bersama oleh semua level supaya:
//   1. rectIntersect tidak pernah "diam-diam gagal" (return false) hanya karena
//      sebuah objek ditulis dengan properti yang berbeda (.w/.h vs .width/.height).
//      Inilah akar bug klasik: objek statis { x, y, w, h } dicek pakai .width
//      -> undefined -> perbandingan NaN -> selalu false -> penghalang tembus.
//   2. Spawn point tidak pernah jatuh ke "zona mati" ketika layar di-resize.
//
// ATURAN PENULISAN OBJEK (WAJIB, agar konsisten):
//   - Penghalang statis (mobil, gerobak, meja, peti) -> tulis { x, y, width, height }.
//   - Entitas bergerak (Arya, musuh)                  -> cukup { x, y, size }.
//   - Fungsi di bawah tetap TOLERAN terhadap { w, h } sebagai jalur kompatibilitas,
//     tetapi object baru sebaiknya selalu memakai width/height.

/**
 * Lebar efektif sebuah rect. Prioritas: width -> size -> w -> 0.
 * Selalu mengembalikan number (tidak pernah undefined/NaN).
 */
export function rectWidth(r) {
    if (!r) return 0;
    if (typeof r.width === 'number') return r.width;
    if (typeof r.size === 'number') return r.size;
    if (typeof r.w === 'number') return r.w;
    return 0;
}

/**
 * Tinggi efektif sebuah rect. Prioritas: height -> size -> h -> 0.
 */
export function rectHeight(r) {
    if (!r) return 0;
    if (typeof r.height === 'number') return r.height;
    if (typeof r.size === 'number') return r.size;
    if (typeof r.h === 'number') return r.h;
    return 0;
}

/** Ubah bentuk apa pun menjadi rect baku { x, y, width, height }. */
export function normalizeRect(r) {
    return {
        x: (r && r.x) || 0,
        y: (r && r.y) || 0,
        width: rectWidth(r),
        height: rectHeight(r),
    };
}

/**
 * Deteksi tabrakan AABB yang SOLID & bebas bug.
 * - Selalu memakai width/height (dengan fallback size / w / h agar aman).
 * - Tidak pernah menghasilkan perbandingan NaN: bila salah satu sisi tidak
 *   punya ukuran valid, otomatis mengembalikan false (bukan hasil acak).
 * - Bekerja untuk objek statis (width/height) MAUPUN entitas (size).
 *
 * @param {{x:number,y:number,width?:number,height?:number,size?:number,w?:number,h?:number}} r1
 * @param {object} r2
 * @returns {boolean}
 */
export function rectIntersect(r1, r2) {
    if (!r1 || !r2) return false;

    const w1 = rectWidth(r1), h1 = rectHeight(r1);
    const w2 = rectWidth(r2), h2 = rectHeight(r2);

    // Tidak ada ukuran -> tidak mungkin bertabrakan (cegah NaN).
    if (w1 <= 0 || h1 <= 0 || w2 <= 0 || h2 <= 0) return false;

    return (
        r1.x < r2.x + w2 &&
        r1.x + w1 > r2.x &&
        r1.y < r2.y + h2 &&
        r1.y + h1 > r2.y
    );
}

/** Titik (x, y) ada di dalam sebuah rect? */
export function pointInRect(px, py, r) {
    const w = rectWidth(r), h = rectHeight(r);
    return px >= r.x && px <= r.x + w && py >= r.y && py <= r.y + h;
}

/** Tumpang-tindih antara lingkaran (cx, cy, r) dan sebuah rect. */
export function circleIntersectRect(cx, cy, radius, rect) {
    const w = rectWidth(rect), h = rectHeight(rect);
    const nearestX = Math.max(rect.x, Math.min(cx, rect.x + w));
    const nearestY = Math.max(rect.y, Math.min(cy, rect.y + h));
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return dx * dx + dy * dy <= radius * radius;
}

/** Batasi nilai ke rentang [min, max]. */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Batas area yang boleh dijalani (ruang lantai / jalan).
 * Mengembalikan objek siap pakai untuk canWalk().
 */
export function makeWalkBounds({ left = 0, top = 0, right = 0, bottom = 0 } = {}) {
    return { left, top, right, bottom };
}

/**
 * RUMUS canWalk TERBAIK (anti "zona mati"):
 * Sebuah posisi (x, y) valid jika SELURUH kotak badan karakter (x .. x+size,
 * y .. y+size) berada di dalam satu area kontinu [left..right] x [top..bottom].
 *
 * Kunci anti-dead-zone:
 *  - Area harus KONTINU (tidak dipecah jadi banyak zona yang menyisakan celah
 *    setinggi badan karakter) -> jangan buat dua band terpisah untuk jalan.
 *  - Batas `bottom`/`right` dihitung dari ukuran canvas terkini (H/W), BUKAN
 *    angka mati, sehingga saat resize tidak muncul celah baru.
 *
 * @param {number} x  posisi kiri-atas kotak badan
 * @param {number} y
 * @param {number} size ukuran sisi kotak badan karakter (mis. 72)
 * @param {{left:number,top:number,right:number,bottom:number}} bounds
 */
export function canWalk(x, y, size, bounds) {
    if (!bounds) return false;
    return (
        x >= bounds.left &&
        y >= bounds.top &&
        x + size <= bounds.right &&
        y + size <= bounds.bottom
    );
}

/**
 * Spawn point aman berbasis PERSENTASE canvas (bukan koordinat mati).
 * Hasil selalu di-clamp agar kotak badan karakter tetap berada di dalam layar,
 * bahkan ketika tinggi layar < 960px.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{xPct?:number, yPct?:number, size?:number, bounds?:object}} opts
 *        xPct/yPct dalam 0..1, default x=0.5 (tengah), y=0.8 (80% tinggi layar).
 */
export function spawnFromPercent(canvas, { xPct = 0.5, yPct = 0.8, size = 72, bounds } = {}) {
    const W = canvas ? canvas.width : 1200;
    const H = canvas ? canvas.height : 720;

    let x = W * xPct - size / 2;
    let y = H * yPct;

    if (bounds) {
        x = clamp(x, bounds.left, Math.max(bounds.left, bounds.right - size));
        y = clamp(y, bounds.top, Math.max(bounds.top, bounds.bottom - size));
    } else {
        x = clamp(x, 0, Math.max(0, W - size));
        y = clamp(y, 0, Math.max(0, H - size));
    }

    return { x, y };
}

/**
 * Gerakkan entitas dengan sliding collision (coba diagonal, lalu sumbu X, lalu Y).
 * `canStand(x, y)` harus mengembalikan true bila kotak badan boleh berada di sana.
 *
 * @returns {boolean} true bila entitas benar-benar bergerak.
 */
export function tryMove(entity, dirX, dirY, speed, canStand) {
    const len = Math.hypot(dirX, dirY);
    if (len === 0) return false;

    const stepX = (dirX / len) * speed;
    const stepY = (dirY / len) * speed;
    const nx = entity.x + stepX;
    const ny = entity.y + stepY;

    if (canStand(nx, ny)) { entity.x = nx; entity.y = ny; return true; }
    if (canStand(nx, entity.y)) { entity.x = nx; return true; }
    if (canStand(entity.x, ny)) { entity.y = ny; return true; }
    return false;
}

export default {
    rectWidth,
    rectHeight,
    normalizeRect,
    rectIntersect,
    pointInRect,
    circleIntersectRect,
    clamp,
    makeWalkBounds,
    canWalk,
    spawnFromPercent,
    tryMove,
};