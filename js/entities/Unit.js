/**
 * Unit - 士兵實體類別，封裝 6 大兵種的行為邏輯、走位站線、優先序攻擊與外觀繪製
 * 暴龍 (trex) 支援 Asset_pack_Chimera 動態精靈圖序列幀播放 (idle/move/attack/dead)
 * 盾兵 (shield) 支援 warrior 動態精靈圖序列幀播放 (idle/move/attack/dead)
 * 騎兵 (cavalry) 支援 Cavalry 動態精靈圖序列幀播放 (idle/move/attack/dead) 與專屬打擊音效
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
    this.isDying = false; // 是否進入死亡動畫階段
    this.actionLock = null; // 'base' | 'unit' | 'territory'

    // 是否具備動態精靈圖動畫（暴龍、盾兵、騎兵）
    this.isAnimatedType = (type === 'trex' || type === 'shield' || type === 'cavalry');

    // 動態精靈圖動畫狀態控制 (idle / move / attack / dead)
    this.animState = 'idle';
    this.animFrame = 0;
  }

  /**
   * 切換動畫狀態（同狀態時不重置影格，除非是 attack 或 dead）
   * @param {'idle' | 'move' | 'attack' | 'dead'} newState
   * @param {boolean} forceReset
   */
  setAnimation(newState, forceReset = false) {
    if (this.animState === 'dead') return; // 死亡動畫不可中斷
    if (this.animState === 'attack' && newState !== 'dead' && !forceReset) return; // 攻擊動畫播完才切回

    if (this.animState !== newState || forceReset) {
      this.animState = newState;
      this.animFrame = 0;
    }
  }

  /**
   * 觸發攻擊動畫
   */
  triggerAttackAnimation() {
    this.setAnimation('attack', true);
  }

  /**
   * 扣除血量，若為精靈圖兵種血量歸零則進入死亡動畫階段
   * @param {number} amount
   */
  takeDamage(amount) {
    if (this.isDying) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      if (this.isAnimatedType) {
        this.isDying = true;
        this.setAnimation('dead', true);
      } else {
        this.alive = false;
      }
    }
  }

  /**
   * 動畫影格步進更新
   * @param {number} dtFactor
   * @param {SpriteManager} [spriteManager]
   */
  updateAnimation(dtFactor = 1, spriteManager = null) {
    if (!this.isAnimatedType) return;

    const charId = this.type === 'shield' ? 'warrior'
      : (this.type === 'cavalry' ? 'cavalry' : 'chimera');

    // 依角色與狀態決定影格播放速率 (以 60 FPS 為基準)
    let speed = 0.14;
    if (this.type === 'shield') {
      if (this.animState === 'move') speed = 0.18;
      else if (this.animState === 'attack') speed = 0.20;
      else if (this.animState === 'dead') speed = 0.14;
      else speed = 0.12; // idle
    } else if (this.type === 'cavalry') {
      if (this.animState === 'move') speed = 0.22; // 騎兵移動速度較快
      else if (this.animState === 'attack') speed = 0.20;
      else if (this.animState === 'dead') speed = 0.14;
      else speed = 0.12; // idle
    } else {
      // 暴龍 chimera
      if (this.animState === 'move') speed = 0.16;
      else if (this.animState === 'attack') speed = 0.22;
      else if (this.animState === 'dead') speed = 0.12;
    }

    this.animFrame += speed * dtFactor;

    const frameCount = spriteManager
      ? spriteManager.getFrameCount(charId, this.animState)
      : (this.animState === 'attack' ? 7 : this.animState === 'dead' ? 7 : 6);

    if (this.animState === 'dead') {
      if (this.animFrame >= frameCount - 0.05) {
        // 死亡動畫播畢，正式自陣列中除名
        this.animFrame = Math.max(0, frameCount - 1);
        this.alive = false;
      }
    } else if (this.animState === 'attack') {
      if (this.animFrame >= frameCount - 0.05) {
        // 攻擊動畫播畢，切換回定位待機或移動狀態
        this.animState = this.arrived ? 'idle' : 'move';
        this.animFrame = 0;
      }
    } else {
      // 循環播放 (idle 或 move)
      if (frameCount > 0) {
        this.animFrame %= frameCount;
      }
    }
  }

  /**
   * 更新走位站線與領地被蓋過之擊退邏輯
   * @param {number} boundaryX
   * @param {number} dtFactor
   */
  updateMovement(boundaryX, dtFactor = 1) {
    if (this.isDying) return;

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

      if (this.isAnimatedType) {
        this.setAnimation('move');
      }
    } else {
      this.x = desiredX;
      this.arrived = true;

      if (this.isAnimatedType) {
        this.setAnimation('idle');
      }
    }

    this.x = Math.max(6, Math.min(CANVAS_WIDTH - 6, this.x));
  }

  /**
   * 執行行動（治療、攻擊主堡、攻擊敵軍或攻擊領地）
   * @param {Object} ctxParams
   */
  updateAction({ now, units, bases, boundaryX, particleSystem, audioSystem, onTerritoryDamage, onBaseDamage }) {
    if (this.isDying || !this.arrived) return;
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
        if (!ally.alive || ally.isDying || ally.side !== this.side) continue;
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

    // 2. 戰鬥兵種：尋找已就位之最近敵兵（忽略瀕死中的兵種）
    let nearestEnemy = null;
    let nearestDist = Infinity;
    for (const enemy of units) {
      if (!enemy.alive || enemy.isDying || enemy.side === this.side || !enemy.arrived) continue;
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

    // 輔助函式：觸發攻擊音效與動畫
    const triggerAttack = () => {
      if (this.type === 'trex') {
        this.triggerAttackAnimation();
        audioSystem.playBigMonsterAttack();
      } else if (this.type === 'shield') {
        this.triggerAttackAnimation();
        audioSystem.playWarriorAttack();
      } else if (this.type === 'cavalry') {
        this.triggerAttackAnimation();
        audioSystem.playCavalryAttack();
      } else {
        audioSystem.playAttackSound(this.type);
      }
    };

    // 執行鎖定之行為
    if (action === 'base') {
      // 修正主堡扣血並即時同步遊戲頂部 HUD 與勝負判定
      if (onBaseDamage) {
        onBaseDamage(enemyBase, stats.damage);
      } else {
        enemyBase.takeDamage(stats.damage);
      }

      particleSystem.addAttackEffect(this.x, this.y, enemyBase.x, enemyBase.y, unitColor);
      triggerAttack();
      this.cooldownUntil = now + stats.cooldown;
      return;
    }

    if (action === 'unit') {
      nearestEnemy.takeDamage(stats.damage);
      particleSystem.addAttackEffect(this.x, this.y, nearestEnemy.x, nearestEnemy.y, unitColor);
      triggerAttack();
      this.cooldownUntil = now + stats.cooldown;

      // 暴龍機率性暈眩周圍敵軍
      if (this.type === 'trex' && Math.random() < TREX_STUN_CHANCE) {
        const enemyUnits = units.filter(e => e.alive && !e.isDying && e.side !== this.side);
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
      triggerAttack();
      this.cooldownUntil = now + stats.cooldown;

      if (onTerritoryDamage) {
        onTerritoryDamage(this.side, stats.damage);
      }
    }
  }

  /**
   * 繪製士兵外觀、武器示意線條、暈眩光環與血條
   * 暴龍 (trex) 升級為 Chimera 精靈圖序列幀播放
   * 盾兵 (shield) 升級為 Warrior 精靈圖序列幀播放
   * 騎兵 (cavalry) 升級為 Cavalry 精靈圖序列幀播放
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} now
   * @param {SpriteManager} [spriteManager]
   */
  render(ctx, now = performance.now(), spriteManager = null) {
    const type = this.type;
    const size = this.width;

    // 1. 盾兵 (warrior) 精靈圖渲染
    if (type === 'shield' && spriteManager && spriteManager.isLoaded) {
      const frameImg = spriteManager.getFrame('warrior', this.animState, this.animFrame);
      if (frameImg) {
        const drawW = 48;
        const drawH = 48;

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        // 腳下繪製陣營光圈，方便激烈戰場中辨識紅藍雙方
        ctx.fillStyle = this.side === 'blue' ? 'rgba(77, 184, 255, 0.35)' : 'rgba(255, 91, 91, 0.35)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + drawH / 2 - 4, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(this.x, this.y);

        // 藍方朝右 (scaleX: 1)，紅方鏡像朝左 (scaleX: -1)
        if (this.side === 'red') {
          ctx.scale(-1, 1);
        }

        ctx.drawImage(frameImg, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        // 暈眩狀態指示
        if (now < this.stunnedUntil && !this.isDying) {
          ctx.strokeStyle = 'rgba(255, 230, 60, 0.85)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(this.x, this.y, 18, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.lineWidth = 1;
        }

        // 血條繪製（死亡階段不顯示血條）
        if (!this.isDying) {
          const hpRatio = Math.max(0, this.hp / this.maxHp);
          const barW = 26;
          const barY = this.y - drawH / 2 - 6;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(this.x - barW / 2, barY, barW, 3);
          ctx.fillStyle = this.side === 'blue' ? '#7fd1ff' : '#ff9b9b';
          ctx.fillRect(this.x - barW / 2, barY, barW * hpRatio, 3);
        }
        return;
      }
    }

    // 2. 騎兵 (cavalry) 精靈圖渲染
    if (type === 'cavalry' && spriteManager && spriteManager.isLoaded) {
      const frameImg = spriteManager.getFrame('cavalry', this.animState, this.animFrame);
      if (frameImg) {
        const drawW = 48;
        const drawH = 48;

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        // 腳下陣營光圈
        ctx.fillStyle = this.side === 'blue' ? 'rgba(77, 184, 255, 0.35)' : 'rgba(255, 91, 91, 0.35)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + drawH / 2 - 4, 16, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(this.x, this.y);

        // 藍方朝右 (scaleX: 1)，紅方鏡像朝左 (scaleX: -1)
        if (this.side === 'red') {
          ctx.scale(-1, 1);
        }

        ctx.drawImage(frameImg, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        // 暈眩狀態指示
        if (now < this.stunnedUntil && !this.isDying) {
          ctx.strokeStyle = 'rgba(255, 230, 60, 0.85)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.lineWidth = 1;
        }

        // 血條繪製（死亡階段不顯示血條）
        if (!this.isDying) {
          const hpRatio = Math.max(0, this.hp / this.maxHp);
          const barW = 26;
          const barY = this.y - drawH / 2 - 6;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(this.x - barW / 2, barY, barW, 3);
          ctx.fillStyle = this.side === 'blue' ? '#7fd1ff' : '#ff9b9b';
          ctx.fillRect(this.x - barW / 2, barY, barW * hpRatio, 3);
        }
        return;
      }
    }

    // 3. 暴龍 (chimera) 精靈圖渲染
    if (type === 'trex' && spriteManager && spriteManager.isLoaded) {
      const frameImg = spriteManager.getFrame('chimera', this.animState, this.animFrame);
      if (frameImg) {
        const drawW = 128;
        const drawH = 64;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(this.x, this.y);

        // 藍方朝右 (scaleX: 1)，紅方鏡像朝左 (scaleX: -1)
        if (this.side === 'red') {
          ctx.scale(-1, 1);
        }

        ctx.drawImage(frameImg, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        // 暈眩狀態指示
        if (now < this.stunnedUntil && !this.isDying) {
          ctx.strokeStyle = 'rgba(255, 230, 60, 0.85)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(this.x, this.y, 36, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.lineWidth = 1;
        }

        // 血條繪製（死亡階段不顯示血條）
        if (!this.isDying) {
          const hpRatio = Math.max(0, this.hp / this.maxHp);
          const barW = 60;
          const barY = this.y - drawH / 2 - 8;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(this.x - barW / 2, barY, barW, 4);
          ctx.fillStyle = '#ffd700';
          ctx.fillRect(this.x - barW / 2, barY, barW * hpRatio, 4);
        }
        return;
      }
    }

    // 4. 其他基礎兵種維持幾何風格
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
      // 暴龍備用幾何繪製
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
