/**
 * Synthesizes and plays premium notification sounds using the HTML5 Web Audio API.
 * This avoids requiring external audio file assets and guarantees reliable playback.
 */

class AudioNotificationService {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      // Create audio context lazily on user interaction to satisfy browser security policies
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playReceived() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      
      // WhatsApp notification: bright, light double-chime
      // Note 1: High frequency, very short duration
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(987.77, now); // B5
      osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.05); // Slide up to E6
      gain1.gain.setValueAtTime(0.10, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.06);

      // Note 2: Slightly higher chirp, brief delay
      const delay = 0.06;
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, now + delay); // E6
      osc2.frequency.exponentialRampToValueAtTime(1567.98, now + delay + 0.1); // Slide up to G6
      gain2.gain.setValueAtTime(0.08, now + delay);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + delay);
      osc2.stop(now + delay + 0.12);
    } catch (e) {
      console.warn('Web Audio playback blocked or unsupported:', e.message);
    }
  }

  playSent() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(783.99, now); // G5
      osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.08); // B5
      
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      console.warn('Web Audio playback blocked or unsupported:', e.message);
    }
  }

  playAlert() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      
      // Rising triad chord (C5 -> E5 -> G5) with cascading delay
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, index) => {
        const time = now + index * 0.1;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        
        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + 0.25);
      });
    } catch (e) {
      console.warn('Web Audio playback blocked or unsupported:', e.message);
    }
  }
}

export const soundService = new AudioNotificationService();
export default soundService;
