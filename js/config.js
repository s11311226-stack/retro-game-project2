/**
 * 復古乒乓球 Pong：領地戰爭版 - 全域配置與數值常數
 */

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 500;

// 球拍設定
export const PADDLE_W = 12;
export const PADDLE_H = 90;
export const PADDLE_SPEED = 7;

// 球體設定
export const BALL_SIZE = 12;
export const BALL_BASE_SPEED = 3.5;
export const BALL_HIT_SPEED_CAP = 8;
export const BONUS_BALL_SPEED = 4.2;
export const BONUS_BALL_LIFETIME = 10000; // 毫秒

// 球速隨拉鋸時間遞增
export const SPEED_RAMP_TIME = 20000; // 毫秒
export const SPEED_RAMP_MAX_MULT = 2.2;

// 特殊球機率與視覺
export const CLONE_BALL_CHANCE = 0.25;
export const PURPLE_BALL_CHANCE = 0.20;
export const GOLDEN_BALL_CHANCE = 0.05;
export const GOLDEN_BALL_SIZE = BALL_SIZE / 2;
export const PURPLE_BALL_COLOR = '#a855f7';
export const GOLDEN_BALL_COLOR = '#ffd700';

// AI 難度配置
export const AI_PROFILES = {
  EASY:   { speed: 3.4, deadzone: 32 },
  NORMAL: { speed: 5.3, deadzone: 10 },
  HARD:   { speed: 7.6, deadzone: 3  }
};

export const DIFFICULTY_LABELS = {
  EASY: '簡單',
  NORMAL: '普通',
  HARD: '困難'
};

// 技能設定
export const SKILL_COOLDOWN = 10000;       // 毫秒
export const SKILL_FLY_TIME = 300;         // 飛往中心/原位時間（毫秒）
export const SKILL_SPIN_TIME_PER_ROT = 300; // 旋轉一圈時間（毫秒）

// 領地設定
export const TERRITORY_MARGIN = 70;
export const TERRITORY_HP_MAX = 200;
export const TERRITORY_ADVANCE_STEP = 40;
export const BONUS_TERRITORY_SHIFT = 40;

// 砲台設定
export const TURRET_BASE_OFFSET = 70;
export const TURRET_SPACING = 90;
export const TURRET_SIZE = 16;
export const TURRET_DAMAGE = 5;
export const TURRET_FIRE_CHANCE = 0.25;
export const TURRET_Y = CANVAS_HEIGHT / 2;

// 主堡設定
export const BASE_HP = 1500;
export const BASE_SIZE = 32;
export const BASE_OFFSET = TURRET_BASE_OFFSET + 2 * TURRET_SPACING;

// 特效與粒子
export const WALL_FLASH_DURATION = 250;
export const PARTICLE_COUNT = 18;
export const ATTACK_EFFECT_DURATION = 220;

// 兵種設定
export const UNIT_TYPES = ['archer', 'shield', 'cavalry', 'sword'];
export const UNIT_KNOCKBACK = 110;
export const TREX_STUN_CHANCE = 0.3;
export const TREX_STUN_COUNT = 2;
export const TREX_STUN_DURATION = 5000;

export const UNIT_STATS = {
  archer:  { hp: 25,  damage: 15, cooldown: 5000, stopGap: 55, speed: 1.1 },
  sword:   { hp: 50,  damage: 20, cooldown: 4000, stopGap: 16, speed: 1.1 },
  cavalry: { hp: 35,  damage: 15, cooldown: 2000, stopGap: 16, speed: 2.3 },
  shield:  { hp: 70,  damage: 10, cooldown: 6000, stopGap: 16, speed: 0.6 },
  mage:    { hp: 25,  damage: 0,  cooldown: 6000, stopGap: 55, speed: 0.8, heal: 10 },
  trex:    { hp: 150, damage: 40, cooldown: 6000, stopGap: 16, speed: 0.3 }
};

// Web Audio 合成器音訊參數配置
export const ATTACK_SOUND_PROFILES = {
  archer:  { type: 'triangle', freq: 700 },
  sword:   { type: 'square',   freq: 180 },
  cavalry: { type: 'sawtooth', freq: 420 },
  shield:  { type: 'square',   freq: 110 },
  turret:  { type: 'triangle', freq: 900 },
  mage:    { type: 'sine',     freq: 950 },
  trex:    { type: 'sawtooth', freq: 85  }
};
