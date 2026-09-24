/**
 * AudioSystem - 原生 Web Audio API 即時合成音效與自訂音訊載入系統
 * 支援撞牆方波、出界下滑音、兵種振盪器打擊音效，以及 Chimera 專屬怪獸咆哮與攻擊音效
 */
import { ATTACK_SOUND_PROFILES } from '../config.js';

export class AudioSystem {
  constructor() {
    this.audioCtx = null;
    this.buffers = {};
    this.audioElements = {};
    this.isLoaded = false;
  }

  getAudioContext() {
    if (!this.audioCtx) {
      try {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      } catch (e) {
        this.audioCtx = null;
      }
    }
    return this.audioCtx;
  }

  resumeIfNeeded() {
    const ac = this.getAudioContext();
    if (ac && ac.state === 'suspended') {
      ac.resume().catch(() => {});
    }
    return ac;
  }

  /**
   * 預載入自訂怪獸音訊檔 (monster_roar & bigmonster_attack)
   * 採用 Web Audio API ArrayBuffer 解碼，並備有 HTMLAudioElement 雙軌容錯
   */
  async loadAudioFiles() {
    const files = [
      { key: 'monster_roar', url: 'assets/audio/monster_roar.wav' },
      { key: 'bigmonster_attack', url: 'assets/audio/bigmonster_attack.wav' }
    ];

    for (const item of files) {
      // 準備 HTMLAudio 備援
      try {
        const audio = new Audio(item.url);
        audio.preload = 'auto';
        this.audioElements[item.key] = audio;
      } catch (e) {}

      // 嘗試 Web Audio API 解碼
      try {
        const response = await fetch(item.url);
        const arrayBuffer = await response.arrayBuffer();
        const ac = this.getAudioContext();
        if (ac) {
          const audioBuffer = await ac.decodeAudioData(arrayBuffer);
          this.buffers[item.key] = audioBuffer;
        }
      } catch (e) {
        // 若在特定受限環境 fetch 失敗，將自動以 Audio 標籤備援播放
      }
    }
    this.isLoaded = true;
  }

  /**
   * 播放已載入的音效檔
   * @param {string} key
   * @param {number} volume
   */
  playSoundBuffer(key, volume = 0.5) {
    const ac = this.resumeIfNeeded();

    if (ac && this.buffers[key]) {
      try {
        const source = ac.createBufferSource();
        const gainNode = ac.createGain();
        source.buffer = this.buffers[key];
        gainNode.gain.setValueAtTime(volume, ac.currentTime);
        source.connect(gainNode).connect(ac.destination);
        source.start();
        return;
      } catch (e) {}
    }

    // Fallback: 使用 Audio 物件播放
    if (this.audioElements[key]) {
      try {
        const clone = this.audioElements[key].cloneNode();
        clone.volume = volume;
        clone.play().catch(() => {});
      } catch (e) {}
    }
  }

  /**
   * 暴龍招喚音效：monster_roar
   */
  playMonsterRoar() {
    this.playSoundBuffer('monster_roar', 0.6);
  }

  /**
   * 暴龍攻擊音效：bigmonster_attack
   */
  playBigMonsterAttack() {
    this.playSoundBuffer('bigmonster_attack', 0.65);
  }

  /**
   * 球碰撞上/下牆壁時的短促方波音效
   */
  playWallHitSound() {
    const ac = this.resumeIfNeeded();
    if (!ac) return;

    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(260 + Math.random() * 60, ac.currentTime);

    gain.gain.setValueAtTime(0.15, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.09);

    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.1);
  }

  /**
   * 球漏接出界時的音調下滑音效
   */
  playMissSound() {
    const ac = this.resumeIfNeeded();
    if (!ac) return;

    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, ac.currentTime + 0.32);

    gain.gain.setValueAtTime(0.18, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.34);

    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.35);
  }

  /**
   * 兵種與砲台攻擊音效（依兵種音色配置自動選擇）
   * @param {string} kind
   */
  playAttackSound(kind) {
    if (kind === 'trex') {
      this.playBigMonsterAttack();
      return;
    }

    const ac = this.resumeIfNeeded();
    if (!ac) return;

    const profile = ATTACK_SOUND_PROFILES[kind] || ATTACK_SOUND_PROFILES.sword;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = profile.type;
    osc.frequency.setValueAtTime(profile.freq, ac.currentTime);

    gain.gain.setValueAtTime(0.12, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);

    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.13);
  }
}
