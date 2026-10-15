// src/lib/gameData.js
// Shared game state for money, upgrades, item shop, and level progression.
// Persisted in localStorage so it survives navigation between static level pages.

const STORAGE_KEY = 'survival_wni_save';

// Listener supaya modul sinkronisasi (Supabase) bisa ikut menulis setiap ada perubahan save,
// tanpa membuat impor melingkar (circular import).
let _saveListener = null;
export function onGameSave(fn) {
  _saveListener = fn;
}

// ---- Biaya "jalan pintas" (bayar uang pelicin) per level ----
export const BRIBE_COSTS = {
  1: 150000,
  2: 200000,
  3: 250000,
  4: 300000,
  5: 350000,
  6: 400000,
  7: 450000,
  8: 500000,
  9: 550000,
  10: 600000,
};

// ---- Hadiah uang saat menang level ----
export const LEVEL_REWARDS = {
  1: 75000,
  2: 85000,
  3: 100000,
  4: 110000,
  5: 120000,
  6: 130000,
  7: 140000,
  8: 150000,
  9: 170000,
  10: 250000,
};

// ---- Katalog Toko / Warung (Intermezzo Antar Level) ----
export const SHOP_ITEMS = {
  shoes: {
    id: 'shoes',
    name: 'Sepatu Olahraga',
    description: 'Meningkatkan kecepatan gerak Arya dari 4.0 menjadi 5.0 (lebih mudah menghindari kejaran oknum).',
    price: 50000,
    icon: '👟',
    maxLevel: 1,
  },
  camera: {
    id: 'camera',
    name: 'Powerbank / Lensa Kamera HP',
    description: 'Meningkatkan damage sinar rekam HP dari 25 menjadi 40 per tembakan.',
    price: 100000,
    icon: '🔋',
    maxLevel: 1,
  },
  food: {
    id: 'food',
    name: 'Nasi Bungkus / Vitamin Kakek',
    description: 'Mengisi kembali HP Arya menjadi 100 penuh sebelum masuk ke level berikutnya.',
    price: 25000,
    icon: '🍚',
    instantHeal: true, // dibeli langsung -> HP penuh
    maxLevel: 99,
  },
};

export const MAX_HP = 100;

export const DEFAULT_STATE = {
  money: 200000,
  playerHp: MAX_HP,
  upgrades: { shoes: 0, camera: 0 },
  stats: { baseSpeed: 4.0, baseDamage: 25, maxHealth: MAX_HP },
  currentLevel: 1,
  highestLevelReached: 1,
  totalBribesPaid: 0,
  claimedRewards: {},
  gameCompleted: false,
};

export function getSaveData() {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_STATE,
        ...parsed,
        upgrades: { ...DEFAULT_STATE.upgrades, ...(parsed.upgrades || {}) },
        stats: { ...DEFAULT_STATE.stats, ...(parsed.stats || {}) },
        claimedRewards: { ...DEFAULT_STATE.claimedRewards, ...(parsed.claimedRewards || {}) },
      };
    }
  } catch (e) {
    console.warn('Gagal memuat save:', e);
  }
  return { ...DEFAULT_STATE, upgrades: { ...DEFAULT_STATE.upgrades }, stats: { ...DEFAULT_STATE.stats }, claimedRewards: {} };
}

export function saveGameData(data) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // Sinkronkan ke cloud (Supabase) bila adapter terpasang.
    if (_saveListener) { try { _saveListener(data); } catch (e) { /* diamkan */ } }
  } catch (e) {
    console.warn('Gagal menyimpan save:', e);
  }
}

export function resetGameData() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// HP Arya dibawa antar level supaya "Nasi Bungkus" berguna.
export function getPlayerHp() {
  const save = getSaveData();
  const hp = typeof save.playerHp === 'number' ? save.playerHp : MAX_HP;
  return Math.max(1, Math.min(MAX_HP, hp));
}

export function setPlayerHp(hp) {
  const save = getSaveData();
  save.playerHp = Math.max(0, Math.min(MAX_HP, Math.round(hp)));
  saveGameData(save);
  return save.playerHp;
}

// Statistik efektif setelah upgrade.
export function getEffectiveStats() {
  const save = getSaveData();
  const speed = save.upgrades.shoes >= 1 ? 5.0 : save.stats.baseSpeed;
  const damage = save.upgrades.camera >= 1 ? 40 : save.stats.baseDamage;
  return {
    speed,
    speedAdd: save.upgrades.shoes >= 1 ? 1.0 : 0,
    damage,
    damageMult: save.upgrades.camera >= 1 ? 1.6 : 1,
    money: save.money,
    upgrades: save.upgrades,
  };
}

// Beli item di toko.
export function buyItem(itemId) {
  const save = getSaveData();
  const item = SHOP_ITEMS[itemId];
  if (!item) return { success: false, message: 'Item tidak ditemukan' };

  if (item.instantHeal) {
    if (save.money < item.price) return { success: false, message: `Uang tidak cukup! Butuh ${formatMoney(item.price)}` };
    save.money -= item.price;
    save.playerHp = MAX_HP;
    saveGameData(save);
    return { success: true, money: save.money, upgrades: save.upgrades, message: 'HP Arya kembali penuh (100)!' };
  }

  if (save.money < item.price) return { success: false, message: `Uang tidak cukup! Butuh ${formatMoney(item.price)}` };
  if (save.upgrades[itemId] >= item.maxLevel) return { success: false, message: 'Item ini sudah kamu miliki.' };

  save.money -= item.price;
  save.upgrades[itemId] = 1;
  saveGameData(save);
  return { success: true, money: save.money, upgrades: save.upgrades, message: `${item.name} berhasil dibeli!` };
}

// Bayar uang pelicin untuk melewati level.
export function payBribe(level) {
  const save = getSaveData();
  const cost = BRIBE_COSTS[level] || 200000;
  if (save.money < cost) {
    return { success: false, message: `Uang tidak cukup! Butuh ${formatMoney(cost)}` };
  }
  save.money -= cost;
  save.totalBribesPaid += cost;
  save.currentLevel = Math.min(10, level + 1);
  if (save.currentLevel > save.highestLevelReached) save.highestLevelReached = save.currentLevel;
  saveGameData(save);
  return { success: true, money: save.money, nextLevel: level + 1, bankrupt: save.money <= 0 };
}

// Tandai level selesai.
export function completeLevel(level) {
  const save = getSaveData();
  save.currentLevel = Math.min(10, level + 1);
  if (save.currentLevel > save.highestLevelReached) save.highestLevelReached = save.currentLevel;
  if (level >= 10) save.gameCompleted = true;
  saveGameData(save);
  return save;
}

// Beri hadiah uang sekali per level.
export function claimLevelReward(level) {
  const save = getSaveData();
  if (save.claimedRewards[level]) return { claimed: false, amount: 0, money: save.money };
  const amount = LEVEL_REWARDS[level] || 0;
  save.money += amount;
  save.claimedRewards[level] = true;
  saveGameData(save);
  return { claimed: true, amount, money: save.money };
}

export function getBribeCost(level) {
  return BRIBE_COSTS[level] || 200000;
}

export function formatMoney(amount) {
  return 'Rp ' + (amount || 0).toLocaleString('id-ID');
}
