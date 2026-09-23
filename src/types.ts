export type BlockType =
  | 'grass'
  | 'dirt'
  | 'stone'
  | 'sand'
  | 'wood'
  | 'leaves'
  | 'water'
  | 'coal'
  | 'iron'
  | 'glass'
  | 'planks'
  | 'bricks';

export interface VoxelItem {
  id: string;
  name: string;
  count: number;
  icon: string;
  isBlock: boolean;
  blockType?: BlockType;
  isTool: boolean;
  toolType?: 'pickaxe' | 'axe' | 'shovel' | 'sword';
  tier?: 'wood' | 'stone' | 'iron';
  isFood?: boolean;
  healValue?: number;
}

export interface PlayerStats {
  health: number;
  hunger: number;
  score: number;
  timeOfDay: number; // 0 to 24000
  isNight: boolean;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  outputId: string;
  outputCount: number;
  inputs: { id: string; count: number }[];
  description: string;
  icon: string;
}
