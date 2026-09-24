/**
 * Game - 遊戲主控制器與狀態機
 * 協調所有實體生命週期、物理碰撞、音效、粒子、精靈圖與介面繪製
 */
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PADDLE_W,
  AI_PROFILES,
  DIFFICULTY_LABELS,
  TERRITORY_MARGIN,
  TERRITORY_HP_MAX,
  TERRITORY_ADVANCE_STEP,
  BONUS_TERRITORY_SHIFT,
  TURRET_BASE_OFFSET,
  TURRET_SPACING,
  TURRET_DAMAGE,
  TURRET_FIRE_CHANCE,
  TURRET_Y,
  BASE_HP,
  BASE_OFFSET,
  CLONE_BALL_CHANCE,
  PURPLE_BALL_CHANCE,
  GOLDEN_BALL_CHANCE,
  GOLDEN_BALL_SIZE,
  PURPLE_BALL_COLOR,
  GOLDEN_BALL_COLOR,
  BONUS_BALL_SPEED,
  SPEED_RAMP_TIME,
  SPEED_RAMP_MAX_MULT,
  UNIT_TYPES
} from '../config.js';

import { Paddle } from '../entities/Paddle.js';
import { Ball } from '../entities/Ball.js';
import { Turret } from '../entities/Turret.js';
import { Base } from '../entities/Base.js';
import { Unit } from '../entities/Unit.js';
import { Physics } from '../systems/Physics.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { SpriteManager } from '../systems/SpriteManager.js';
import { HUD } from '../ui/HUD.js';

export class Game {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {InputHandler} inputHandler
   */
  constructor(canvas, inputHandler) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.inputHandler = inputHandler;

    // 系統初始化
    this.audioSystem = new AudioSystem();
    this.particleSystem = new ParticleSystem();
    this.spriteManager = new SpriteManager();
    this.hud = new HUD();

    // 預載入自訂精靈圖與音訊資源
    this.spriteManager.loadAll();
    this.audioSystem.loadAudioFiles();

    // 遊戲狀態與參數
    this.mode = '1P'; // '1P' | '2P'
    this.difficulty = 'NORMAL'; // 'EASY' | 'NORMAL' | 'HARD'
    this.state = 'START'; // 'START' | 'PLAYING' | 'GAMEOVER'
    this.winnerText = '';

    // 領地與主堡血量
    this.boundaryX = CANVAS_WIDTH / 2;
    this.targetBoundaryX = CANVAS_WIDTH / 2;
    this.blueTerritoryHp = TERRITORY_HP_MAX;
    this.redTerritoryHp = TERRITORY_HP_MAX;
    this.lastBlueHp = BASE_HP;
    this.lastRedHp = BASE_HP;

    // 計時器
    this.matchStartTime = 0;
    this.rallyStartTime = 0;

    // 實體清單
    this.bluePaddle = new Paddle('blue');
    this.redPaddle = new Paddle('red');
    this.balls = [Ball.create(Math.random() < 0.5 ? 1 : -1)];
    this.turrets = this.createTurrets();
    this.bases = this.createBases();
    this.units = [];

