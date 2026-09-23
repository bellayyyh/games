import React, { useEffect, useRef, useState, useCallback } from 'react';
import { VoxelEngine, VoxelPosition } from '../3d/VoxelEngine';
import { BlockType, VoxelItem, PlayerStats } from '../types';
import { voxelAudio } from '../utils/audio';

interface Voxel3DCanvasProps {
  stats: PlayerStats;
  selectedItem: VoxelItem | null;
  onBlockMined: (type: BlockType) => void;
  onBlockPlaced: (type: BlockType) => void;
  onPlayerTakeDamage: (amount: number) => void;
  onRegisterEngine: (engine: VoxelEngine | null) => void;
  isNight: boolean;
  timeOfDay: number;
}

export const Voxel3DCanvas: React.FC<Voxel3DCanvasProps> = ({
  stats,
  selectedItem,
  onBlockMined,
  onBlockPlaced,
  onPlayerTakeDamage,
  onRegisterEngine,
  isNight,
  timeOfDay,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<VoxelEngine | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Mining progress tracking
  const [miningProgress, setMiningProgress] = useState(0);
  const [isMining, setIsMining] = useState(false);
  const miningVoxelRef = useRef<VoxelPosition | null>(null);
  const lastTimeRef = useRef(performance.now());

  // 1. Initialize WebGL voxel engine
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const engine = new VoxelEngine(container);
    engineRef.current = engine;
    onRegisterEngine(engine);

    // Keyboard controls
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w') engine.controlsState.forward = true;
      if (k === 's') engine.controlsState.backward = true;
      if (k === 'a') engine.controlsState.left = true;
      if (k === 'd') engine.controlsState.right = true;
      if (e.key === ' ') engine.controlsState.jump = true;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w') engine.controlsState.forward = false;
      if (k === 's') engine.controlsState.backward = false;
      if (k === 'a') engine.controlsState.left = false;
      if (k === 'd') engine.controlsState.right = false;
      if (e.key === ' ') engine.controlsState.jump = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Handle Resize
    const handleResize = () => {
      if (!container || !engine) return;
      engine.resize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Main animation & Physics loop
    const animate = () => {
      const now = performance.now();
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // Update physics, boundaries and monsters
      engine.updatePhysics(dt, () => {
        // Monster hit the player
        voxelAudio.playDamage();
        onPlayerTakeDamage(15);
      });

      animationFrameIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', handleResize);
      engine.dispose();
      if (container.contains(engine.renderer.domElement)) {
        container.removeChild(engine.renderer.domElement);
      }
      onRegisterEngine(null);
    };
  }, []);

  // Sync day/night settings to engine lighting
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateDayNightCycle(isNight, timeOfDay);
    }
  }, [isNight, timeOfDay]);

  // Handle Mining interactions (Click and Hold)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const engine = engineRef.current;
    if (!engine || !engine.selectedVoxel) return;

    if (e.button === 0) {
      // LEFT CLICK: Start mining highlighted block
      setIsMining(true);
      miningVoxelRef.current = engine.selectedVoxel;
      setMiningProgress(10);
      voxelAudio.playMineTap(engine.grid[engine.selectedVoxel.x][engine.selectedVoxel.y][engine.selectedVoxel.z] || 'dirt');
    } else if (e.button === 2) {
      // RIGHT CLICK: Place block from hotbar
      e.preventDefault();
      if (selectedItem && selectedItem.isBlock && selectedItem.blockType) {
        const success = engine.placeBlockAt(selectedItem.blockType);
        if (success) {
          voxelAudio.playBlockPlace();
          onBlockPlaced(selectedItem.blockType);
        }
      }
    }
  };

  const handlePointerUp = () => {
    setIsMining(false);
    setMiningProgress(0);
    miningVoxelRef.current = null;
  };

  // Mining tick updates
  useEffect(() => {
    let timer: number | null = null;
    if (isMining) {
      timer = window.setInterval(() => {
        const engine = engineRef.current;
        if (!engine || !miningVoxelRef.current) return;

        setMiningProgress((prev) => {
          const block = engine.grid[miningVoxelRef.current!.x][miningVoxelRef.current!.y][miningVoxelRef.current!.z];
          if (!block) return 0;

          // Iron and stone take slightly longer to mine without proper tool
          let speedFactor = 15;
          if (block === 'stone' || block === 'iron' || block === 'coal') {
            const hasPickaxe = selectedItem?.isTool && selectedItem.toolType === 'pickaxe';
            speedFactor = hasPickaxe ? 30 : 8;
          } else {
            const hasAxe = selectedItem?.isTool && selectedItem.toolType === 'axe';
            speedFactor = hasAxe ? 40 : 20;
          }

          const next = prev + speedFactor;
          if (next >= 100) {
            // Block completely broken!
            const brokenType = engine.grid[miningVoxelRef.current!.x][miningVoxelRef.current!.y][miningVoxelRef.current!.z];
            if (brokenType) {
              voxelAudio.playBlockBreak();
              engine.createBlockBreakParticles(
                miningVoxelRef.current!.x,
                miningVoxelRef.current!.y,
                miningVoxelRef.current!.z,
                brokenType === 'grass' ? 0x10b981 : brokenType === 'stone' ? 0x64748b : 0x78350f
              );
              engine.grid[miningVoxelRef.current!.x][miningVoxelRef.current!.y][miningVoxelRef.current!.z] = null;
              engine.rebuildWorldMeshes();
              onBlockMined(brokenType);
            }
            setIsMining(false);
            miningVoxelRef.current = null;
            return 0;
          }

          voxelAudio.playMineTap(block);
          return next;
        });
      }, 150);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isMining, selectedItem, onBlockMined]);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      className="relative w-full aspect-[16/10] sm:aspect-[16/9] max-h-[580px] rounded-2xl overflow-hidden border border-stone-200 shadow-2xl bg-stone-900 cursor-crosshair select-none"
    >
      {/* Target Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <div className="relative w-4 h-4 flex items-center justify-center">
          <div className="absolute w-3 h-0.5 bg-white opacity-80" />
          <div className="absolute h-3 w-0.5 bg-white opacity-80" />

          {/* Mining Progress Circle Ring Overlay */}
          {miningProgress > 0 && (
            <svg className="absolute w-8 h-8 -rotate-90">
              <circle
                cx="16"
                cy="16"
                r="10"
                className="stroke-amber-400 fill-none"
                strokeWidth="2.5"
                strokeDasharray="62.8"
                strokeDashoffset={62.8 - (62.8 * miningProgress) / 100}
              />
            </svg>
          )}
        </div>
      </div>

      {/* Control Instruction Bar (Bottom Left) */}
      <div className="absolute bottom-3 left-4 z-20 pointer-events-none bg-stone-900/60 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-[10px] font-medium tracking-wide">
        <span>🖱️ Drag to look · ⌨️ WASD to Walk · 🔲 Space to Jump · Left-click to Mine · Right-click to Build</span>
      </div>
    </div>
  );
};
