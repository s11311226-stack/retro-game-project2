/**
 * Turret - 陣營砲台實體，維護存活狀態、領地淹沒檢測與爆炸光圈特效
 */
import { Entity } from './Entity.js';
import { TURRET_SIZE } from '../config.js';

export class Turret extends Entity {
  /**
   * @param {number} x
   * @param {number} y
   * @param {string} side - 'blue' | 'red'
   */
  constructor(x, y, side) {
    super(x, y, TURRET_SIZE, TURRET_SIZE);
    this.side = side;
    this.alive = true;
    this.destroyedAt = null;
    this.isAttacking = false;
    this.attackStartTime = 0;
    this.attackDuration = 350; // 毫秒 (3幀 turret-1v 動畫)
  }

  /**
   * 觸發砲台攻擊動作（切換為 turret-1v 攻擊動畫）
   * @param {number} now
   */
  triggerAttack(now = performance.now()) {
    this.isAttacking = true;
    this.attackStartTime = now;
  }

  /**
   * 狀態更新
   * @param {number} dtFactor
   * @param {number} now
   */
  update(dtFactor = 1, now = performance.now()) {
    if (this.isAttacking && now - this.attackStartTime >= this.attackDuration) {
      this.isAttacking = false;
    }
  }

  /**
   * 檢查是否被敵方推進的領地邊界淹沒
   * @param {number} boundaryX
   * @param {number} now
   */
  checkSubmerged(boundaryX, now = performance.now()) {
    if (!this.alive) return;

    if (this.side === 'blue' && boundaryX < this.x) {
      this.alive = false;
      this.destroyedAt = now;
    } else if (this.side === 'red' && boundaryX > this.x) {
      this.alive = false;
      this.destroyedAt = now;
    }
  }

  /**
   * 繪製砲台（正常狀態 turret1、攻擊狀態 turret-1v 序列幀）與自毀動畫
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} now
   * @param {import('../systems/SpriteManager.js').SpriteManager} [spriteManager]
   */
  render(ctx, now = performance.now(), spriteManager = null) {
    if (this.alive) {
      const isRed = (this.side === 'red');
      const isAttackingNow = this.isAttacking && (now - this.attackStartTime < this.attackDuration);

      if (isAttackingNow && spriteManager) {
        const elapsed = now - this.attackStartTime;
        const frameIdx = Math.min(2, Math.floor(elapsed / (this.attackDuration / 3)));
        const attackImg = spriteManager.getFrame('turret', 'attack', frameIdx);

        if (attackImg && attackImg.complete) {
          const drawW = 46;
          const drawH = 40;
          ctx.save();
          ctx.translate(this.x, this.y);
          if (isRed) ctx.scale(-1, 1);
          ctx.drawImage(attackImg, -drawW / 2, -drawH / 2, drawW, drawH);
          ctx.restore();
          return;
        }
      }

      const idleImg = spriteManager?.getImage('turret1');
      if (idleImg && idleImg.complete) {
        const drawW = 46;
        const drawH = 38;
        ctx.save();
        ctx.translate(this.x, this.y);
        if (isRed) ctx.scale(-1, 1);
        ctx.drawImage(idleImg, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
        return;
      }

      // 圖片未載入時的幾何三角形備援
      const color = this.side === 'blue' ? '#4db8ff' : '#ff5b5b';
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - TURRET_SIZE / 2);
      ctx.lineTo(this.x + TURRET_SIZE / 2, this.y + TURRET_SIZE / 2);
      ctx.lineTo(this.x - TURRET_SIZE / 2, this.y + TURRET_SIZE / 2);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (this.destroyedAt !== null && now - this.destroyedAt < 400) {
      const p = (now - this.destroyedAt) / 400;
      ctx.strokeStyle = `rgba(255,190,60,${(1 - p).toFixed(3)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, TURRET_SIZE / 2 + p * 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }
}
