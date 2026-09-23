/**
 * Unit - 士兵實體類別，封裝 6 大兵種的行為邏輯、走位站線、優先序攻擊與外觀繪製
 */
import { Entity } from './Entity.js';
import {
  CANVAS_WIDTH,
  UNIT_STATS,
  UNIT_KNOCKBACK,
  TREX_STUN_CHANCE,
  TREX_STUN_COUNT,
  TREX_STUN_DURATION
} from '../config.js';

export class Unit extends Entity {
  /**
   * @param {string} side - 'blue' | 'red'
   * @param {string} type - 'archer' | 'sword' | 'cavalry' | 'shield' | 'mage' | 'trex'
   * @param {number} x
   * @param {number} y
   */
  constructor(side, type, x, y) {
    const stats = UNIT_STATS[type];
    const SHIELD_SIZE = 15;
    const size = type === 'archer' ? 11
      : type === 'shield' ? SHIELD_SIZE
      : type === 'cavalry' ? 12
      : type === 'mage' ? 13
      : type === 'trex' ? SHIELD_SIZE * 6
      : 13;

    super(x, y, size, size);

    this.side = side;
    this.type = type;
    this.hp = stats.hp;
    this.maxHp = stats.hp;
    this.cooldownUntil = 0;
    this.stunnedUntil = 0;
    this.wasOverrun = false;
    this.arrived = false;
    this.alive = true;
    this.actionLock = null; // 'base' | 'unit' | 'territory'
  }

  /**
   * 更新走位站線與領地被蓋過之擊退邏輯
   * @param {number} boundaryX
   * @param {number} dtFactor
   */
  updateMovement(boundaryX, dtFactor = 1) {
    const stats = UNIT_STATS[this.type];
    const stopGap = stats.stopGap;
    const speed = stats.speed;

    // 領地蓋過時擊退（不造成傷害），只在剛被蓋過的瞬間觸發一次
    const overrun = this.side === 'blue' ? (boundaryX < this.x) : (boundaryX > this.x);
    if (overrun && !this.wasOverrun) {
      this.x += this.side === 'blue' ? -UNIT_KNOCKBACK : UNIT_KNOCKBACK;
      this.arrived = false;
    }
    this.wasOverrun = overrun;

    // 走位：朝陣線前緣的固定站位移動
    const desiredX = this.side === 'blue' ? boundaryX - stopGap : boundaryX + stopGap;
    if (Math.abs(this.x - desiredX) > 2) {
      const dir = desiredX > this.x ? 1 : -1;
      this.x += dir * Math.min(speed * dtFactor, Math.abs(desiredX - this.x));
      this.arrived = false;
    } else {
      this.x = desiredX;
      this.arrived = true;
    }

    this.x = Math.max(6, Math.min(CANVAS_WIDTH - 6, this.x));
  }

  /**
   * 執行行動（治療、攻擊主堡、攻擊敵軍或攻擊領地）
   * @param {Object} ctxParams
   */
  updateAction({ now, units, bases, boundaryX, particleSystem, audioSystem, onTerritoryDamage }) {
    if (!this.arrived) return;
    if (now < this.cooldownUntil || now < this.stunnedUntil) return;

    const stats = UNIT_STATS[this.type];
    const unitColor = this.type === 'mage'
      ? '#c07dff'
      : this.type === 'trex'
        ? '#ffd700'
        : (this.side === 'blue' ? '#4db8ff' : '#ff5b5b');

    // 1. 法師：治療血量最低的同陣營兵種（不攻擊、不治療主堡）
    if (this.type === 'mage') {
      let lowest = null;
      for (const ally of units) {
        if (!ally.alive || ally.side !== this.side) continue;
        if (!lowest || ally.hp < lowest.hp) {
          lowest = ally;
        }
      }
      if (lowest) {
        lowest.hp = Math.min(lowest.maxHp, lowest.hp + stats.heal);
        particleSystem.addAttackEffect(this.x, this.y, lowest.x, lowest.y, '#8dffb0');
        audioSystem.playAttackSound('mage');
        this.cooldownUntil = now + stats.cooldown;
      }
      return;
    }

    // 2. 戰鬥兵種：尋找已就位之最近敵兵
    let nearestEnemy = null;
    let nearestDist = Infinity;
    for (const enemy of units) {
      if (!enemy.alive || enemy.side === this.side || !enemy.arrived) continue;
      const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearestEnemy = enemy;
      }
    }

    // 檢查主堡是否暴露
    const enemyBase = bases.find(b => b.side !== this.side);
    const baseExposed = this.side === 'blue' ? (boundaryX > enemyBase.x) : (boundaryX < enemyBase.x);
    const baseAttackable = baseExposed && enemyBase.hp > 0;
    const unitAttackable = !!nearestEnemy;

