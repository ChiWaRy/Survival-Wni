// src/hooks/useAssetLoader.js
import { useState, useEffect } from 'react';

/**
 * Custom hook to load and preprocess game assets (remove white background).
 * @returns {{assets: Record<string, HTMLImageElement>, isLoaded: boolean}}
 */
export function useAssetLoader() {
  const [assets, setAssets] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // List of asset filenames (without extension) to load
    const assetNames = [
      'arya',
      'bodyguard_bayaran',
      'budi',
      'ibukost',
      'kakek',
      'komandan_satpam',
      'oknum_hrd',
      'oknumpenyalurbansos',
      'ormas',
      'pak_kumis_sayur',
      'pak_rt',
      'pejabat_birokrasi',
      'pengacara',
      'penipukost',
      'perawat_rs',
      'petugas_kebersihan',
      'petugas_pungli',
      'sang_dalang',
      'staf_cs_jujur',
      'tukangparkir_liar',
      'Whistleblower',
    ];

    // Function to load and process a single image
    const loadAndProcessImage = (name) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = `/assets/${name}.jpg`;

        img.onload = () => {
          try {
            // Create offscreen canvas to process image
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Get image data and remove white background (r>220, g>220, b>220)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];

              if (r > 220 && g > 220 && b > 220) {
                // Make white pixels transparent
                data[i + 3] = 0;
              }
            }

            // Put the modified image data back to canvas
            ctx.putImageData(imageData, 0, 0);

            // Create a new Image from the processed canvas
            const processedImg = new Image();
            processedImg.onload = () => resolve(processedImg);
            processedImg.onerror = () => reject(new Error(`Failed to create processed image for ${name}`));
            processedImg.src = canvas.toDataURL();
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = () => reject(new Error(`Failed to load image asset: /assets/${name}.jpg`));
      });
    };

    // Load all assets in parallel
    Promise.all(assetNames.map(loadAndProcessImage))
      .then((processedImages) => {
        // Build assets object with keys as names
        const assetsObj = {};
        assetNames.forEach((name, index) => {
          assetsObj[name] = processedImages[index];
        });
        setAssets(assetsObj);
        setIsLoaded(true);
      })
      .catch((err) => {
        console.error('Failed to load assets:', err);
        // Optionally, you can set an error state or fallback assets
        setIsLoaded(false);
      });
  }, []); // Empty deps: run once on mount

  return { assets, isLoaded };
}