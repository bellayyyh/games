import React from 'react';
import { Heart, Activity } from 'lucide-react';
import { PlayerStats } from '../types';

interface SurvivalStatsHUDProps {
  stats: PlayerStats;
  playerPosition: { x: number; y: number; z: number };
}

export const SurvivalStatsHUD: React.FC<SurvivalStatsHUDProps> = ({
  stats,
  playerPosition,
}) => {
  const hpHearts = Math.ceil(stats.health / 10);
  const hungerIcons = Math.ceil(stats.hunger / 10);

  return (
    <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-stone-200/80 shadow-md select-none">
      {/* Health & Hunger Bar */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        {/* HP */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-stone-600 mr-1 flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-current animate-pulse" /> Health
          </span>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 ${
                  i < hpHearts ? 'text-rose-500 fill-current' : 'text-stone-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-bold text-stone-800 ml-1">({stats.health}%)</span>
        </div>

        {/* Hunger */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-stone-600 mr-1 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-amber-600" /> Hunger
          </span>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-full ${
                  i < hungerIcons ? 'bg-amber-500 border border-amber-600' : 'bg-stone-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-bold text-stone-800 ml-1">({stats.hunger}%)</span>
        </div>
      </div>

      {/* 3D Coordinates Display */}
      <div className="text-[11px] font-bold text-stone-500 bg-stone-100 px-3 py-1 rounded-xl border border-stone-200/60 self-stretch sm:self-auto flex items-center justify-between sm:justify-start gap-4">
        <span>📍 POS:</span>
        <span className="text-stone-800 font-mono">
          X: {Math.round(playerPosition.x)} · Y: {Math.round(playerPosition.y)} · Z: {Math.round(playerPosition.z)}
        </span>
      </div>
    </div>
  );
};
