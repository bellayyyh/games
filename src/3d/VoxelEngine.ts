import * as THREE from 'three';
import { BlockType } from '../types';

export interface VoxelPosition {
  x: number;
  y: number;
  z: number;
}

export interface VoxelCreature {
  id: string;
  type: 'cow' | 'sheep' | 'chicken' | 'creature';
  group: THREE.Group;
  pos: THREE.Vector3;
  targetPos: THREE.Vector3;
  health: number;
  isHostile: boolean;
  walkTimer: number;
}

export class VoxelEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  // World size
  public worldWidth = 18;
  public worldHeight = 12;
  public worldDepth = 18;

  // Voxel Grid: 3D array of BlockType or null
  public grid: (BlockType | null)[][][];

  // Instanced Meshes for high-performance rendering
  private instancedMeshes: Record<BlockType, THREE.InstancedMesh> = {} as any;
  private blockCounts: Record<BlockType, number> = {} as any;
  private needsRebuild = false;

  // Highlights
  public selectionBox: THREE.LineSegments;
  public selectedVoxel: VoxelPosition | null = null;
  public selectedVoxelFace: THREE.Vector3 | null = null;

  // Player state
  public playerPos = new THREE.Vector3(9, 6, 9);
  public playerVelocity = new THREE.Vector3(0, 0, 0);
  public cameraPitch = 0;
  public cameraYaw = Math.PI / 4;
  public isGrounded = false;
  private walkSpeed = 5.0;
  private jumpForce = 5.5;
  private gravity = 15.0;

  // Active Controls
  public controlsState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
  };

  // Lighting & Day/Night
  private ambientLight: THREE.AmbientLight;
  private dirLight: THREE.DirectionalLight;
  private skyMesh: THREE.Mesh;

  // Raycaster
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2(0, 0); // screen center for first-person crosshair

  // Creatures
  public creatures: VoxelCreature[] = [];

  // Particles
  private particlesGroup = new THREE.Group();

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa5f3fc); // clear blue sky

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
    this.camera.position.set(9, 7, 9);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false; // keep it super light
    container.appendChild(this.renderer.domElement);

    // Lights
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfffbeb, 1.0);
    this.dirLight.position.set(10, 15, 10);
    this.scene.add(this.dirLight);

    // Sky Dome Box
    const skyGeo = new THREE.BoxGeometry(60, 60, 60);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0xa5f3fc, side: THREE.BackSide });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyMesh);

    // Voxel selection wireframe
    const lineGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02));
    const lineMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    this.selectionBox = new THREE.LineSegments(lineGeo, lineMat);
    this.selectionBox.visible = false;
    this.scene.add(this.selectionBox);

    this.scene.add(this.particlesGroup);

    // Initialize 3D grid array
    this.grid = Array(this.worldWidth)
      .fill(null)
      .map(() =>
        Array(this.worldHeight)
          .fill(null)
          .map(() => Array(this.worldDepth).fill(null))
      );

    // Generate terrain
    this.generateTerrain();

    // Create instanced meshes
    this.initInstancedMeshes();

    // Spawn initial peaceful animals
    this.spawnAnimals();

    // Pointer Drag Controls (simple, works on desktop and mobile!)
    this.setupPointerControls(container);
  }

  private setupPointerControls(container: HTMLElement) {
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    const onDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const onMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;

      this.cameraYaw -= dx * 0.005;
      this.cameraPitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.cameraPitch - dy * 0.005));
    };

    const onUp = () => {
      isDragging = false;
    };

    container.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  /** procedural terrain generator with grass, hills, trees, and mineral ores */
  private generateTerrain() {
    for (let x = 0; x < this.worldWidth; x++) {
      for (let z = 0; z < this.worldDepth; z++) {
        // Calculate height based on simple sine wave hills
        const heightFreq = 0.15;
        const baseHeight = 3;
        const sinVal = Math.sin(x * heightFreq) * Math.cos(z * heightFreq) * 2;
        const finalHeight = Math.max(1, Math.min(this.worldHeight - 3, Math.round(baseHeight + sinVal)));

        for (let y = 0; y < this.worldHeight; y++) {
          if (y === 0) {
            // Bedrock or stone layer
            this.grid[x][y][z] = 'stone';
          } else if (y < finalHeight - 1) {
            // Under layer dirt or stone
            if (y > 1 && Math.random() < 0.18) {
              this.grid[x][y][z] = Math.random() > 0.5 ? 'coal' : 'iron';
            } else {
              this.grid[x][y][z] = 'dirt';
            }
          } else if (y === finalHeight - 1) {
            // Top layer grass, sand near shores, or water
            if (finalHeight <= 2) {
              this.grid[x][y][z] = 'sand';
            } else {
              this.grid[x][y][z] = 'grass';
            }
          } else if (y === finalHeight && finalHeight <= 2) {
            // Semi-transparent pond water filling
            this.grid[x][y][z] = 'water';
          }
        }

        // Randomly plant pine trees on highland grass
        if (finalHeight > 2 && Math.random() < 0.04) {
          this.growTree(x, finalHeight, z);
        }
      }
    }
  }

  private growTree(x: number, y: number, z: number) {
    const trunkHeight = 3;
    // Trunk logs
    for (let t = 0; t < trunkHeight; t++) {
      const ty = y + t;
      if (ty < this.worldHeight) {
        this.grid[x][ty][z] = 'wood';
      }
    }

    // Leaf canopy sphere
    const leafHeight = y + trunkHeight;
    for (let lx = -1; lx <= 1; lx++) {
      for (let lz = -1; lz <= 1; lz++) {
        for (let ly = 0; ly <= 1; ly++) {
          const fx = x + lx;
          const fy = leafHeight + ly;
          const fz = z + lz;

          if (
            fx >= 0 &&
            fx < this.worldWidth &&
            fy >= 0 &&
            fy < this.worldHeight &&
            fz >= 0 &&
            fz < this.worldDepth
          ) {
            // Skip the direct center trunk top or make it leafy
            if (!this.grid[fx][fy][fz]) {
              this.grid[fx][fy][fz] = 'leaves';
            }
          }
        }
      }
    }
  }

  /** Setup instanced mesh pools for rapid rendering in ~10 draw calls */
  private initInstancedMeshes() {
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);

    const materials: Record<BlockType, THREE.Material> = {
      grass: new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.8 }),
      dirt: new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 }),
      stone: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 }),
      sand: new THREE.MeshStandardMaterial({ color: 0xfcd34d, roughness: 0.9 }),
      wood: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.75 }),
      leaves: new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 }),
      water: new THREE.MeshStandardMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.7 }),
      coal: new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 }),
      iron: new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.6 }),
      glass: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.4 }),
      planks: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.8 }),
      bricks: new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.85 }),
    };

    // Calculate max possible instances per block type to allocate mesh storage
    const maxCapacity = this.worldWidth * this.worldHeight * this.worldDepth;

    const blockTypesList: BlockType[] = [
      'grass',
      'dirt',
      'stone',
      'sand',
      'wood',
      'leaves',
      'water',
      'coal',
      'iron',
      'glass',
      'planks',
      'bricks',
    ];

    blockTypesList.forEach((type) => {
      // Clean old instance meshes if any
      if (this.instancedMeshes[type]) {
        this.scene.remove(this.instancedMeshes[type]);
      }

      const inst = new THREE.InstancedMesh(boxGeo, materials[type], maxCapacity);
      inst.count = 0;
      inst.castShadow = false;
      inst.receiveShadow = false;
      this.instancedMeshes[type] = inst;
      this.scene.add(inst);
    });

    this.rebuildWorldMeshes();
  }

  /** Update instanced matrix positions when blocks are mined or placed */
  public rebuildWorldMeshes() {
    // Clear counts
    const blockTypesList: BlockType[] = [
      'grass',
      'dirt',
      'stone',
      'sand',
      'wood',
      'leaves',
      'water',
      'coal',
      'iron',
      'glass',
      'planks',
      'bricks',
    ];

    blockTypesList.forEach((t) => {
      this.blockCounts[t] = 0;
    });

    const dummy = new THREE.Object3D();

    for (let x = 0; x < this.worldWidth; x++) {
      for (let y = 0; y < this.worldHeight; y++) {
        for (let z = 0; z < this.worldDepth; z++) {
          const type = this.grid[x][y][z];
          if (type) {
            dummy.position.set(x + 0.5, y + 0.5, z + 0.5);
            dummy.updateMatrix();

            const inst = this.instancedMeshes[type];
            const idx = this.blockCounts[type];
            inst.setMatrixAt(idx, dummy.matrix);
            this.blockCounts[type]++;
          }
        }
      }
    }

    // Refresh count values so WebGL knows how many to render
    blockTypesList.forEach((type) => {
      const inst = this.instancedMeshes[type];
      inst.count = this.blockCounts[type];
      inst.instanceMatrix.needsUpdate = true;
    });
  }

  /** Simple 3D procedural Cow / Sheep cuboid animals */
  private spawnAnimals() {
    const animalTypes: ('cow' | 'sheep' | 'chicken')[] = ['cow', 'sheep', 'chicken'];
    for (let i = 0; i < 4; i++) {
      const type = animalTypes[i % animalTypes.length];
      const group = new THREE.Group();

      // Main body cube
      const bodyMat = new THREE.MeshStandardMaterial({
        color: type === 'cow' ? 0x78350f : type === 'sheep' ? 0xf8fafc : 0xfef08a,
      });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.6), bodyMat);
      body.position.y = 0.3;
      group.add(body);

      // Cute block head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), bodyMat);
      head.position.set(0, 0.45, 0.35);
      group.add(head);

      // Legs
      const legMat = new THREE.MeshStandardMaterial({ color: 0x1f2937 });
      [-0.18, 0.18].forEach((x) => {
        [-0.22, 0.22].forEach((z) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2), legMat);
          leg.position.set(x, 0.1, z);
          group.add(leg);
        });
      });

      // Position near center terrain top
      const x = Math.floor(4 + Math.random() * 10);
      const z = Math.floor(4 + Math.random() * 10);
      const topY = this.getTopVoxelHeight(x, z) + 0.1;

      group.position.set(x + 0.5, topY, z + 0.5);
      this.scene.add(group);

      this.creatures.push({
        id: `${Date.now()}-${Math.random()}`,
        type,
        group,
        pos: group.position,
        targetPos: group.position.clone(),
        health: 20,
        isHostile: false,
        walkTimer: Math.random() * 5,
      });
    }
  }

  /** Spawn nighttime Red-eyed simple cubic spiders/creatures */
  public spawnNightCreatures() {
    for (let i = 0; i < 3; i++) {
      const group = new THREE.Group();

      // Dark square body
      const monsterMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), monsterMat);
      body.position.y = 0.35;
      group.add(body);

      // Glowing red square eyes
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      [-0.16, 0.16].forEach((x) => {
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.08), eyeMat);
        eye.position.set(x, 0.45, 0.3);
        group.add(eye);
      });

      // Spooky legs
      [-0.25, 0.25].forEach((x) => {
        [-0.25, 0, 0.25].forEach((z) => {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.06), monsterMat);
          leg.position.set(x, 0.18, z);
          group.add(leg);
        });
      });

      // Spawn on high ground
      const x = Math.floor(2 + Math.random() * 14);
      const z = Math.floor(2 + Math.random() * 14);
      const topY = this.getTopVoxelHeight(x, z);

      group.position.set(x + 0.5, topY, z + 0.5);
      this.scene.add(group);

      this.creatures.push({
        id: `mob-${Date.now()}-${Math.random()}`,
        type: 'creature',
        group,
        pos: group.position,
        targetPos: group.position.clone(),
        health: 30,
        isHostile: true,
        walkTimer: 0,
      });
    }
  }

  /** Clears nighttime monsters when day breaks */
  public clearNightCreatures() {
    const nightMobs = this.creatures.filter((c) => c.isHostile);
    nightMobs.forEach((m) => {
      this.scene.remove(m.group);
    });
    this.creatures = this.creatures.filter((c) => !c.isHostile);
  }

  private getTopVoxelHeight(x: number, z: number): number {
    for (let y = this.worldHeight - 1; y >= 0; y--) {
      if (this.grid[x]?.[y]?.[z]) {
        return y + 1;
      }
    }
    return 1;
  }

  /** Add colorful cubes flying outwards upon mining a voxel */
  public createBlockBreakParticles(x: number, y: number, z: number, colorHex: number) {
    const count = 12;
    const pMat = new THREE.MeshBasicMaterial({ color: colorHex });
    const pGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(pGeo, pMat);
      mesh.position.set(x + 0.5, y + 0.5, z + 0.5);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() + 0.5) * 4,
        (Math.random() - 0.5) * 4
      );

      this.particlesGroup.add(mesh);

      // Auto discard particle
      setTimeout(() => {
        this.particlesGroup.remove(mesh);
      }, 750);

      // Move particle in animate step
      const startTime = performance.now();
      const pAnim = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed > 0.75) return;
        mesh.position.addScaledVector(velocity, 0.05);
        velocity.y -= 0.2; // small gravity drop
        requestAnimationFrame(pAnim);
      };
      pAnim();
    }
  }

  /** Update cycle atmosphere (Sky colors, daylight direction) */
  public updateDayNightCycle(isNight: boolean, timeOfDay: number) {
    const timeFactor = timeOfDay / 24000;

    // Shift sky colors
    if (isNight) {
      this.scene.background = new THREE.Color(0x0f172a); // Midnight navy blue
      (this.skyMesh.material as THREE.MeshBasicMaterial).color.setHex(0x0f172a);
      this.ambientLight.color.setHex(0x1e1b4b);
      this.ambientLight.intensity = 0.25;
      this.dirLight.intensity = 0.15;
    } else {
      // Sunny afternoon
      this.scene.background = new THREE.Color(0xa5f3fc);
      (this.skyMesh.material as THREE.MeshBasicMaterial).color.setHex(0xa5f3fc);
      this.ambientLight.color.setHex(0xffffff);
      this.ambientLight.intensity = 0.85;
      this.dirLight.intensity = 1.0;
    }
  }

  /** Perform raycasting against instanced blocks from center crosshair */
  public updateRaycast() {
    // Generate direction vector based on pitch and yaw angles
    const dir = new THREE.Vector3(
      Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch),
      Math.sin(this.cameraPitch),
      Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch)
    ).normalize();

    this.raycaster.set(this.camera.position, dir);

    // Filter instanced meshes to raycast
    const meshes = Object.values(this.instancedMeshes);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0 && intersects[0].distance < 6.0) {
      const hit = intersects[0];
      const point = hit.point.clone();

      // Adjust slightly towards the inside of the hit voxel to find coordinates
      const voxelCenter = point.clone().addScaledVector(dir, 0.01);
      const vx = Math.floor(voxelCenter.x);
      const vy = Math.floor(voxelCenter.y);
      const vz = Math.floor(voxelCenter.z);

      if (
        vx >= 0 &&
        vx < this.worldWidth &&
        vy >= 0 &&
        vy < this.worldHeight &&
        vz >= 0 &&
        vz < this.worldDepth
      ) {
        this.selectedVoxel = { x: vx, y: vy, z: vz };

        // Determine face direction for placement
        const normal = hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 1, 0);
        this.selectedVoxelFace = normal;

        // Position wireframe guide outline
        this.selectionBox.position.set(vx + 0.5, vy + 0.5, vz + 0.5);
        this.selectionBox.visible = true;
        return;
      }
    }

    this.selectedVoxel = null;
    this.selectedVoxelFace = null;
    this.selectionBox.visible = false;
  }

  /** Block placement logic */
  public placeBlockAt(type: BlockType): boolean {
    if (!this.selectedVoxel || !this.selectedVoxelFace) return false;

    // Target block relative to the faced normal
    const px = this.selectedVoxel.x + this.selectedVoxelFace.x;
    const py = this.selectedVoxel.y + this.selectedVoxelFace.y;
    const pz = this.selectedVoxel.z + this.selectedVoxelFace.z;

    // Check world boundaries
    if (
      px < 0 ||
      px >= this.worldWidth ||
      py < 0 ||
      py >= this.worldHeight ||
      pz < 0 ||
      pz >= this.worldDepth
    ) {
      return false;
    }

    // Do not place inside solid block or inside player head/torso collision
    if (this.grid[px][py][pz]) return false;

    // Basic player collision check
    const distToPlayer = new THREE.Vector3(px + 0.5, py + 0.5, pz + 0.5).distanceTo(this.playerPos);
    if (distToPlayer < 0.9) return false;

    // Set grid
    this.grid[px][py][pz] = type;
    this.rebuildWorldMeshes();
    return true;
  }

  /** Physics game loop: player movements, gravity, animal wandering, night creature pathing */
  public updatePhysics(dt: number, onHostileAttack: () => void) {
    if (dt > 0.15) dt = 0.15; // prevent huge physics glops

    // 1. ROTATE CAMERA BASED ON PITCH / YAW
    const lookDir = new THREE.Vector3(
      Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch),
      Math.sin(this.cameraPitch),
      Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch)
    );

    const lookTarget = this.camera.position.clone().add(lookDir);
    this.camera.lookAt(lookTarget);

    // 2. APPLY WASD MOVEMENT TO PLAYER
    const moveVector = new THREE.Vector3(0, 0, 0);
    const forwardVec = new THREE.Vector3(Math.sin(this.cameraYaw), 0, Math.cos(this.cameraYaw)).normalize();
    const rightVec = new THREE.Vector3(0, 1, 0).cross(forwardVec).normalize();

    if (this.controlsState.forward) moveVector.add(forwardVec);
    if (this.controlsState.backward) moveVector.sub(forwardVec);
    if (this.controlsState.left) moveVector.add(rightVec);
    if (this.controlsState.right) moveVector.sub(rightVec);

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize();
      this.playerPos.addScaledVector(moveVector, this.walkSpeed * dt);
    }

    // 3. GRAVITY & JUMPING
    if (this.controlsState.jump && this.isGrounded) {
      this.playerVelocity.y = this.jumpForce;
      this.isGrounded = false;
    }

    this.playerVelocity.y -= this.gravity * dt;
    this.playerPos.y += this.playerVelocity.y * dt;

    // 4. GRID BOUNDS & COLLISION RESOLUTION (Foolproof, lightweight cylinder bounds)
    const px = Math.floor(this.playerPos.x);
    const py = Math.floor(this.playerPos.y);
    const pz = Math.floor(this.playerPos.z);

    // Floor collision
    if (py >= 0 && py < this.worldHeight) {
      const blockUnder = this.grid[Math.max(0, Math.min(this.worldWidth - 1, px))][Math.max(0, py - 1)][Math.max(0, Math.min(this.worldDepth - 1, pz))];
      if (blockUnder && this.playerPos.y - py < 0.05) {
        this.playerPos.y = py;
        this.playerVelocity.y = 0;
        this.isGrounded = true;
      }
    }

    // Level ceiling check
    if (this.playerPos.y < 0.5) {
      this.playerPos.y = 0.5;
      this.playerVelocity.y = 0;
      this.isGrounded = true;
    }

    // Keep within world borders
    this.playerPos.x = Math.max(0.2, Math.min(this.worldWidth - 1.2, this.playerPos.x));
    this.playerPos.z = Math.max(0.2, Math.min(this.worldDepth - 1.2, this.playerPos.z));

    // Align camera position to player head height (1.6 blocks tall)
    this.camera.position.copy(this.playerPos);
    this.camera.position.y += 1.6;

    // 5. UPDATE CREATURES (Animals & hostile monsters)
    this.creatures.forEach((c) => {
      c.walkTimer -= dt;

      if (c.isHostile) {
        // Monster AI: Move directly towards the player!
        const dirToPlayer = new THREE.Vector3().subVectors(this.playerPos, c.pos);
        dirToPlayer.y = 0; // lock flat-level walking

        const distance = dirToPlayer.length();
        if (distance < 1.0) {
          onHostileAttack();
          // Drift back monster slightly
          c.pos.addScaledVector(dirToPlayer.normalize(), -0.4);
        } else if (distance < 12.0) {
          // Creepy slow walk
          c.pos.addScaledVector(dirToPlayer.normalize(), 1.6 * dt);
          // Look towards player
          c.group.lookAt(this.playerPos.x, c.pos.y, this.playerPos.z);
        }
      } else {
        // Peaceful animals: Idle wandering around
        if (c.walkTimer <= 0) {
          c.walkTimer = 4 + Math.random() * 5;
          const range = 2;
          c.targetPos.set(
            c.pos.x + (Math.random() - 0.5) * range,
            c.pos.y,
            c.pos.z + (Math.random() - 0.5) * range
          );
        }

        const distToTarget = c.pos.distanceTo(c.targetPos);
        if (distToTarget > 0.05) {
          const moveDir = new THREE.Vector3().subVectors(c.targetPos, c.pos).normalize();
          c.pos.addScaledVector(moveDir, 0.8 * dt);
          c.group.lookAt(c.targetPos.x, c.pos.y, c.targetPos.z);

          // Bounce body up/down for cute step animation
          c.group.children[0].position.y = 0.3 + Math.abs(Math.sin(performance.now() * 0.01)) * 0.08;
        }
      }

      // Snap creatures to terrain height
      const cx = Math.floor(c.pos.x);
      const cz = Math.floor(c.pos.z);
      if (cx >= 0 && cx < this.worldWidth && cz >= 0 && cz < this.worldDepth) {
        c.pos.y = this.getTopVoxelHeight(cx, cz);
      }
      c.group.position.copy(c.pos);
    });

    // 6. UPDATE RAYCAST highlihgts
    this.updateRaycast();
  }

  public resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose() {
    this.renderer.dispose();
  }
}
