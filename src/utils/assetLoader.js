// src/utils/assetLoader.js
// ---------------------------------------------------------------------------
// GLOBAL ASSET LOADER (STEP 1)
// ---------------------------------------------------------------------------
// Semua sprite karakter di /public/assets/ adalah spritesheet 3 kolom x 4 baris
// berformat .jpg dengan background putih polos. Fungsi di file ini memuat gambar,
// membuang background (putih ATAU hitam), lalu menyimpan hasilnya ke ref.current
// supaya bisa dipakai berulang di game loop tanpa menulis kode yang sama di
// setiap src/app/levelX/page.js.
//
// Pemakaian di level page:
//   import { loadSpriteWithTransparentBg, loadImage } from '../../utils/assetLoader';
//   ...
//   loadSpriteWithTransparentBg('/assets/arya.jpg', aryaImgRef);
//   loadSpriteWithTransparentBg('/assets/gedung.jpg', gedungRef, { background: 'black' });

/**
 * Ambang batas warna untuk dianggap "background".
 * Putih : semua channel > 220
 * Hitam : semua channel < 15
 */
const WHITE_THRESHOLD = 220;
const BLACK_THRESHOLD = 15;

/**
 * Memuat gambar, membuang background-nya, lalu menyimpannya ke ref.current.
 *
 * @param {string} src                      Path gambar, mis. '/assets/arya.jpg'
 * @param {{current: any}} ref              React ref tempat hasil disimpan (ref.current = HTMLImageElement)
 * @param {{
 *   background?: 'white' | 'black' | 'none', // warna yg dijadikan transparan (default: 'white')
 *   threshold?: number,                      // override ambang batas (opsional)
 *   onLoad?: (img: HTMLImageElement) => void // callback opsional setelah selesai
 * }} [options]
 * @returns {Promise<HTMLImageElement>}     Promise berisi gambar yang sudah diproses
 */
export function loadSpriteWithTransparentBg(src, ref, options = {}) {
    const { background = 'white', threshold, onLoad } = options;

    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') return; // SSR guard

        const img = new Image();
        img.src = src;

        img.onload = () => {
            try {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = img.naturalWidth;
                tempCanvas.height = img.naturalHeight;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(img, 0, 0);

                // background: 'none' -> biarkan gambar apa adanya (mis. tetap putih)
                if (background !== 'none') {
                    const limit = typeof threshold === 'number'
                        ? threshold
                        : (background === 'black' ? BLACK_THRESHOLD : WHITE_THRESHOLD);

                    const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                    const data = imgData.data;

                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i], g = data[i + 1], b = data[i + 2];

                        if (background === 'black') {
                            if (r < limit && g < limit && b < limit) data[i + 3] = 0;
                        } else {
                            if (r > limit && g > limit && b > limit) data[i + 3] = 0;
                        }
                    }

                    tempCtx.putImageData(imgData, 0, 0);
                }

                // Bungkus ulang ke Image baru supaya aman dipakai ctx.drawImage
                const processedImg = new Image();
                processedImg.onload = () => {
                    if (ref) ref.current = processedImg;
                    if (onLoad) onLoad(processedImg);
                    resolve(processedImg);
                };
                processedImg.onerror = () => reject(new Error(`Gagal memproses gambar: ${src}`));
                processedImg.src = tempCanvas.toDataURL();
            } catch (err) {
                reject(err);
            }
        };

        img.onerror = () => reject(new Error(`Gagal memuat gambar: ${src}`));
    });
}

/**
 * Memuat gambar APA ADANYA (tanpa mengubah pixel) ke ref.current.
 * Dipakai untuk tileset / tilemap yang memang perlu background aslinya.
 *
 * @param {string} src
 * @param {{current: any}} ref
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(src, ref) {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') return;
        const img = new Image();
        img.src = src;
        img.onload = () => { if (ref) ref.current = img; resolve(img); };
        img.onerror = () => reject(new Error(`Gagal memuat gambar: ${src}`));
    });
}

/**
 * Memuat beberapa sprite sekaligus.
 * @param {Array<{src: string, ref: any, options?: object}>} entries
 * @returns {Promise<Array<HTMLImageElement|null>>}
 */
export function loadSprites(entries = []) {
    return Promise.all(
        entries.map(({ src, ref, options }) =>
            loadSpriteWithTransparentBg(src, ref, options).catch(() => null)
        )
    );
}

export default { loadSpriteWithTransparentBg, loadImage, loadSprites };