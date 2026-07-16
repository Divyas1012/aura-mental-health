/**
 * Aura Ambient Soundscape Synthesizer
 * Powered by Web Audio API
 */

class SoundscapeSynthesizer {
  constructor() {
    this.ctx = null;
    this.sounds = {
      rain: { gainNode: null, sourceNode: null, filterNode: null, isPlaying: false, volume: 0.5 },
      ocean: { gainNode: null, sourceNode: null, lfoNode: null, isPlaying: false, volume: 0.5 },
      binaural: { leftOsc: null, rightOsc: null, gainNode: null, isPlaying: false, volume: 0.3, freq: 100, beatFreq: 6 },
      bowl: { gainNode: null, isPlaying: false, volume: 0.7 }
    };
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn("Web Audio API is not supported in this browser.");
      return;
    }
    this.ctx = new AudioContextClass();
  }

  resumeContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Helper to generate White Noise Buffer
  createWhiteNoiseBuffer() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  // Helper to generate Pink Noise Buffer
  createPinkNoiseBuffer() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    // Pink noise filtering algorithm (Paul Kellet's refined method)
    let b0, b1, b2, b3, b4, b5, b6;
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
    
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11; // estimate gain reduction
      b6 = white * 0.115926;
    }
    return noiseBuffer;
  }

  /* ==========================================
     RAIN SOUND GENERATOR
     ========================================== */
  startRain() {
    this.resumeContext();
    if (this.sounds.rain.isPlaying) return;

    const sound = this.sounds.rain;
    sound.gainNode = this.ctx.createGain();
    sound.gainNode.gain.setValueAtTime(sound.volume, this.ctx.currentTime);

    // Create White Noise source
    const buffer = this.createWhiteNoiseBuffer();
    sound.sourceNode = this.ctx.createBufferSource();
    sound.sourceNode.buffer = buffer;
    sound.sourceNode.loop = true;

    // Filter white noise to create soft rain patter (Low-pass + Band-pass)
    sound.filterNode = this.ctx.createBiquadFilter();
    sound.filterNode.type = 'lowpass';
    sound.filterNode.frequency.setValueAtTime(700, this.ctx.currentTime); // Dampen high hiss
    sound.filterNode.Q.setValueAtTime(1, this.ctx.currentTime);

    // Audio routing
    sound.sourceNode.connect(sound.filterNode);
    sound.filterNode.connect(sound.gainNode);
    sound.gainNode.connect(this.ctx.destination);

    // Start playing
    sound.sourceNode.start(0);
    sound.isPlaying = true;

    // Simulate crackle drops periodically
    this.rainDropletLoop = setInterval(() => {
      if (!sound.isPlaying) {
        clearInterval(this.rainDropletLoop);
        return;
      }
      this.triggerRainDroplet(sound.gainNode);
    }, 150);
  }

  triggerRainDroplet(targetNode) {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    
    // Create a high-pitched click passed through a filter
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    // Random frequencies around droplet range
    osc.frequency.setValueAtTime(1500 + Math.random() * 2000, this.ctx.currentTime);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, this.ctx.currentTime);
    filter.Q.setValueAtTime(3, this.ctx.currentTime);

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    // Exponential brief crackle shape
    gain.gain.linearRampToValueAtTime(0.04 * Math.random(), this.ctx.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.04);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(targetNode);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  stopRain() {
    const sound = this.sounds.rain;
    if (!sound.isPlaying) return;
    
    sound.sourceNode.stop();
    sound.isPlaying = false;
    if (this.rainDropletLoop) clearInterval(this.rainDropletLoop);
  }

  /* ==========================================
     OCEAN WAVES GENERATOR
     ========================================== */
  startOcean() {
    this.resumeContext();
    if (this.sounds.ocean.isPlaying) return;

    const sound = this.sounds.ocean;
    sound.gainNode = this.ctx.createGain();
    // Start quiet
    sound.gainNode.gain.setValueAtTime(0.0, this.ctx.currentTime);

    // Create Pink Noise
    const buffer = this.createPinkNoiseBuffer();
    sound.sourceNode = this.ctx.createBufferSource();
    sound.sourceNode.buffer = buffer;
    sound.sourceNode.loop = true;

    // Filter ocean noise (low-pass to mimic water)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);

    // Slow wave modulator (LFO at ~0.08Hz = 12 seconds per wave)
    sound.lfoNode = this.ctx.createOscillator();
    sound.lfoNode.type = 'sine';
    sound.lfoNode.frequency.setValueAtTime(0.07, this.ctx.currentTime); // ~14s period

    const lfoGain = this.ctx.createGain();
    // We map wave modulation between 0.1 and 0.9 of overall volume
    lfoGain.gain.setValueAtTime(sound.volume * 0.45, this.ctx.currentTime);

    // Connect LFO to Gain.gain to automate volume swells
    sound.lfoNode.connect(lfoGain);
    lfoGain.connect(sound.gainNode.gain);

    // Constant offset gain so volume never hits absolute zero
    const baseGain = this.ctx.createGain();
    baseGain.gain.setValueAtTime(sound.volume * 0.35, this.ctx.currentTime);

    // Audio routing
    sound.sourceNode.connect(filter);
    filter.connect(sound.gainNode);
    filter.connect(baseGain);

    sound.gainNode.connect(this.ctx.destination);
    baseGain.connect(this.ctx.destination);

    // Keep reference to disconnect baseGain on stop
    sound.baseGainNode = baseGain;

    sound.sourceNode.start(0);
    sound.lfoNode.start(0);
    sound.isPlaying = true;
  }

  stopOcean() {
    const sound = this.sounds.ocean;
    if (!sound.isPlaying) return;

    sound.sourceNode.stop();
    sound.lfoNode.stop();
    if (sound.baseGainNode) {
      sound.baseGainNode.disconnect();
    }
    sound.isPlaying = false;
  }

  /* ==========================================
     BINAURAL BEATS GENERATOR
     ========================================== */
  startBinaural() {
    this.resumeContext();
    if (this.sounds.binaural.isPlaying) return;

    const sound = this.sounds.binaural;
    sound.gainNode = this.ctx.createGain();
    sound.gainNode.gain.setValueAtTime(sound.volume, this.ctx.currentTime);

    // Left Ear Oscillator
    sound.leftOsc = this.ctx.createOscillator();
    sound.leftOsc.type = 'sine';
    sound.leftOsc.frequency.setValueAtTime(sound.freq, this.ctx.currentTime);

    // Right Ear Oscillator (Shifted by beat frequency, e.g., +6Hz)
    sound.rightOsc = this.ctx.createOscillator();
    sound.rightOsc.type = 'sine';
    sound.rightOsc.frequency.setValueAtTime(sound.freq + sound.beatFreq, this.ctx.currentTime);

    // Split outputs to Left and Right channels
    const leftPanner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    const rightPanner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    if (leftPanner && rightPanner) {
      leftPanner.pan.setValueAtTime(-1, this.ctx.currentTime);
      rightPanner.pan.setValueAtTime(1, this.ctx.currentTime);

      sound.leftOsc.connect(leftPanner);
      sound.rightOsc.connect(rightPanner);

      leftPanner.connect(sound.gainNode);
      rightPanner.connect(sound.gainNode);
    } else {
      // Fallback for browsers without StereoPanner (merge nodes)
      const merger = this.ctx.createChannelMerger(2);
      sound.leftOsc.connect(merger, 0, 0);
      sound.rightOsc.connect(merger, 0, 1);
      merger.connect(sound.gainNode);
    }

    sound.gainNode.connect(this.ctx.destination);

    sound.leftOsc.start(0);
    sound.rightOsc.start(0);
    sound.isPlaying = true;
  }

  setBinauralBeat(beatFreqName) {
    let beatFreq = 6; // default Theta (deep relax)
    switch(beatFreqName) {
      case 'delta': beatFreq = 2.5; break; // deep sleep
      case 'theta': beatFreq = 6.0; break; // meditation
      case 'alpha': beatFreq = 10.0; break; // flow/calm focus
      case 'beta': beatFreq = 16.0; break; // active thinking
    }
    
    this.sounds.binaural.beatFreq = beatFreq;
    if (this.sounds.binaural.isPlaying) {
      const sound = this.sounds.binaural;
      sound.rightOsc.frequency.setValueAtTime(sound.freq + beatFreq, this.ctx.currentTime);
    }
  }

  stopBinaural() {
    const sound = this.sounds.binaural;
    if (!sound.isPlaying) return;

    sound.leftOsc.stop();
    sound.rightOsc.stop();
    sound.isPlaying = false;
  }

  /* ==========================================
     SINGING BOWL CHIME (ADDITIVE SYNTHESIS)
     ========================================== */
  playSingingBowl() {
    this.resumeContext();
    
    const now = this.ctx.currentTime;
    const baseFreq = 196.0; // G3 frequency, very centering
    
    // Ratios for a rich metallic, complex Tibetan Singing Bowl overtone spectrum
    const overtones = [
      { ratio: 1.00, gain: 0.45, decay: 10 },
      { ratio: 2.76, gain: 0.25, decay: 8 },
      { ratio: 5.40, gain: 0.15, decay: 6 },
      { ratio: 8.10, gain: 0.08, decay: 4 },
      { ratio: 10.8, gain: 0.04, decay: 3 }
    ];

    // Master gain for this single hit
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    // Smooth hit fade-in
    masterGain.gain.linearRampToValueAtTime(this.sounds.bowl.volume, now + 0.08);
    // Exponential fade-out over 12 seconds
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 12);
    
    masterGain.connect(this.ctx.destination);

    overtones.forEach(overtone => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * overtone.ratio, now);
      
      // Slight pitch wobble (frequency modulation) to mimic physical bowl vibrations
      const vibrato = this.ctx.createOscillator();
      const vibratoGain = this.ctx.createGain();
      vibrato.frequency.setValueAtTime(3 + Math.random() * 4, now); // 3-7 Hz wobble
      vibratoGain.gain.setValueAtTime(1.5, now); // wobble depth in Hz
      
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      vibrato.start(now);
      
      // Gain envelope for this overtone
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(overtone.gain, now + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + overtone.decay);

      osc.connect(gainNode);
      gainNode.connect(masterGain);

      osc.start(now);
      
      // Schedule cleanup
      osc.stop(now + 12.5);
      vibrato.stop(now + 12.5);
    });
  }

  /* ==========================================
     VOLUME CONTROLS & UTILITIES
     ========================================== */
  setVolume(soundName, volume) {
    const sound = this.sounds[soundName];
    if (!sound) return;
    
    sound.volume = volume;
    if (sound.isPlaying && sound.gainNode) {
      if (soundName === 'ocean') {
        // Ocean volume changes require adjusting both LFO and base volumes dynamically
        // but we can scale master gain directly or handle on next wave cycle.
        // We'll update the target gain value at time
        sound.gainNode.gain.setValueAtTime(volume * 0.45, this.ctx.currentTime);
        if (sound.baseGainNode) {
          sound.baseGainNode.gain.setValueAtTime(volume * 0.35, this.ctx.currentTime);
        }
      } else {
        sound.gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
      }
    }
  }

  toggleSound(soundName) {
    const sound = this.sounds[soundName];
    if (!sound) return false;

    if (sound.isPlaying) {
      this.stopSound(soundName);
    } else {
      this.startSound(soundName);
    }
    return sound.isPlaying;
  }

  startSound(soundName) {
    switch(soundName) {
      case 'rain': this.startRain(); break;
      case 'ocean': this.startOcean(); break;
      case 'binaural': this.startBinaural(); break;
      case 'bowl': this.playSingingBowl(); break;
    }
  }

  stopSound(soundName) {
    switch(soundName) {
      case 'rain': this.stopRain(); break;
      case 'ocean': this.stopOcean(); break;
      case 'binaural': this.stopBinaural(); break;
    }
  }

  stopAll() {
    this.stopRain();
    this.stopOcean();
    this.stopBinaural();
  }
}

// Export single instance
window.AuraAudio = new SoundscapeSynthesizer();
