import React from 'react';
import { VoxelItem } from '../types';

interface HotbarHUDProps {
  hotbarItems: (VoxelItem | null)[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
}

export const HotbarHUD: React.FC<HotbarHUDProps> = ({
  hotbarItems,
  selectedIndex,
  onSelectIndex,
}) => {
  return (
    <div className="w-full flex flex-col items-center gap-1 select-none">
      <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
        Quick Slot Hotbar
      </p>

      {/* Row of 9 slots */}
      <div className="flex items-center gap-1.5 p-1.5 bg-stone-900/90 rounded-2xl border border-stone-700/80 shadow-lg">
        {hotbarItems.map((item, idx) => {
          const isSelected = selectedIndex === idx;

          return (
            <button
              key={idx}
              onClick={() => onSelectIndex(idx)}
              className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                isSelected
                  ? 'bg-amber-500/30 border-2 border-amber-500 shadow-inner'
                  : 'bg-stone-800 hover:bg-stone-700 border border-stone-700'
              }`}
            >
              {/* Hotbar numeric label */}
              <span className="absolute top-0.5 left-1 text-[8px] font-bold text-stone-400">
                {idx + 1}
              </span>

              {item ? (
                <div className="flex flex-col items-center justify-center">
                  <span className="text-xl sm:text-2xl drop-shadow-sm">{item.icon}</span>
                  {item.count > 1 && (
                    <span className="absolute bottom-0.5 right-1 text-[9px] font-black text-white bg-stone-900/60 px-1 rounded-sm">
                      {item.count}
                    </span>
                  )}
                </div>
              ) : (
                <div className="w-4 h-4 rounded-full border border-stone-700 border-dashed" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
