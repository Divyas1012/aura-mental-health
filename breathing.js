/**
 * Aura Interactive Breathing Assistant
 * Tracks breathing cycles, updates UI animations, and triggers Audio bells on transitions.
 */

class BreathingAssistant {
  constructor() {
    this.timer = null;
    this.cycleCount = 0;
    this.totalSecondsBreathed = 0;
    this.isPlaying = false;
    
    this.activePattern = 'calm'; // calm (4-7-8), box (4-4-4-4), slow (5-0-5)
    
    this.patterns = {
      calm: [
        { state: 'Inhale', duration: 4, scaleStart: 1.0, scaleEnd: 1.8, instruction: 'Breathe in through your nose...' },
        { state: 'Hold', duration: 7, scaleStart: 1.8, scaleEnd: 1.8, instruction: 'Hold your breath gently...' },
        { state: 'Exhale', duration: 8, scaleStart: 1.8, scaleEnd: 1.0, instruction: 'Exhale slowly through your mouth...' }
      ],
      box: [
        { state: 'Inhale', duration: 4, scaleStart: 1.0, scaleEnd: 1.8, instruction: 'Inhale slowly...' },
        { state: 'Hold', duration: 4, scaleStart: 1.8, scaleEnd: 1.8, instruction: 'Hold...' },
        { state: 'Exhale', duration: 4, scaleStart: 1.8, scaleEnd: 1.0, instruction: 'Exhale...' },
        { state: 'Rest', duration: 4, scaleStart: 1.0, scaleEnd: 1.0, instruction: 'Rest...' }
      ],
      slow: [
        { state: 'Inhale', duration: 5, scaleStart: 1.0, scaleEnd: 1.8, instruction: 'Slow inhale...' },
        { state: 'Exhale', duration: 5, scaleStart: 1.8, scaleEnd: 1.0, instruction: 'Slow exhale...' }
      ]
    };

    this.currentStepIdx = 0;
    this.secondsRemainingInStep = 0;
  }

  start(patternName, onTickCallback, onStateChangeCallback, onStopCallback) {
    if (this.isPlaying) this.stop();
    
    this.isPlaying = true;
    this.activePattern = patternName || 'calm';
    this.currentStepIdx = 0;
    this.cycleCount = 0;
    this.onTick = onTickCallback;
    this.onStateChange = onStateChangeCallback;
    this.onStop = onStopCallback;

    const pattern = this.patterns[this.activePattern];
    const initialStep = pattern[0];
    this.secondsRemainingInStep = initialStep.duration;

    // Trigger state change initially
    this.triggerStateChange(initialStep);

    // Audio resume context
    if (window.AuraAudio) {
      window.AuraAudio.resumeContext();
    }

    this.timer = setInterval(() => {
      this.secondsRemainingInStep--;
      this.totalSecondsBreathed++;
      
      // Update statistics in localStorage
      this.updateBreathedStats();

      if (this.secondsRemainingInStep <= 0) {
        // Move to next step
        this.currentStepIdx = (this.currentStepIdx + 1) % pattern.length;
        if (this.currentStepIdx === 0) {
          this.cycleCount++;
        }
        
        const nextStep = pattern[this.currentStepIdx];
        this.secondsRemainingInStep = nextStep.duration;
        this.triggerStateChange(nextStep);
      } else {
        // Keep ticking
        const step = pattern[this.currentStepIdx];
        const progress = 1 - (this.secondsRemainingInStep / step.duration);
        const currentScale = step.scaleStart + (step.scaleEnd - step.scaleStart) * progress;
        
        if (this.onTick) {
          this.onTick(step.state, this.secondsRemainingInStep, currentScale);
        }
      }
    }, 1000);
  }

  triggerStateChange(step) {
    // Play a subtle high-frequency singing bowl chime or droplet sound to guide user eyes-closed
    if (window.AuraAudio) {
      try {
        // Synthesize a brief transition sound using Web Audio API
        const ctx = window.AuraAudio.ctx;
        if (ctx && ctx.state !== 'suspended') {
          const now = ctx.currentTime;
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          osc.type = 'sine';
          // Differentiate frequency slightly per state
          if (step.state === 'Inhale') {
            osc.frequency.setValueAtTime(329.63, now); // E4
          } else if (step.state === 'Hold') {
            osc.frequency.setValueAtTime(392.00, now); // G4
          } else {
            osc.frequency.setValueAtTime(261.63, now); // C4
          }
          
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.08, now + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
          
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          osc.start(now);
          osc.stop(now + 0.7);
        }
      } catch(e) {
        console.error("Failed to play transition chime:", e);
      }
    }

    if (this.onStateChange) {
      this.onStateChange(step.state, this.secondsRemainingInStep, step.scaleStart, step.instruction);
    }
  }

  stop() {
    if (!this.isPlaying) return;
    
    clearInterval(this.timer);
    this.isPlaying = false;
    
    if (this.onStop) {
      this.onStop(Math.round(this.totalSecondsBreathed / 60));
    }
  }

  updateBreathedStats() {
    let stats = JSON.parse(localStorage.getItem('aura_stats')) || { breathedMinutes: 0, journalStreak: 0, moodLogToday: false };
    
    // Save total raw seconds, but store rounded minutes in stats
    let totalSeconds = parseInt(localStorage.getItem('aura_seconds_breathed') || '0');
    totalSeconds++;
    localStorage.setItem('aura_seconds_breathed', totalSeconds);
    
    // Update minutes
    stats.breathedMinutes = Math.floor(totalSeconds / 60);
    localStorage.setItem('aura_stats', JSON.stringify(stats));

    // Trigger custom event to update dashboard stats live
    window.dispatchEvent(new Event('auraStatsUpdated'));
  }
}

// Export single instance
window.AuraBreathing = new BreathingAssistant();
