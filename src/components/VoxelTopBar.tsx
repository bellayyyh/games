import React from 'react';
import { Volume2, VolumeX, RotateCcw, Compass, Sun, Moon, Sparkles } from 'lucide-react';
import { PlayerStats } from '../types';

interface VoxelTopBarProps {
  stats: PlayerStats;
  isMuted: boolean;
  onToggleMute: () => void;
  onResetWorld: () => void;
  onOpenInventory: () => void;
  onOpenCrafting: () => void;
  timeString: string;
}

export const VoxelTopBar: React.FC<VoxelTopBarProps> = ({
  stats,
  isMuted,
  onToggleMute,
  onResetWorld,
  onOpenInventory,
  onOpenCrafting,
  timeString,
}) => {
  return (
    <header className="w-full bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-xs z-30 select-none">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Wordmark */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-600 text-white flex items-center justify-center shadow-sm text-base font-bold">
            🧱
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-stone-900 leading-none">
              Mini Block World
            </h1>
            <p className="text-[10px] font-semibold text-stone-500 mt-0.5">Voxel Sandbox 3D</p>
          </div>
        </div>

        {/* Day/Night and Time status */}
        <div className="flex items-center gap-2 bg-stone-100 px-3 py-1 rounded-xl border border-stone-200 text-xs font-semibold">
          {stats.isNight ? (
            <Moon className="w-4 h-4 text-indigo-500 animate-pulse" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}
          <span className="text-stone-700">{timeString}</span>
          <span className="text-[10px] text-stone-400">|</span>
          <span className={`${stats.isNight ? 'text-rose-600' : 'text-emerald-600'}`}>
            {stats.isNight ? 'Danger Level High 👾' : 'Daylight Secure ☀️'}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenInventory}
            className="px-2.5 py-1.5 text-xs font-bold text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200"
          >
            🎒 Inventory (E)
          </button>
          <button
            onClick={onOpenCrafting}
            className="px-2.5 py-1.5 text-xs font-bold text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200"
          >
            🔨 Crafting (C)
          </button>

          <button
            onClick={onToggleMute}
            className="p-1.5 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
            title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-stone-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onResetWorld}
            className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-100 rounded-lg transition-colors"
            title="Reset sandbox & generate new world"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
