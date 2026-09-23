import React from 'react';
import { Compass, Sparkles, AlertCircle, Heart } from 'lucide-react';

interface VoxelStartScreenProps {
  isOpen: boolean;
  onStart: () => void;
}

export const VoxelStartScreen: React.FC<VoxelStartScreenProps> = ({
  isOpen,
  onStart,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm animate-fadeIn select-none">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-stone-200 shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center">
        {/* Cube Graphic representation */}
        <div className="text-5xl mb-4 animate-bounce">🧱</div>

        <h2 className="text-2xl sm:text-3xl font-black font-display text-stone-900 mb-1">
          Mini Block World 3D
        </h2>
        <p className="text-xs sm:text-sm font-semibold text-emerald-600 mb-4">
          Voxel Sandbox & Survival Simulator
        </p>

        {/* Short goals list */}
        <div className="w-full bg-stone-50 rounded-2xl p-4 border border-stone-200/80 text-left space-y-3 text-xs text-stone-600 mb-6 leading-relaxed">
          <p className="font-bold text-stone-800 flex items-center gap-1.5 border-b border-stone-200 pb-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Survival Handbook:</span>
          </p>

          <div className="flex items-start gap-2.5">
            <span className="text-base">🪓</span>
            <div>
              <p className="font-bold text-stone-900">Gather Wood & Mine Stone</p>
              <p className="text-[11px] text-stone-500">Left-click and hold blocks directly with your crosshair to break and collect resources.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="text-base">🔨</span>
            <div>
              <p className="font-bold text-stone-900">Assembles Tools & Shelters</p>
              <p className="text-[11px] text-stone-500">Combine raw materials in the Crafting Bench to construct shovels, axes, and swords. Right-click to place blocks!</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="text-base">👾</span>
            <div>
              <p className="font-bold text-stone-900">Survive Night Creatures</p>
              <p className="text-[11px] text-stone-500">When darkness falls, hostile monsters spawn. Retreat into your built shelters or defend yourself with swords!</p>
            </div>
          </div>
        </div>

        {/* WASD & Look control instructions */}
        <div className="w-full grid grid-cols-2 gap-2 mb-6 text-[10px] text-stone-500 font-bold uppercase tracking-wider">
          <div className="p-2.5 rounded-xl bg-stone-100 border border-stone-200 flex flex-col items-center">
            <span>Keyboard Move</span>
            <span className="text-stone-800 font-mono text-xs mt-1">[W, A, S, D]</span>
          </div>
          <div className="p-2.5 rounded-xl bg-stone-100 border border-stone-200 flex flex-col items-center">
            <span>Look Around</span>
            <span className="text-stone-800 font-mono text-xs mt-1">Drag Mouse/Touch</span>
          </div>
        </div>

        {/* Start Game CTA */}
        <button
          onClick={onStart}
          className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer text-sm sm:text-base flex items-center justify-center gap-2"
        >
          <span>Spawn in Voxel World</span>
        </button>
      </div>
    </div>
  );
};
