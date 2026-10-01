/**
 * Base - 雙方陣營主堡實體，具有 1500 HP 與血條顯示
 */
import { Entity } from './Entity.js';
import { BASE_HP, BASE_SIZE } from '../config.js';

export class Base extends Entity {
  /**
   * @param {number} x
   * @param {number} y
   * @param {string} side - 'blue' | 'red'
   */
  constructor(x, y, side) {
    super(x, y, BASE_SIZE, BASE_SIZE);
    this.side = side;
    this.hp = BASE_HP;
    this.maxHp = BASE_HP;
  }

  reset() {
    this.hp = BASE_HP;
    this.alive = true;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.alive = false;
    }
  }

  /**
   * 繪製主堡外觀（CastleTower 與 CastleFlag / CastleFlag2）與上方血條
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../systems/SpriteManager.js').SpriteManager} [spriteManager]
   */
  render(ctx, spriteManager = null) {
    const color = this.side === 'blue' ? '#4db8ff' : '#ff5b5b';
    const hpRatio = Math.max(0, this.hp / this.maxHp);

    const towerImg = spriteManager?.getImage('CastleTower');
    const flagKey = this.side === 'blue' ? 'CastleFlag' : 'CastleFlag2';
    const flagImg = spriteManager?.getImage(flagKey);

    if (towerImg && flagImg && towerImg.complete && flagImg.complete) {
      const isFlipped = (this.side === 'red');
      const drawW = 84;
      const drawH = 60;
      const flagW = 18;
      const flagH = 36;

      ctx.save();
      ctx.translate(this.x, this.y);
      if (isFlipped) {
        ctx.scale(-1, 1);
      }

      // 城堡主體：裁切頂部透明區 (0, 139, 500, 358)
      ctx.drawImage(towerImg, 0, 139, 500, 358, -drawW / 2, -drawH / 2, drawW, drawH);

      // 城牆垛上插旗：旗桿底部與垛頂接合
      const flagX = drawW * 0.24;
      const flagY = -drawH / 2 - flagH + 4;
      ctx.drawImage(flagImg, flagX, flagY, flagW, flagH);

      ctx.restore();

      // 血條（繪製於旗幟上方）
      const barW = 60;
      const barH = 5;
      const barX = this.x - barW / 2;
      const barY = this.y - drawH / 2 - flagH - 4;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.fillRect(barX, barY, barW * hpRatio, barH);
      ctx.shadowBlur = 0;
    } else {
      // 圖片未載入時的幾何方塊備援
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.fillRect(this.x - BASE_SIZE / 2, this.y - BASE_SIZE / 2, BASE_SIZE, BASE_SIZE);
      ctx.shadowBlur = 0;

      const barW = BASE_SIZE + 14;
      const barX = this.x - barW / 2;
      const barY = this.y - BASE_SIZE / 2 - 14;

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(barX, barY, barW, 5);
      ctx.fillStyle = color;
      ctx.fillRect(barX, barY, barW * hpRatio, 5);
    }
  }
}
