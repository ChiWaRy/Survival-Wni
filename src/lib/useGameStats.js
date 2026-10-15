// src/lib/useGameStats.js
// React hook to read persistent money/upgrade stats in level pages.
// Loads client-side only (localStorage) to avoid SSR/hydration issues.

import { useEffect, useState } from 'react';
import { getSaveData, getEffectiveStats, getPlayerHp, DEFAULT_STATE } from './gameData';

export function useGameStats() {
  const [stats, setStats] = useState({
    speed: DEFAULT_STATE.stats.baseSpeed,
    damage: DEFAULT_STATE.stats.baseDamage,
    startHealth: DEFAULT_STATE.stats.maxHealth,
    hp: DEFAULT_STATE.stats.maxHealth,
    money: DEFAULT_STATE.money,
    upgrades: { ...DEFAULT_STATE.upgrades },
    loaded: false,
  });

  useEffect(() => {
    const eff = getEffectiveStats();
    const save = getSaveData();
    setStats({ ...eff, upgrades: save.upgrades, hp: getPlayerHp(), loaded: true });
  }, []);

  return stats;
}

export default useGameStats;