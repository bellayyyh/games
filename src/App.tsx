import React, { useState, useEffect, useRef } from 'react';
import { PlayerStats, VoxelItem, BlockType, CraftingRecipe } from './types';
import { VoxelEngine } from './3d/VoxelEngine';
import { VoxelTopBar } from './components/VoxelTopBar';
import { Voxel3DCanvas } from './components/Voxel3DCanvas';
import { SurvivalStatsHUD } from './components/SurvivalStatsHUD';
import { HotbarHUD } from './components/HotbarHUD';
import { InventoryModal } from './components/InventoryModal';
import { CraftingModal } from './components/CraftingModal';
import { VoxelStartScreen } from './components/VoxelStartScreen';
import { voxelAudio } from './utils/audio';

const STORAGE_KEY = 'mini_block_world_save_v1';

const INITIAL_INVENTORY: VoxelItem[] = [
  { id: 'wood', name: 'Raw Oak Wood Log', count: 4, icon: '🪵', isBlock: true, blockType: 'wood', isTool: false },
  { id: 'dirt', name: 'Grass Turf Block', count: 12, icon: '🧱', isBlock: true, blockType: 'grass', isTool: false },
  { id: 'planks', name: 'Wooden Planks', count: 8, icon: '🪵', isBlock: true, blockType: 'planks', isTool: false },
  { id: 'apple', name: 'Golden Apple', count: 5, icon: '🍎', isBlock: false, isTool: false, isFood: true, healValue: 20 },
  { id: 'sticks', name: 'Wooden Sticks', count: 4, icon: '🥢', isBlock: false, isTool: false },
];