    let action;
    if (baseAttackable) {
      action = 'base';
    } else {
      action = this.actionLock;
      if (action === 'base') action = null;
      if (action === 'unit' && !unitAttackable) action = null;
      if (!action) {
        action = unitAttackable ? 'unit' : 'territory';
      }
    }
    this.actionLock = action;

    // 執行鎖定之行為
    if (action === 'base') {
      enemyBase.takeDamage(stats.damage);
      particleSystem.addAttackEffect(this.x, this.y, enemyBase.x, enemyBase.y, unitColor);
      audioSystem.playAttackSound(this.type);
      this.cooldownUntil = now + stats.cooldown;
      return;
    }

    if (action === 'unit') {
      nearestEnemy.hp -= stats.damage;
      particleSystem.addAttackEffect(this.x, this.y, nearestEnemy.x, nearestEnemy.y, unitColor);
      audioSystem.playAttackSound(this.type);
      this.cooldownUntil = now + stats.cooldown;

      if (nearestEnemy.hp <= 0) {
        nearestEnemy.alive = false;
      }

      // 暴龍機率性暈眩周圍敵軍
      if (this.type === 'trex' && Math.random() < TREX_STUN_CHANCE) {
        const enemyUnits = units.filter(e => e.alive && e.side !== this.side);
        enemyUnits.sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y));
        for (let i = 0; i < Math.min(TREX_STUN_COUNT, enemyUnits.length); i++) {
          enemyUnits[i].stunnedUntil = now + TREX_STUN_DURATION;
        }
      }
      return;
    }

    if (action === 'territory') {
      const reach = this.type === 'archer' ? 60 : 30;
      const effectTargetX = this.side === 'blue' ? this.x + reach : this.x - reach;
      particleSystem.addAttackEffect(this.x, this.y, effectTargetX, this.y, unitColor);
      audioSystem.playAttackSound(this.type);
      this.cooldownUntil = now + stats.cooldown;

      if (onTerritoryDamage) {
        onTerritoryDamage(this.side, stats.damage);
      }
    }
  }

  /**
   * 繪製士兵外觀、武器示意線條、暈眩光環與血條
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} now
   */
  render(ctx, now = performance.now()) {
    const type = this.type;
    const size = this.width;

    let color;
    if (type === 'mage') color = '#c07dff';
    else if (type === 'trex') color = '#ffd700';
    else color = this.side === 'blue' ? '#7fd1ff' : '#ff9b9b';

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;

    if (type === 'archer') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.x + (this.side === 'blue' ? 6 : -6), this.y, 6, Math.PI * 0.3, Math.PI * 1.7);
      ctx.stroke();
      ctx.lineWidth = 1;
    } else if (type === 'sword') {
      ctx.fillRect(this.x - size / 2, this.y - size / 2, size, size);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - size / 2 - 8);
      ctx.lineTo(this.x, this.y + size / 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    } else if (type === 'cavalry') {
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, size * 0.9, size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const dx = this.side === 'blue' ? size : -size;
      ctx.moveTo(this.x - dx * 0.5, this.y - size * 0.6);
      ctx.lineTo(this.x + dx * 0.7, this.y);
      ctx.stroke();
      ctx.lineWidth = 1;
    } else if (type === 'shield') {
      ctx.fillRect(this.x - size / 2, this.y - size / 2, size, size);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const shieldX = this.x + (this.side === 'blue' ? size / 2 + 3 : -(size / 2 + 3));
      ctx.arc(shieldX, this.y, size * 0.55, Math.PI * 0.2, Math.PI * 1.8);
      ctx.stroke();
      ctx.lineWidth = 1;
    } else if (type === 'mage') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - size / 2 - 10);
      ctx.lineTo(this.x, this.y + size / 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(this.x, this.y - size / 2 - 10, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
    } else if (type === 'trex') {
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, size * 0.5, size * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      const headX = this.x + (this.side === 'blue' ? size * 0.42 : -size * 0.42);
      ctx.beginPath();
      ctx.ellipse(headX, this.y - size * 0.08, size * 0.2, size * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, size * 0.5, size * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    ctx.shadowBlur = 0;

    // 暈眩狀態指示
    if (now < this.stunnedUntil) {
      ctx.strokeStyle = 'rgba(255, 230, 60, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, size / 2 + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
    }

    // 血條繪製
    const hpRatio = Math.max(0, this.hp / this.maxHp);
    const barW = type === 'trex' ? 50 : 22;
    const barY = this.y - size / 2 - 14;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(this.x - barW / 2, barY, barW, 3);
    ctx.fillStyle = color;
    ctx.fillRect(this.x - barW / 2, barY, barW * hpRatio, 3);
  }
}
