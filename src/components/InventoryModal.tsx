import React from 'react';
import { VoxelItem } from '../types';
import { X, Check, Heart, Sparkles } from 'lucide-react';
import { voxelAudio } from '../utils/audio';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: VoxelItem[];
  onEquipToHotbar: (item: VoxelItem) => void;
  onConsumeFood: (item: VoxelItem) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  inventory,
  onClose,
  onEquipToHotbar,
  onConsumeFood,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm animate-fadeIn select-none">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎒</span>
            <div>
              <h2 className="text-base font-bold text-stone-900">Your Backpack Inventory</h2>
              <p className="text-[11px] text-stone-500 font-medium">Equip blocks, craft tools, or consume food items</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
          {inventory.length === 0 ? (
            <div className="text-center py-8 text-stone-400 text-xs">
              <p>Your backpack is empty!</p>
              <p className="mt-1">Go punch trees, mine stone, or gather resources.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {inventory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <h3 className="text-xs font-bold text-stone-800">{item.name}</h3>
                      <p className="text-[10px] text-stone-500 font-semibold">Qty: {item.count}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {item.isFood ? (
                      <button
                        onClick={() => onConsumeFood(item)}
                        className="px-2.5 py-1 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Heart className="w-3 h-3 text-orange-600 fill-current" />
                        <span>Eat</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onEquipToHotbar(item)}
                        className="px-2.5 py-1 rounded-xl bg-green-100 hover:bg-green-200 text-green-800 text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        Equip
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