    this.bindInputEvents();
    this.updateHUD();
  }

  createTurrets() {
    const list = [];
    for (let i = 0; i < 2; i++) {
      const offset = TURRET_BASE_OFFSET + i * TURRET_SPACING;
      list.push(new Turret(CANVAS_WIDTH / 2 - offset, TURRET_Y, 'blue'));
      list.push(new Turret(CANVAS_WIDTH / 2 + offset, TURRET_Y, 'red'));
    }
    return list;
  }

  createBases() {
    return [
      new Base(CANVAS_WIDTH / 2 - BASE_OFFSET, TURRET_Y, 'blue'),
      new Base(CANVAS_WIDTH / 2 + BASE_OFFSET, TURRET_Y, 'red')
    ];
  }

  bindInputEvents() {
    // 空白鍵：開始 / 重新開始
    this.inputHandler.onAction(' ', () => {
      this.audioSystem.resumeIfNeeded();
      if (this.state === 'START' || this.state === 'GAMEOVER') {
        this.startGame();
      }
    });

    // 模式切換
    this.inputHandler.onAction('1', () => { this.mode = '1P'; });
    this.inputHandler.onAction('2', () => { this.mode = '2P'; });

    // 難度切換
    this.inputHandler.onAction('3', () => { this.difficulty = 'EASY'; });
    this.inputHandler.onAction('4', () => { this.difficulty = 'NORMAL'; });
    this.inputHandler.onAction('5', () => { this.difficulty = 'HARD'; });

    // 技能快捷鍵
    this.inputHandler.onAction(['e', 'E'], () => {
      if (this.state === 'PLAYING') {
        this.bluePaddle.activateSkill();
      }
    });
    this.inputHandler.onAction(['l', 'L'], () => {
      if (this.state === 'PLAYING') {
        this.redPaddle.activateSkill();
      }
    });
  }

  startGame() {
    this.bluePaddle.reset();
    this.redPaddle.reset();
    this.balls = [Ball.create(Math.random() < 0.5 ? 1 : -1)];

    this.matchStartTime = performance.now();
    this.rallyStartTime = this.matchStartTime;
    this.boundaryX = CANVAS_WIDTH / 2;
    this.targetBoundaryX = CANVAS_WIDTH / 2;
    this.blueTerritoryHp = TERRITORY_HP_MAX;
    this.redTerritoryHp = TERRITORY_HP_MAX;
    this.lastBlueHp = BASE_HP;
    this.lastRedHp = BASE_HP;

    this.turrets = this.createTurrets();
    this.bases = this.createBases();
    this.units = [];
    this.particleSystem.clear();

    this.state = 'PLAYING';
    this.updateHUD();
  }

  computeSpeedFactor() {
    const elapsed = performance.now() - this.rallyStartTime;
    const t = Math.min(1, elapsed / SPEED_RAMP_TIME);
    return 1 + t * (SPEED_RAMP_MAX_MULT - 1);
  }

  updateHUD() {
    const blueBase = this.bases.find(b => b.side === 'blue');
    const redBase = this.bases.find(b => b.side === 'red');
    if (blueBase && redBase) {
      this.hud.updateDOM(blueBase.hp, redBase.hp, this.units.length);
    }
  }

  trySpawnUnit(side) {
    const homeX = side === 'blue' ? PADDLE_W + 12 : CANVAS_WIDTH - PADDLE_W - 12;
    const baseY = TURRET_Y + (Math.random() * 2 - 1) * 90;
    const type = UNIT_TYPES[Math.floor(Math.random() * UNIT_TYPES.length)];
    this.units.push(new Unit(side, type, homeX, baseY));
  }

  spawnMage(side) {
    const homeX = side === 'blue' ? PADDLE_W + 12 : CANVAS_WIDTH - PADDLE_W - 12;
    const baseY = TURRET_Y + (Math.random() * 2 - 1) * 90;
    this.units.push(new Unit(side, 'mage', homeX, baseY));
  }

  spawnTrex(side) {
    const homeX = side === 'blue' ? PADDLE_W + 12 : CANVAS_WIDTH - PADDLE_W - 12;
    const baseY = TURRET_Y + (Math.random() * 2 - 1) * 90;
    this.units.push(new Unit(side, 'trex', homeX, baseY));

    // 暴龍被招喚出來時播放音效 monster_roar
    this.audioSystem.playMonsterRoar();
  }

  fireTurrets(side, outBalls) {
    const color = side === 'blue' ? '#39ff6a' : '#ffe030';
    const dir = side === 'blue' ? 1 : -1;
    for (const t of this.turrets) {
      if (t.side === side && t.alive && Math.random() < TURRET_FIRE_CHANCE) {
        outBalls.push(new Ball(t.x, t.y, BONUS_BALL_SPEED * dir, 0, {
          type: 'bonus',
          color,
          spawnTime: performance.now()
        }));
      }
    }
  }

  turretAttackEnemyUnits(side) {
    let anyDied = false;
    for (const t of this.turrets) {
      if (t.side !== side || !t.alive) continue;

      let target = null;
      let bestDist = Infinity;
      for (const u of this.units) {
        if (!u.alive || u.isDying || u.side === side || !u.arrived) continue;
        const d = Math.hypot(u.x - t.x, u.y - t.y);
        if (d < bestDist) {
          bestDist = d;
          target = u;
        }
      }

      if (target) {
        target.takeDamage(TURRET_DAMAGE);
        this.particleSystem.addAttackEffect(
          t.x, t.y, target.x, target.y,
          t.side === 'blue' ? '#4db8ff' : '#ff5b5b'
        );
        this.audioSystem.playAttackSound('turret');
        if (!target.alive) {
          anyDied = true;
        }
      }
    }

    if (anyDied) {
      this.units = this.units.filter(u => u.alive);
      this.updateHUD();
    }
  }

  handleTerritoryDamage(attackerSide, damage) {
    if (attackerSide === 'blue') {
      this.redTerritoryHp -= damage;
      if (this.redTerritoryHp <= 0) {
        this.redTerritoryHp = TERRITORY_HP_MAX;
        this.targetBoundaryX = Math.max(
          TERRITORY_MARGIN,
          Math.min(CANVAS_WIDTH - TERRITORY_MARGIN, this.targetBoundaryX + TERRITORY_ADVANCE_STEP)
        );
      }
    } else {
      this.blueTerritoryHp -= damage;
      if (this.blueTerritoryHp <= 0) {
        this.blueTerritoryHp = TERRITORY_HP_MAX;
        this.targetBoundaryX = Math.max(
          TERRITORY_MARGIN,
          Math.min(CANVAS_WIDTH - TERRITORY_MARGIN, this.targetBoundaryX - TERRITORY_ADVANCE_STEP)
        );
      }
    }
  }

  handleBaseDamage(enemyBase, damage) {
    enemyBase.takeDamage(damage);
    this.updateHUD();
    this.checkBaseDestruction();
  }

  checkBaseDestruction() {
    if (this.state !== 'PLAYING') return;

    const blueBase = this.bases.find(b => b.side === 'blue');
    const redBase = this.bases.find(b => b.side === 'red');

    if (blueBase && blueBase.hp <= 0) {
      blueBase.hp = 0;
      this.winnerText = '紅方摧毀藍方主堡，紅方獲勝！';
      this.state = 'GAMEOVER';
      this.updateHUD();
    } else if (redBase && redBase.hp <= 0) {
      redBase.hp = 0;
      this.winnerText = '藍方摧毀紅方主堡，藍方獲勝！';
      this.state = 'GAMEOVER';
      this.updateHUD();
    }
  }

  updatePaddles(dtFactor) {
    // 左拍：滑鼠優先，若未移動滑鼠則支援 W/S 鍵盤操作
    if (this.inputHandler.isMouseActive()) {
      this.bluePaddle.moveToMouse(this.inputHandler.getMouseY());
    } else {
      const up = this.inputHandler.isKeyDown('w') || this.inputHandler.isKeyDown('W');
      const down = this.inputHandler.isKeyDown('s') || this.inputHandler.isKeyDown('S');
      this.bluePaddle.moveManual(up, down, dtFactor);
    }

    // 右拍：雙人模式下由箭頭鍵控制，單人模式下由 AI 演算法追球
    if (this.mode === '2P') {
      const up = this.inputHandler.isKeyDown('ArrowUp');
      const down = this.inputHandler.isKeyDown('ArrowDown');
      this.redPaddle.moveManual(up, down, dtFactor);
    } else {
      const profile = AI_PROFILES[this.difficulty];
      this.redPaddle.moveWithAI(this.balls, profile, dtFactor);
    }
  }

  updateBalls(dtFactor) {
    const now = performance.now();
    const survivors = [];
    const spawned = [];
    const speedFactor = this.computeSpeedFactor();

    const blueRect = this.bluePaddle.getRect(now);
    const redRect = this.redPaddle.getRect(now);

    for (const ball of this.balls) {
      ball.update(speedFactor, dtFactor, this.particleSystem);

      // 上下牆壁碰撞
      Physics.resolveWallBounce(ball, this.particleSystem, this.audioSystem);

      // 球拍碰撞判定（支援大招飛行放大旋轉幾何框）
      Physics.resolvePaddleHit(ball, blueRect);
      Physics.resolvePaddleHit(ball, redRect);

      // 出界與存活狀態判定
      const status = Physics.checkBallStatus(ball, now);

      if (status === 'inBounds') {
        survivors.push(ball);
        continue;
      }

      if (status === 'expired') {
        // 砲彈逾時未被接住直接消失
        continue;
      }

      // 飛出邊界特效與音效
      const exitedLeft = status === 'left';
      this.particleSystem.spawnMissParticles(exitedLeft ? 0 : CANVAS_WIDTH, ball.y, ball.color || '#fff');
      this.audioSystem.playMissSound();

      if (this.state !== 'PLAYING') {
        if (ball.type === 'main') survivors.push(ball);
        continue;
      }

      // 重置球速加速基準
      this.rallyStartTime = now;
      const dir = exitedLeft ? 1 : -1;

      if (ball.type === 'main') {
        // 白球出界：得利方砲台觸發、支援兵種生成
        if (exitedLeft) {
          this.fireTurrets('red', spawned);
          this.turretAttackEnemyUnits('red');
          this.trySpawnUnit('red');
        } else {
          this.fireTurrets('blue', spawned);
          this.turretAttackEnemyUnits('blue');
          this.trySpawnUnit('blue');
        }

        // 紫色球 / 黃金球 生成判定
        if (Math.random() < PURPLE_BALL_CHANCE) {
          spawned.push(Ball.create(dir, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, {
            type: 'purple',
            color: PURPLE_BALL_COLOR
          }));
        }
        if (Math.random() < GOLDEN_BALL_CHANCE) {
          spawned.push(Ball.create(dir, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, {
            type: 'golden',
            color: GOLDEN_BALL_COLOR,
            size: GOLDEN_BALL_SIZE
          }));
        }

        if (ball.isClone) {
          // 分身白球出界直接消失
        } else {
          // 初始白球重生
          const fresh = Ball.create(dir);
          ball.x = fresh.x;
          ball.y = fresh.y;
          ball.vx = fresh.vx;
          ball.vy = fresh.vy;
          survivors.push(ball);

          // 機率性生成分身白球
          if (Math.random() < CLONE_BALL_CHANCE) {
            spawned.push(Ball.create(dir, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, {
              isClone: true
            }));
          }
        }
      } else if (ball.type === 'bonus') {
        // 砲彈出界：未接住方領地範圍被壓縮
        if (exitedLeft) {
          this.targetBoundaryX = Math.max(
            TERRITORY_MARGIN,
            Math.min(CANVAS_WIDTH - TERRITORY_MARGIN, this.targetBoundaryX - BONUS_TERRITORY_SHIFT)
          );
        } else {
          this.targetBoundaryX = Math.max(
            TERRITORY_MARGIN,
            Math.min(CANVAS_WIDTH - TERRITORY_MARGIN, this.targetBoundaryX + BONUS_TERRITORY_SHIFT)
          );
        }
      } else if (ball.type === 'purple') {
        // 紫色球出界：為得利方召喚法師
        if (exitedLeft) {
          this.spawnMage('red');
        } else {
          this.spawnMage('blue');
        }
      } else if (ball.type === 'golden') {
        // 黃金球出界：為得利方召喚暴龍
        if (exitedLeft) {
          this.spawnTrex('red');
        } else {
          this.spawnTrex('blue');
        }
      }
    }

    this.balls = survivors.concat(spawned);
  }

  updateUnits(dtFactor) {
    const now = performance.now();

    for (const u of this.units) {
      if (!u.alive) continue;

      u.updateMovement(this.boundaryX, dtFactor);
      u.updateAnimation(dtFactor, this.spriteManager);

      u.updateAction({
        now,
        units: this.units,
        bases: this.bases,
        boundaryX: this.boundaryX,
        particleSystem: this.particleSystem,
        audioSystem: this.audioSystem,
        onTerritoryDamage: (side, dmg) => this.handleTerritoryDamage(side, dmg),
        onBaseDamage: (base, dmg) => this.handleBaseDamage(base, dmg)
      });
    }

    const beforeCount = this.units.length;
    this.units = this.units.filter(u => u.alive);

    const blueBase = this.bases.find(b => b.side === 'blue');
    const redBase = this.bases.find(b => b.side === 'red');
    const blueHp = blueBase ? blueBase.hp : 0;
    const redHp = redBase ? redBase.hp : 0;

    if (this.lastBlueHp !== blueHp || this.lastRedHp !== redHp || this.units.length !== beforeCount) {
      this.lastBlueHp = blueHp;
      this.lastRedHp = redHp;
      this.updateHUD();
    }
  }

  update(dtFactor = 1) {
    if (this.state === 'PLAYING') {
      this.updatePaddles(dtFactor);
      this.updateUnits(dtFactor);
      this.updateBalls(dtFactor);

      // 領地平滑推移與砲台淹沒檢測
      this.boundaryX = Physics.updateBoundary(this.boundaryX, this.targetBoundaryX, dtFactor);
      const now = performance.now();
      for (const t of this.turrets) {
        t.checkSubmerged(this.boundaryX, now);
      }

      this.checkBaseDestruction();
    } else if (this.state === 'START') {
      // 待機畫面允許試玩移動球拍
      this.updatePaddles(dtFactor);
    }

    this.particleSystem.update(dtFactor);
  }

  render() {
    const ctx = this.ctx;
    const now = performance.now();

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. 底色
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. 場地領地顏色與光帶（藍方左、紅方右）
    ctx.fillStyle = 'rgba(30, 100, 255, 0.35)';
    ctx.fillRect(0, 0, this.boundaryX, CANVAS_HEIGHT);
    ctx.fillStyle = 'rgba(255, 45, 45, 0.35)';
    ctx.fillRect(this.boundaryX, 0, CANVAS_WIDTH - this.boundaryX, CANVAS_HEIGHT);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(this.boundaryX - 1.5, 0, 3, CANVAS_HEIGHT);

    // 3. 畫布中央固定虛線
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. 繪製領地抵抗血條
    this.hud.renderTerritoryHealthBars(ctx, this.boundaryX, this.blueTerritoryHp, this.redTerritoryHp);

    // 5. 繪製主堡
    for (const b of this.bases) {
      b.render(ctx);
    }

    // 6. 繪製砲台
    for (const t of this.turrets) {
      t.render(ctx, now);
    }

    // 7. 繪製士兵單位（傳入 spriteManager 進行 Chimera 影格渲染）
    for (const u of this.units) {
      u.render(ctx, now, this.spriteManager);
    }

    // 8. 繪製球拍
    this.bluePaddle.render(ctx, now);
    this.redPaddle.render(ctx, now);

    // 9. 繪製球體
    for (const ball of this.balls) {
      ball.render(ctx);
    }

    // 10. 繪製粒子與特效
    this.particleSystem.render(ctx);

    // 11. 遊戲內狀態文字
    this.hud.renderInGameHUD(ctx, {
      blueSkillText: this.bluePaddle.getSkillStatusText(now),
      redSkillText: this.redPaddle.getSkillStatusText(now),
      speedFactor: this.computeSpeedFactor(),
      mode: this.mode,
      difficulty: this.difficulty
    });

    // 12. 遮罩面板（開始畫面 / 結束畫面）
    if (this.state === 'START') {
      this.hud.renderOverlay(ctx, [
        'PONG',
        '',
        `目前模式: ${this.mode === '1P' ? '單人對電腦' : '雙人對戰'}${this.mode === '1P' ? `（難度: ${DIFFICULTY_LABELS[this.difficulty]}）` : ''}`,
        '按 [1] 切換單人 / [2] 切換雙人',
        '單人模式下按 [3] 簡單 / [4] 普通 / [5] 困難',
        '摧毀敵方主堡即可獲勝（無分數機制）',
        '按 [空白鍵] 開始遊戲'
      ]);
    } else if (this.state === 'GAMEOVER') {
      const blueBase = this.bases.find(b => b.side === 'blue');
      const redBase = this.bases.find(b => b.side === 'red');
      this.hud.renderOverlay(ctx, [
        'GAME OVER',
        '',
        this.winnerText,
        `藍方主堡剩餘 ${Math.max(0, Math.round(blueBase ? blueBase.hp : 0))}　｜　紅方主堡剩餘 ${Math.max(0, Math.round(redBase ? redBase.hp : 0))}`,
        '',
        '按 [空白鍵] 重新開始'
      ]);
    }
  }
}
