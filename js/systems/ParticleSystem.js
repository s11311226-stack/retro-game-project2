/**
 * ParticleSystem - 管理火花粒子、黃金球光跡、牆面撞擊光效與攻擊射線特效
 */
import {
  CANVAS_HEIGHT,
  WALL_FLASH_DURATION,
  PARTICLE_COUNT,
  ATTACK_EFFECT_DURATION,
  GOLDEN_BALL_COLOR
} from '../config.js';

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.wallFlashes = [];
    this.attackEffects = [];
    this.arrows = [];
    this.turretBullets = [];
  }

  clear() {
    this.particles = [];
    this.wallFlashes = [];
    this.attackEffects = [];
    this.arrows = [];
    this.turretBullets = [];
  }

  /**
   * 觸發出界爆炸火花粒子
   * @param {number} x
   * @param {number} y
   * @param {string} color
   */
  spawnMissParticles(x, y, color) {
    const now = performance.now();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color || '#fff',
        startTime: now,
        maxLife: 400 + Math.random() * 350
      });
    }
  }

  /**
   * 產生黃金球移動尾跡微粒
   * @param {number} x
   * @param {number} y
   */
  spawnGoldenTrail(x, y) {
    this.particles.push({
      x, y,
      vx: (Math.random() * 2 - 1) * 0.3,
      vy: (Math.random() * 2 - 1) * 0.3,
      color: GOLDEN_BALL_COLOR,
      startTime: performance.now(),
      maxLife: 260 + Math.random() * 140
    });
  }

  /**
   * 觸發球體撞擊上下牆壁的亮光特效
   * @param {number} x
   * @param {boolean} isTop
   */
  triggerWallFlash(x, isTop) {
    this.wallFlashes.push({
      x,
      top: isTop,
      time: performance.now()
    });
  }

  /**
   * 建立兵種/砲台攻擊或治療特效線段
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @param {string} color
   */
  addAttackEffect(x1, y1, x2, y2, color) {
    this.attackEffects.push({
      x1, y1, x2, y2,
      color,
      time: performance.now()
    });
  }

  /**
   * 產生弓兵拋物線飛行箭矢
   * @param {number} startX
   * @param {number} startY
   * @param {number} targetX
   * @param {number} targetY
   * @param {Function} [onHit] - 抵達目標時回呼
   */
  spawnArrow(startX, startY, targetX, targetY, onHit = null) {
    const dist = Math.hypot(targetX - startX, targetY - startY);
    const duration = Math.max(260, Math.min(550, dist * 1.5));
    const arcHeight = Math.max(25, Math.min(75, dist * 0.22));
    this.arrows.push({
      startX,
      startY,
      targetX,
      targetY,
      arcHeight,
      startTime: performance.now(),
      duration,
      onHit
    });
  }

  /**
   * 產生砲台 5 連發機槍子彈
   * @param {number} startX
   * @param {number} startY
   * @param {import('../entities/Unit.js').Unit} targetUnit
   * @param {Function} [onHitCallback]
   */
  spawnTurretBullets(startX, startY, targetUnit, onHitCallback = null) {
    const now = performance.now();
    const count = 5;
    const interval = 160; // 160ms 間隔連發（由原本 55ms 放慢，節奏分明）
    const dist = Math.hypot(targetUnit.x - startX, targetUnit.y - startY);
    const duration = Math.max(380, Math.min(700, dist * 1.5)); // 飛行速度放緩，彈道軌跡清晰可辨

    for (let i = 0; i < count; i++) {
      this.turretBullets.push({
        startX,
        startY,
        target: targetUnit,
        targetX: targetUnit.x,
        targetY: targetUnit.y,
        startTime: now + i * interval,
        duration,
        damage: 0.2,
        onHit: onHitCallback
      });
    }
  }

  /**
   * 物理與生命週期更新
   * @param {number} dtFactor
   */
  update(dtFactor = 1) {
    const now = performance.now();

    // 更新粒子位移與衰減
    this.particles = this.particles.filter(p => now - p.startTime < p.maxLife);
    for (const p of this.particles) {
      p.x += p.vx * dtFactor;
      p.y += p.vy * dtFactor;
      p.vx *= Math.pow(0.95, dtFactor);
      p.vy *= Math.pow(0.95, dtFactor);
    }

    // 清理過期的牆壁亮光與攻擊射線
    this.wallFlashes = this.wallFlashes.filter(f => now - f.time < WALL_FLASH_DURATION);
    this.attackEffects = this.attackEffects.filter(e => now - e.time < ATTACK_EFFECT_DURATION);

    // 更新弓兵飛行箭矢
    const survivingArrows = [];
    for (const a of this.arrows) {
      const elapsed = now - a.startTime;
      const t = elapsed / a.duration;
      if (t >= 1) {
        if (a.onHit) a.onHit();
        // 箭矢命中火花
        for (let i = 0; i < 6; i++) {
          const angle = Math.random() * Math.PI * 2;
          this.particles.push({
            x: a.targetX,
            y: a.targetY,
            vx: Math.cos(angle) * (1.2 + Math.random() * 2.2),
            vy: Math.sin(angle) * (1.2 + Math.random() * 2.2),
            color: '#ffd166',
            startTime: now,
            maxLife: 220
          });
        }
      } else {
        survivingArrows.push(a);
      }
    }
    this.arrows = survivingArrows;

    // 更新砲台機槍子彈
    const survivingBullets = [];
    for (const b of this.turretBullets) {
      if (now < b.startTime) {
        survivingBullets.push(b);
        continue;
      }

      if (b.target && b.target.alive && !b.target.isDying) {
        b.targetX = b.target.x;
        b.targetY = b.target.y;
      }

      const elapsed = now - b.startTime;
      const t = elapsed / b.duration;
      if (t >= 1) {
        if (b.target && b.target.alive && !b.target.isDying) {
          b.target.takeDamage(b.damage);
          if (b.onHit) b.onHit(b.target);
        }
        // 子彈命中微型火花
        for (let i = 0; i < 4; i++) {
          const angle = Math.random() * Math.PI * 2;
          this.particles.push({
            x: b.targetX,
            y: b.targetY,
            vx: Math.cos(angle) * (1.5 + Math.random() * 2.5),
            vy: Math.sin(angle) * (1.5 + Math.random() * 2.5),
            color: '#ffe066',
            startTime: now,
            maxLife: 180
          });
        }
      } else {
        survivingBullets.push(b);
      }
    }
    this.turretBullets = survivingBullets;
  }

  /**
   * 繪製所有特效
   * @param {CanvasRenderingContext2D} ctx
   * @param {SpriteManager} [spriteManager]
   */
  render(ctx, spriteManager = null) {
    const now = performance.now();

    // 1. 繪製牆壁碰撞亮光
    for (const f of this.wallFlashes) {
      const p = (now - f.time) / WALL_FLASH_DURATION;
      const alpha = 1 - p;
      const flashW = 46, flashH = 12;
      ctx.fillStyle = `rgba(255,255,255,${(alpha * 0.9).toFixed(3)})`;
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 22 * alpha;
      const y = f.top ? 0 : CANVAS_HEIGHT - flashH;
      ctx.fillRect(f.x - flashW / 2, y, flashW, flashH);
      ctx.shadowBlur = 0;
    }

    // 2. 繪製粒子
    for (const p of this.particles) {
      const t = (now - p.startTime) / p.maxLife;
      const alpha = Math.max(0, 1 - t);
      const size = 4 * alpha + 1;

      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8 * alpha;
      ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    // 3. 繪製攻擊/治療射線
    for (const e of this.attackEffects) {
      const p = (now - e.time) / ATTACK_EFFECT_DURATION;
      ctx.strokeStyle = e.color;
      ctx.globalAlpha = Math.max(0, 1 - p);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(e.x1, e.y1);
      ctx.lineTo(e.x2, e.y2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
    }

    // 4. 繪製弓兵拋物線飛行箭矢
    const arrowImg = spriteManager?.getImage('arrow_preview');
    for (const a of this.arrows) {
      const elapsed = now - a.startTime;
      const t = Math.max(0, Math.min(1, elapsed / a.duration));
      const curX = a.startX + (a.targetX - a.startX) * t;
      const baseY = a.startY + (a.targetY - a.startY) * t;
      const arc = 4 * a.arcHeight * t * (1 - t);
      const curY = baseY - arc;

      // 藉由微小步進計算當前切線向量與旋轉角度
      const dt = 0.015;
      const nextT = Math.min(1, t + dt);
      const nextX = a.startX + (a.targetX - a.startX) * nextT;
      const nextY = a.startY + (a.targetY - a.startY) * nextT - 4 * a.arcHeight * nextT * (1 - nextT);
      const angle = Math.atan2(nextY - curY, nextX - curX);

      ctx.save();
      ctx.translate(curX, curY);
      ctx.rotate(angle);

      if (arrowImg) {
        const drawW = 32;
        const drawH = 12;
        ctx.drawImage(arrowImg, -drawW / 2, -drawH / 2, drawW, drawH);
      } else {
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(-12, -2, 24, 4);
      }
      ctx.restore();
    }

    // 5. 繪製砲台機槍子彈 bullet.png
    const bulletImg = spriteManager?.getImage('bullet');
    for (const b of this.turretBullets) {
      if (now < b.startTime) continue;
      const elapsed = now - b.startTime;
      const t = Math.max(0, Math.min(1, elapsed / b.duration));
      const curX = b.startX + (b.targetX - b.startX) * t;
      const curY = b.startY + (b.targetY - b.startY) * t;
      const angle = Math.atan2(b.targetY - b.startY, b.targetX - b.startX);

      ctx.save();
      ctx.translate(curX, curY);
      ctx.rotate(angle);

      if (bulletImg && bulletImg.complete) {
        const drawW = 18;
        const drawH = 14;
        ctx.drawImage(bulletImg, -drawW / 2, -drawH / 2, drawW, drawH);
      } else {
        ctx.fillStyle = '#ffe066';
        ctx.fillRect(-7, -2.5, 14, 5);
      }
      ctx.restore();
    }
  }
}