export const App: React.FC = () => {
  // Load saved inventory or default
  const [stats, setStats] = useState<PlayerStats>({
    health: 100,
    hunger: 100,
    score: 0,
    timeOfDay: 2000, // starts morning
    isNight: false,
  });

  const [inventory, setInventory] = useState<VoxelItem[]>(INITIAL_INVENTORY);
  const [hotbarItems, setHotbarItems] = useState<(VoxelItem | null)[]>(() => {
    // Fill first few slots with basic items
    const slots = Array(9).fill(null);
    slots[0] = INITIAL_INVENTORY[1]; // Grass blocks
    slots[1] = INITIAL_INVENTORY[2]; // Wood Planks
    slots[2] = INITIAL_INVENTORY[3]; // Golden Apples
    return slots;
  });

  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isStartOpen, setIsStartOpen] = useState(true);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isCraftingOpen, setIsCraftingOpen] = useState(false);

  // Position coordinates updated periodically for HUD
  const [playerPosition, setPlayerPosition] = useState({ x: 9, y: 4, z: 9 });

  const engineRef = useRef<VoxelEngine | null>(null);

  // Load state from local storage on load
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.inventory) setInventory(parsed.inventory);
        if (parsed.stats) {
          setStats((prev) => ({
            ...prev,
            health: parsed.stats.health,
            hunger: parsed.stats.hunger,
            score: parsed.stats.score,
          }));
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  // Save state on change
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          inventory,
          stats: {
            health: stats.health,
            hunger: stats.hunger,
            score: stats.score,
          },
        })
      );
    } catch {
      // Ignore
    }
  }, [inventory, stats.health, stats.hunger, stats.score]);

  // Periodic HUD position update tracker
  useEffect(() => {
    const posTimer = setInterval(() => {
      if (engineRef.current) {
        const pos = engineRef.current.playerPos;
        setPlayerPosition({ x: pos.x, y: pos.y, z: pos.z });
      }
    }, 200);
    return () => clearInterval(posTimer);
  }, []);

  // Survival mechanics tick: decrement hunger over time and handle health regen
  useEffect(() => {
    const survivalTimer = setInterval(() => {
      setStats((prev) => {
        let hp = prev.health;
        let hg = prev.hunger;

        // Decrement hunger slowly
        hg = Math.max(0, hg - 3);

        // Starving decay or health regeneration
        if (hg === 0) {
          hp = Math.max(0, hp - 4); // take starvation damage
        } else if (hg >= 80 && hp < 100) {
          hp = Math.min(100, hp + 5); // slow health regeneration when full
        }

        return { ...prev, health: hp, hunger: hg };
      });
    }, 5000);

    return () => clearInterval(survivalTimer);
  }, []);

  // Smooth Day/Night Cycle Tick (loops every 24000 ticks)
  useEffect(() => {
    const timeTimer = setInterval(() => {
      setStats((prev) => {
        let nextTime = prev.timeOfDay + 300;
        if (nextTime >= 24000) nextTime = 0;

        const isNightTime = nextTime > 12000 && nextTime < 22000;
        const switchedToNight = isNightTime && !prev.isNight;
        const switchedToDay = !isNightTime && prev.isNight;

        if (switchedToNight) {
          voxelAudio.playNightfall();
          if (engineRef.current) {
            engineRef.current.spawnNightCreatures();
          }
        } else if (switchedToDay) {
          voxelAudio.playDaybreak();
          if (engineRef.current) {
            engineRef.current.clearNightCreatures();
          }
        }

        return {
          ...prev,
          timeOfDay: nextTime,
          isNight: isNightTime,
        };
      });
    }, 2500);

    return () => clearInterval(timeTimer);
  }, []);

  // Keybindings for E (inventory) and C (crafting bench)
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'e') {
        e.preventDefault();
        setIsInventoryOpen((prev) => !prev);
      }
      if (k === 'c') {
        e.preventDefault();
        setIsCraftingOpen((prev) => !prev);
      }
      // Numeric keys 1-9 for hotbar selection
      if (e.key >= '1' && e.key <= '9') {
        setSelectedIndex(parseInt(e.key) - 1);
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, []);

  // Convert game time ticks to formatted clocks
  const getFormattedTime = (): string => {
    const totalHours = (stats.timeOfDay / 24000) * 24;
    const hrs = Math.floor(totalHours);
    const mins = Math.floor((totalHours - hrs) * 60);
    const padH = hrs.toString().padStart(2, '0');
    const padM = mins.toString().padStart(2, '0');
    return `${padH}:${padM}`;
  };

  // Award mined block item into inventory
  const handleBlockMined = (type: BlockType) => {
    // Map voxel block to collectible items
    const itemMap: Record<BlockType, { id: string; name: string; icon: string }> = {
      grass: { id: 'dirt', name: 'Grass Turf Block', icon: '🧱' },
      dirt: { id: 'dirt', name: 'Grass Turf Block', icon: '🧱' },
      stone: { id: 'stone', name: 'Raw Cobblestone', icon: '🪨' },
      sand: { id: 'sand', name: 'Smeltable Sand', icon: '🏖️' },
      wood: { id: 'wood', name: 'Raw Oak Wood Log', icon: '🪵' },
      leaves: { id: 'sticks', name: 'Wooden Sticks', icon: '🥢' },
      water: { id: 'water', name: 'Water Bucket', icon: '🪣' },
      coal: { id: 'coal', name: 'Mineral Coal Ore', icon: '💎' },
      iron: { id: 'iron', name: 'Raw Iron Chunk', icon: '⚙️' },
      glass: { id: 'glass', name: 'Glass Block', icon: '🔲' },
      planks: { id: 'planks', name: 'Wooden Planks', icon: '🪵' },
      bricks: { id: 'bricks', name: 'Red Bricks Block', icon: '🧱' },
    };

    const target = itemMap[type];
    setInventory((prev) => {
      const match = prev.find((item) => item.id === target.id);
      if (match) {
        return prev.map((item) =>
          item.id === target.id ? { ...item, count: item.count + 1 } : item
        );
      } else {
        return [
          ...prev,
          {
            id: target.id,
            name: target.name,
            count: 1,
            icon: target.icon,
            isBlock: true,
            blockType: type,
            isTool: false,
          },
        ];
      }
    });

    setStats((prev) => ({ ...prev, score: prev.score + 10 }));
  };

  // Decrement item count upon building placement
  const handleBlockPlaced = (type: BlockType) => {
    setInventory((prev) => {
      return prev
        .map((item) => {
          if (item.blockType === type) {
            return { ...item, count: item.count - 1 };
          }
          return item;
        })
        .filter((item) => item.count > 0);
    });

    // Mirror updates inside the quick-access hotbar slots
    setHotbarItems((prev) => {
      return prev.map((item) => {
        if (item && item.blockType === type) {
          const nextCount = item.count - 1;
          return nextCount > 0 ? { ...item, count: nextCount } : null;
        }
        return item;
      });
    });
  };

  // Handle damage from falls, hostile Spiders or Starvation
  const handlePlayerTakeDamage = (amount: number) => {
    setStats((prev) => {
      const nextHp = Math.max(0, prev.health - amount);
      if (nextHp === 0) {
        // Player died! Trigger instant respawn
        voxelAudio.playDamage();
        setTimeout(() => {
          alert('🐾 Oh no! You fainted in Mini Block World. Respawning safe on grasslands!');
          handleRestartWorld();
        }, 300);
      }
      return { ...prev, health: nextHp };
    });
  };

  // Equip inventory item to the active selected hotbar index
  const handleEquipToHotbar = (item: VoxelItem) => {
    setHotbarItems((prev) => {
      const copy = [...prev];
      copy[selectedIndex] = item;
      return copy;
    });
    setIsInventoryOpen(false);
  };

  // Eat bread / apples to restore health and hunger
  const handleConsumeFood = (food: VoxelItem) => {
    voxelAudio.playEat();
    setInventory((prev) => {
      return prev
        .map((item) => {
          if (item.id === food.id) return { ...item, count: item.count - 1 };
          return item;
        })
        .filter((item) => item.count > 0);
    });

    setStats((prev) => ({
      ...prev,
      health: Math.min(100, prev.health + (food.healValue || 15)),
      hunger: Math.min(100, prev.hunger + 30),
    }));
  };

  // Deduct inputs and reward crafted item
  const handleCraftItem = (recipe: CraftingRecipe) => {
    setInventory((prev) => {
      // 1. Subtract inputs
      let copy = prev.map((item) => {
        const inputMatch = recipe.inputs.find((i) => i.id === item.id);
        if (inputMatch) {
          return { ...item, count: item.count - inputMatch.count };
        }
        return item;
      });

      // 2. Add outputs
      const outputMatch = copy.find((item) => item.id === recipe.outputId);
      if (outputMatch) {
        copy = copy.map((item) =>
          item.id === recipe.outputId ? { ...item, count: item.count + recipe.outputCount } : item
        );
      } else {
        copy.push({
          id: recipe.outputId,
          name: recipe.name,
          count: recipe.outputCount,
          icon: recipe.icon,
          isBlock: recipe.outputId === 'bricks' || recipe.outputId === 'glass' || recipe.outputId === 'planks',
          blockType: recipe.outputId === 'bricks' ? 'bricks' : recipe.outputId === 'glass' ? 'glass' : recipe.outputId === 'planks' ? 'planks' : undefined,
          isTool: recipe.outputId.includes('pickaxe') || recipe.outputId.includes('sword'),
          toolType: recipe.outputId.includes('pickaxe') ? 'pickaxe' : 'sword',
        });
      }

      return copy.filter((item) => item.count > 0);
    });
  };

  // Reset world, clean grid arrays
  const handleRestartWorld = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    setStats({
      health: 100,
      hunger: 100,
      score: 0,
      timeOfDay: 2000,
      isNight: false,
    });
    setInventory(INITIAL_INVENTORY);
    setHotbarItems(() => {
      const slots = Array(9).fill(null);
      slots[0] = INITIAL_INVENTORY[1];
      slots[1] = INITIAL_INVENTORY[2];
      slots[2] = INITIAL_INVENTORY[3];
      return slots;
    });
    setSelectedIndex(0);

    if (engineRef.current) {
      engineRef.current.playerPos.set(9, 6, 9);
      engineRef.current.playerVelocity.set(0, 0, 0);
      engineRef.current.clearNightCreatures();
      engineRef.current.rebuildWorldMeshes();
    }
  };

  const handleToggleMute = () => {
    voxelAudio.playClick();
    const next = !isMuted;
    setIsMuted(next);
    voxelAudio.setMuted(next);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center">
      {/* Top Header */}
      <VoxelTopBar
        stats={stats}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onResetWorld={handleRestartWorld}
        onOpenInventory={() => setIsInventoryOpen(true)}
        onOpenCrafting={() => setIsCraftingOpen(true)}
        timeString={getFormattedTime()}
      />

      {/* Main Sandbox Game Frame */}
      <main className="w-full max-w-5xl px-3 sm:px-6 py-4 flex flex-col gap-4 flex-1">
        {/* 3D Voxel Canvas */}
        <Voxel3DCanvas
          stats={stats}
          selectedItem={hotbarItems[selectedIndex]}
          onBlockMined={handleBlockMined}
          onBlockPlaced={handleBlockPlaced}
          onPlayerTakeDamage={handlePlayerTakeDamage}
          onRegisterEngine={(engine) => {
            engineRef.current = engine;
          }}
          isNight={stats.isNight}
          timeOfDay={stats.timeOfDay}
        />

        {/* Survival Status Bars */}
        <SurvivalStatsHUD
          stats={stats}
          playerPosition={playerPosition}
        />

        {/* Hotbar Interface */}
        <HotbarHUD
          hotbarItems={hotbarItems}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
        />
      </main>

      {/* Clean Footer */}
      <footer className="w-full py-3 text-center text-xs text-stone-500 border-t border-stone-200 bg-white">
        <p>Mini Block World · Build shelters, mine ores, and survive the starry night</p>
      </footer>

      {/* Start screen handbook */}
      <VoxelStartScreen
        isOpen={isStartOpen}
        onStart={() => {
          setIsStartOpen(false);
          voxelAudio.playDaybreak();
        }}
      />

      {/* Inventory backpack modal */}
      <InventoryModal
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        inventory={inventory}
        onEquipToHotbar={handleEquipToHotbar}
        onConsumeFood={handleConsumeFood}
      />

      {/* Crafting bench modal */}
      <CraftingModal
        isOpen={isCraftingOpen}
        onClose={() => setIsCraftingOpen(false)}
        inventory={inventory}
        onCraftItem={handleCraftItem}
      />
    </div>
  );
};

export default App;
