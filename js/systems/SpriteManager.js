/**
 * SpriteManager - 精靈圖資源管理器
 * 負責預載入、快取與提供 Chimera (暴龍)、Warrior (盾兵) 及 Cavalry (騎兵) 各狀態序列幀影像物件
 */
export class SpriteManager {
  constructor() {
    this.animations = {
      chimera: {
        idle: [],
        move: [],
        attack: [],
        dead: []
      },
      warrior: {
        idle: [],
        move: [],
        attack: [],
        dead: []
      },
      cavalry: {
        idle: [],
        move: [],
        attack: [],
        dead: []
      },
      warrior2: {
        idle: [],
        move: [],
        attack: [],
        dead: []
      },
      archer: {
        idle: [],
        move: [],
        attack: [],
        dead: []
      },
      healer: {
        idle: [],
        move: [],
        heal: [],
        dead: [],
        healing_aura: []
      },
      turret: {
        attack: []
      }
    };
    this.standaloneImages = {};
    this.isLoaded = false;
  }

  /**
   * 預載入 Chimera、Warrior、Cavalry、Warrior2、Archer 與 Healer 動畫所有影格
   * @returns {Promise<void>}
   */
  async loadAll() {
    const characters = [
      {
        id: 'chimera',
        basePath: 'assets/images/Asset_pack_Chimera/PNG/',
        configs: [
          { name: 'idle', count: 6, prefix: 'idle_animations' },
          { name: 'move', count: 6, prefix: 'move_animations' },
          { name: 'attack', count: 9, prefix: 'attack_animations' },
          { name: 'dead', count: 5, prefix: 'dead_animations' }
        ]
      },
      {
        id: 'warrior',
        basePath: 'assets/images/warrior/PNG/',
        configs: [
          { name: 'idle', count: 6, prefix: 'Character_Idle' },
          { name: 'move', count: 8, prefix: 'Character_Move' },
          { name: 'attack', count: 8, prefix: 'Character_Attack' },
          { name: 'dead', count: 7, prefix: 'Character_Death' }
        ]
      },
      {
        id: 'cavalry',
        basePath: 'assets/images/Cavalry/PNG/',
        configs: [
          { name: 'idle', count: 6, prefix: 'Cavalry_Idle' },
          { name: 'move', count: 8, prefix: 'Cavalry_Move' },
          { name: 'attack', count: 7, prefix: 'Cavalry_Attack' },
          { name: 'dead', count: 7, prefix: 'Cavalry_Death' }
        ]
      },
      {
        id: 'warrior2',
        basePath: 'assets/images/warrior2/PNG/',
        configs: [
          { name: 'idle', count: 6, prefix: 'Warrior_Idle_Left_Matched' },
          { name: 'move', count: 8, prefix: 'Warrior_Move_Left_Matched' },
          { name: 'attack', count: 8, prefix: 'Warrior2_Attack_Left' },
          { name: 'dead', count: 7, prefix: 'Warrior_Death_Left_Matched' }
        ]
      },
      {
        id: 'archer',
        basePath: 'assets/images/archer/PNG/',
        configs: [
          { name: 'idle', count: 6, prefix: 'archer_idle' },
          { name: 'move', count: 8, prefix: 'archer_walk' },
          { name: 'attack', count: 6, prefix: 'archer_attack' },
          { name: 'dead', count: 8, prefix: 'archer_death' }
        ]
      },
      {
        id: 'healer',
        basePath: 'assets/images/healer/PNG/',
        configs: [
          { name: 'idle', count: 6, prefix: 'healer_idle' },
          { name: 'move', count: 8, prefix: 'healer_walk' },
          { name: 'heal', count: 8, prefix: 'healer_heal' },
          { name: 'dead', count: 8, prefix: 'healer_death' },
          { name: 'healing_aura', count: 6, prefix: 'healing_aura' }
        ]
      },
      {
        id: 'turret',
        basePath: 'assets/images/turret/PNG/',
        configs: [
          { name: 'attack', count: 3, prefix: 'turret-1v' }
        ]
      }
    ];

    const loadPromises = [];

    // 載入角色精靈圖影格
    for (const char of characters) {
      this.animations[char.id] = {};
      for (const cfg of char.configs) {
        this.animations[char.id][cfg.name] = [];
        for (let i = 1; i <= cfg.count; i++) {
          const img = new Image();
          const src = `${char.basePath}${cfg.prefix}${i}.png`;
          const promise = new Promise((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => {
              console.warn(`精靈圖載入失敗: ${src}`);
              resolve(); // 避免單張失敗阻塞遊戲運行
            };
          });
          img.src = src;
          this.animations[char.id][cfg.name].push(img);
          loadPromises.push(promise);
        }
      }
    }

    // 載入獨立單張圖檔（弓兵箭矢、砲台外觀、子彈、主堡與旗幟）
    const standaloneMap = {
      'arrow_preview': 'assets/images/archer/arrow_preview.png',
      'turret1': 'assets/images/turret/turret1.png',
      'bullet': 'assets/images/turret/bullet.png',
      'CastleTower': 'assets/images/castle/CastleTower.png',
      'CastleFlag': 'assets/images/castle/CastleFlag.png',
      'CastleFlag2': 'assets/images/castle/CastleFlag2.png'
    };

    for (const [key, path] of Object.entries(standaloneMap)) {
      const img = new Image();
      const p = new Promise((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => {
          console.warn(`獨立圖檔載入失敗: ${path}`);
          resolve();
        };
      });
      img.src = path;
      this.standaloneImages[key] = img;
      loadPromises.push(p);
    }

    await Promise.all(loadPromises);
    this.isLoaded = true;
  }

  /**
   * 取得指定角色指定動畫與影格之 Image
   * @param {string} character - 'chimera' | 'warrior' | 'cavalry' | 'warrior2' | 'archer' | 'healer'
   * @param {string} animName - 'idle' | 'move' | 'attack' | 'dead' | 'heal' | 'healing_aura'
   * @param {number} frameIndex
   * @returns {HTMLImageElement|null}
   */
  getFrame(character, animName, frameIndex) {
    const list = this.animations[character]?.[animName];
    if (!list || list.length === 0) return null;
    const idx = Math.floor(frameIndex) % list.length;
    return list[idx];
  }

  /**
   * 取得指定動畫的總影格數
   * @param {string} character
   * @param {string} animName
   * @returns {number}
   */
  getFrameCount(character, animName) {
    return this.animations[character]?.[animName]?.length || 0;
  }

  /**
   * 取得獨立單張圖檔
   * @param {string} key
   * @returns {HTMLImageElement|null}
   */
  getImage(key) {
    return this.standaloneImages[key] || null;
  }
}
