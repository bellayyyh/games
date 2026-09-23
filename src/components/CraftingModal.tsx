import React from 'react';
import { CraftingRecipe, VoxelItem } from '../types';
import { X, Check, ArrowRight } from 'lucide-react';
import { voxelAudio } from '../utils/audio';

interface CraftingModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: VoxelItem[];
  onCraftItem: (recipe: CraftingRecipe) => void;
}

const RECIPES: CraftingRecipe[] = [
  {
    id: 'planks',
    name: 'Wooden Planks',
    outputId: 'planks',
    outputCount: 4,
    inputs: [{ id: 'wood', count: 1 }],
    description: 'Transform solid raw timber log into crafting planks.',
    icon: '🪵',
  },
  {
    id: 'sticks',
    name: 'Wooden Sticks',
    outputId: 'sticks',
    outputCount: 4,
    inputs: [{ id: 'planks', count: 2 }],
    description: 'Carve wooden planks into useful tool shafts and handles.',
    icon: '🥢',
  },
  {
    id: 'wooden_pickaxe',
    name: 'Wooden Pickaxe',
    outputId: 'wooden_pickaxe',
    outputCount: 1,
    inputs: [
      { id: 'planks', count: 3 },
      { id: 'sticks', count: 2 },
    ],
    description: 'Basic wooden tool to mine stone and coal ore.',
    icon: '⛏️',
  },
  {
    id: 'stone_pickaxe',
    name: 'Stone Pickaxe',
    outputId: 'stone_pickaxe',
    outputCount: 1,
    inputs: [
      { id: 'stone', count: 3 },
      { id: 'sticks', count: 2 },
    ],
    description: 'Durable stone tool to mine iron ore efficiently.',
    icon: '🪓',
  },
  {
    id: 'iron_pickaxe',
    name: 'Iron Pickaxe',
    outputId: 'iron_pickaxe',
    outputCount: 1,
    inputs: [
      { id: 'iron', count: 3 },
      { id: 'sticks', count: 2 },
    ],
    description: 'Sturdy iron tool to harvest all blocks with ease.',
    icon: '⚙️',
  },
  {
    id: 'wooden_sword',
    name: 'Wooden Sword',
    outputId: 'wooden_sword',
    outputCount: 1,
    inputs: [
      { id: 'planks', count: 2 },
      { id: 'sticks', count: 1 },
    ],
    description: 'Wooden self-defense sword to clear spiders and skeletons.',
    icon: '🗡️',
  },
  {
    id: 'iron_sword',
    name: 'Iron Sword',
    outputId: 'iron_sword',
    outputCount: 1,
    inputs: [
      { id: 'iron', count: 2 },
      { id: 'sticks', count: 1 },
    ],
    description: 'Sharp solid steel blade dealing heavy combat damage.',
    icon: '⚔️',
  },
  {
    id: 'bricks',
    name: 'Red Bricks Block',
    outputId: 'bricks',
    outputCount: 4,
    inputs: [
      { id: 'dirt', count: 2 },
      { id: 'stone', count: 1 },
    ],
    description: 'Compress dirt and pebbles into highly secure structural bricks.',
    icon: '🧱',
  },
  {
    id: 'glass',
    name: 'Glass Block',
    outputId: 'glass',
    outputCount: 4,
    inputs: [
      { id: 'sand', count: 1 },
      { id: 'coal', count: 1 },
    ],
    description: 'Smelt fine silicon sand with warm burning coal.',
    icon: '🔲',
  },
];

export const CraftingModal: React.FC<CraftingModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onCraftItem,
}) => {
  if (!isOpen) return null;

  // Helper to find how many of a specific item the player owns
  const getItemStock = (id: string): number => {
    return inventory.find((i) => i.id === id)?.count || 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm animate-fadeIn select-none">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔨</span>
            <div>
              <h2 className="text-base font-bold text-stone-900">Crafting Bench</h2>
              <p className="text-[11px] text-stone-500 font-medium">Combine collected ingredients to assemble tools and structural blocks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recipes list */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {RECIPES.map((r) => {
              // Verify if user has enough ingredients
              const canCraft = r.inputs.every((input) => getItemStock(input.id) >= input.count);

              return (
                <div
                  key={r.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    canCraft
                      ? 'border-amber-300 bg-amber-50/50 hover:bg-amber-50'
                      : 'border-stone-200 bg-white opacity-75'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl p-1 bg-white rounded-xl shadow-2xs border border-stone-100">
                      {r.icon}
                    </span>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-stone-900 flex items-center gap-1.5">
                        <span>{r.name}</span>
                        <span className="text-[10px] bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded-md font-bold">
                          x{r.outputCount}
                        </span>
                      </h3>
                      <p className="text-[10px] text-stone-500 leading-normal mt-0.5">{r.description}</p>
                    </div>
                  </div>

                  {/* Ingredients needed checklist */}
                  <div className="flex flex-wrap gap-2 text-[10px] border-t border-stone-100 pt-2 bg-stone-50/50 p-2 rounded-xl">
                    {r.inputs.map((input) => {
                      const stock = getItemStock(input.id);
                      const hasEnough = stock >= input.count;

                      return (
                        <span
                          key={input.id}
                          className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 ${
                            hasEnough
                              ? 'bg-emerald-100 text-emerald-950'
                              : 'bg-rose-100 text-rose-950'
                          }`}
                        >
                          {input.id === 'wood' ? '🪵' : input.id === 'planks' ? '🪵' : input.id === 'sticks' ? '🥢' : input.id === 'stone' ? '🪨' : '⚙️'}{' '}
                          {stock}/{input.count}
                        </span>
                      );
                    })}
                  </div>

                  {/* Craft Action button */}
                  <button
                    disabled={!canCraft}
                    onClick={() => {
                      voxelAudio.playCraftSuccess();
                      onCraftItem(r);
                    }}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      canCraft
                        ? 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-md active:scale-97'
                        : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                    }`}
                  >
                    <span>Assembles Item</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
