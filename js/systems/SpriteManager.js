/**
 * SpriteManager - 精靈圖資源管理器
 * 負責預載入、快取與提供 Chimera 各狀態序列幀影像物件
 */
export class SpriteManager {
  constructor() {
    this.animations = {
      chimera: {
        idle: [],
        move: [],
        attack: [],
        dead: []
      }
    };
    this.isLoaded = false;
  }

  /**
   * 預載入 Chimera 動畫所有影格
   * @returns {Promise<void>}
   */
  async loadAll() {
    const basePath = 'assets/images/Asset_pack_Chimera/PNG/';
    const configs = [
      { name: 'idle', count: 6, prefix: 'idle_animations' },
      { name: 'move', count: 6, prefix: 'move_animations' },
      { name: 'attack', count: 9, prefix: 'attack_animations' },
      { name: 'dead', count: 5, prefix: 'dead_animations' }
    ];

    const loadPromises = [];

    for (const cfg of configs) {
      this.animations.chimera[cfg.name] = [];
      for (let i = 1; i <= cfg.count; i++) {
        const img = new Image();
        const src = `${basePath}${cfg.prefix}${i}.png`;
        const promise = new Promise((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => {
            console.warn(`精靈圖載入失敗: ${src}`);
            resolve(); // 避免單張失敗阻塞遊戲運行
          };
        });
        img.src = src;
        this.animations.chimera[cfg.name].push(img);
        loadPromises.push(promise);
      }
    }

    await Promise.all(loadPromises);
    this.isLoaded = true;
  }

  /**
   * 取得指定動畫指定影格之 Image
   * @param {string} character - 'chimera'
   * @param {string} animName - 'idle' | 'move' | 'attack' | 'dead'
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
}
