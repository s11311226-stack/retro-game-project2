/**
 * Paddle - 玩家與電腦球拍實體，封裝移動、AI 跟隨、大招飛行旋轉與幾何變換
 */
import { Entity } from './Entity.js';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PADDLE_W,
  PADDLE_H,
  PADDLE_SPEED,
  SKILL_COOLDOWN,
  SKILL_FLY_TIME,
  SKILL_SPIN_TIME_PER_ROT
} from '../config.js';

export class Paddle extends Entity {
  /**
   * @param {string} side - 'blue' | 'red'
   */
  constructor(side) {
    const homeX = side === 'blue' ? 0 : CANVAS_WIDTH - PADDLE_W;
    const initialY = CANVAS_HEIGHT / 2 - PADDLE_H / 2;
    super(homeX, initialY, PADDLE_W, PADDLE_H);

    this.side = side;
    this.homeX = homeX;
    this.skill = {
      active: false,
      startTime: 0,
      rotations: 0,
      cooldownUntil: 0
    };
  }

  reset() {
    this.y = CANVAS_HEIGHT / 2 - PADDLE_H / 2;
    this.skill = {
      active: false,
      startTime: 0,
      rotations: 0,
      cooldownUntil: 0
    };
  }

  /**
   * 觸發技能
   * @param {number} now
   * @returns {boolean} 是否成功施放
   */
  activateSkill(now = performance.now()) {
    if (this.skill.active || now < this.skill.cooldownUntil) {
      return false;
    }
    this.skill.active = true;
    this.skill.startTime = now;
    this.skill.rotations = 2 + Math.floor(Math.random() * 4); // 2~5 圈
    this.skill.cooldownUntil = now + SKILL_COOLDOWN;
    return true;
  }

  /**
   * 取得技能冷卻狀態字串
   * @param {number} now
   * @returns {string}
   */
  getSkillStatusText(now = performance.now()) {
    if (this.skill.active) return '技能中！';
    const remain = (this.skill.cooldownUntil - now) / 1000;
    if (remain > 0) return `冷卻 ${remain.toFixed(1)}s`;
    return '就緒';
  }

  /**
   * 取得包含技能狀態（放大、中心飛行、旋轉）在內的實際外框
   * @param {number} now
   */
  getRect(now = performance.now()) {
    const baseCenterY = this.y + PADDLE_H / 2;
    let w = PADDLE_W;
    let h = PADDLE_H;
    let x = this.homeX;
    let rotation = 0;
    let active = false;

    if (this.skill.active) {
      const elapsed = now - this.skill.startTime;
      const spinTime = this.skill.rotations * SKILL_SPIN_TIME_PER_ROT;
      const totalTime = SKILL_FLY_TIME * 2 + spinTime;

      if (elapsed >= totalTime) {
        this.skill.active = false; // 技能飛行旋轉結束，冷卻時間繼續計時
      } else {
        active = true;
        w = PADDLE_W * 2;
        h = PADDLE_H * 2;
        const centerX = CANVAS_WIDTH / 2 - w / 2;

        if (elapsed < SKILL_FLY_TIME) {
          // 飛往中央
          const t = elapsed / SKILL_FLY_TIME;
          x = this.homeX + (centerX - this.homeX) * t;
        } else if (elapsed < SKILL_FLY_TIME + spinTime) {
          // 在中央旋轉
          x = centerX;
        } else {
          // 飛回原位
          const t = (elapsed - SKILL_FLY_TIME - spinTime) / SKILL_FLY_TIME;
          x = centerX + (this.homeX - centerX) * t;
        }
        rotation = (elapsed / totalTime) * this.skill.rotations * Math.PI * 2;
      }
    }

    const y = baseCenterY - h / 2;
    return { x, y, w, h, rotation, active };
  }

  /**
   * 玩家手動移動更新
   * @param {boolean} moveUp
   * @param {boolean} moveDown
   * @param {number} dtFactor
   */
  moveManual(moveUp, moveDown, dtFactor = 1) {
    if (moveUp) this.y -= PADDLE_SPEED * dtFactor;
    if (moveDown) this.y += PADDLE_SPEED * dtFactor;
    this.clampY();
  }

  /**
   * 滑鼠控制左拍移動
   * @param {number} mouseY
   */
  moveToMouse(mouseY) {
    this.y = mouseY - PADDLE_H / 2;
    this.clampY();
  }

  /**
   * AI 自主追球演算法
   * @param {Array} balls
   * @param {Object} profile
   * @param {number} dtFactor
   */
  moveWithAI(balls, profile, dtFactor = 1) {
    if (!balls || balls.length === 0) return;

    // 優先挑選正朝右側飛來、且離右側球拍最近的球
    let best = null;
    for (const b of balls) {
      if (b.vx > 0) {
        if (!best || b.x > best.x) {
          best = b;
        }
      }
    }
    const target = best || balls[0];
    const targetCenter = target.y;
    const paddleCenter = this.y + PADDLE_H / 2;

    if (Math.abs(targetCenter - paddleCenter) > profile.deadzone) {
      if (targetCenter < paddleCenter) {
        this.y -= profile.speed * dtFactor;
      } else {
        this.y += profile.speed * dtFactor;
      }
    }
    this.clampY();
  }

  clampY() {
    this.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_H, this.y));
  }

  /**
   * 繪製球拍
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} now
   */
  render(ctx, now = performance.now()) {
    const rect = this.getRect(now);
    const baseColor = '#0f0';
    const activeColor = this.side === 'blue' ? '#4db8ff' : '#ff5b5b';
    const color = rect.active ? activeColor : baseColor;
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rect.rotation);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = rect.active ? 18 : 8;
    ctx.fillRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
    ctx.restore();
    ctx.shadowBlur = 0;
  }
}
