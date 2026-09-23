/**
 * AudioSystem - 原生 Web Audio API 即時合成音效系統
 * 無需外部音檔，支援撞牆音、出界下滑音與各兵種振盪器打擊音效
 */
import { ATTACK_SOUND_PROFILES } from '../config.js';

export class AudioSystem {
  constructor() {
    this.audioCtx = null;
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
   * 兵種與砲台攻擊音效（依兵種音色配置自動選擇波形與頻率）
   * @param {string} kind - 攻擊者類型 ('archer', 'sword', 'cavalry', 'shield', 'turret', 'mage', 'trex')
   */
  playAttackSound(kind) {
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
