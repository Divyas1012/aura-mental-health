/**
 * Aura Journal and Mood Tracker Engine
 * Handles local storage CRUD, journal streak calculations, and rendering of the HTML Canvas trend chart.
 */

class JournalManager {
  constructor() {
    this.entriesKey = 'aura_journal_entries';
    this.statsKey = 'aura_stats';
    this.moodValues = { radiant: 5, peaceful: 4, meh: 3, anxious: 2, down: 1 };
    this.moodLabels = { radiant: 'Radiant', peaceful: 'Peaceful', meh: 'Neutral', anxious: 'Anxious', down: 'Down' };
    this.moodColors = { radiant: '#fcd27d', peaceful: '#86efac', meh: '#cbd5e1', anxious: '#fca5a5', down: '#93c5fd' };
  }

  // Retrieve entries sorted by timestamp descending
  getEntries() {
    const data = localStorage.getItem(this.entriesKey);
    if (!data) {
      // Default placeholder data so chart looks gorgeous on first load
      const initialPlaceholder = [
        { date: 'Jul 10', timestamp: Date.now() - 6*24*60*60*1000, mood: 'peaceful', value: 4, tags: ['Sleep', 'Health'], note: 'Slept really well last night. Felt rested.' },
        { date: 'Jul 11', timestamp: Date.now() - 5*24*60*60*1000, mood: 'radiant', value: 5, tags: ['Social', 'Exercise'], note: 'Had a wonderful lunch with friends and went for a run.' },
        { date: 'Jul 12', timestamp: Date.now() - 4*24*60*60*1000, mood: 'meh', value: 3, tags: ['Work'], note: 'Busy day at work, felt a bit overwhelmed but pushed through.' },
        { date: 'Jul 13', timestamp: Date.now() - 3*24*60*60*1000, mood: 'anxious', value: 2, tags: ['Sleep', 'Work'], note: 'Stressed about a deadline. Tossing and turning.' },
        { date: 'Jul 14', timestamp: Date.now() - 2*24*60*60*1000, mood: 'peaceful', value: 4, tags: ['Exercise', 'Health'], note: 'Did box breathing, helped calm my mind. Felt much better.' },
        { date: 'Jul 15', timestamp: Date.now() - 1*24*60*60*1000, mood: 'peaceful', value: 4, tags: ['Hobbies'], note: 'Spent the evening painting. Felt very therapeutic.' }
      ];
      localStorage.setItem(this.entriesKey, JSON.stringify(initialPlaceholder));
      return initialPlaceholder;
    }
    return JSON.parse(data).sort((a, b) => b.timestamp - a.timestamp);
  }

  // Save a new entry
  addEntry(mood, tags, note) {
    const entries = this.getEntries();
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const newEntry = {
      date: dateStr,
      timestamp: Date.now(),
      mood: mood,
      value: this.moodValues[mood] || 3,
      tags: tags || [],
      note: note || ''
    };

    entries.push(newEntry);
    localStorage.setItem(this.entriesKey, JSON.stringify(entries));

    // Update streak and stats
    this.updateStatsAndStreak();
    
    // Dispatch events to update dashboard and re-render chart
    window.dispatchEvent(new Event('auraJournalUpdated'));
    window.dispatchEvent(new Event('auraStatsUpdated'));
  }

  // Calculate and update streaks + logged states
  updateStatsAndStreak() {
    let stats = JSON.parse(localStorage.getItem(this.statsKey)) || { breathedMinutes: 0, journalStreak: 0, moodLogToday: false };
    const entries = this.getEntries();
    
    if (entries.length === 0) {
      stats.journalStreak = 0;
      stats.moodLogToday = false;
      localStorage.setItem(this.statsKey, JSON.stringify(stats));
      return;
    }

    // Sort ascending to calculate streak
    const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
    let streak = 0;
    let lastDate = null;

    // Check streak
    for (let i = 0; i < sorted.length; i++) {
      const currentDate = new Date(sorted[i].timestamp);
      currentDate.setHours(0, 0, 0, 0);

      if (!lastDate) {
        streak = 1;
      } else {
        const diffTime = Math.abs(currentDate - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          streak++;
        } else if (diffDays > 1) {
          streak = 1; // broken streak
        }
      }
      lastDate = currentDate;
    }

    // Check if logged today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastEntryDate = new Date(sorted[sorted.length - 1].timestamp);
    lastEntryDate.setHours(0, 0, 0, 0);

    stats.moodLogToday = (today.getTime() === lastEntryDate.getTime());
    stats.journalStreak = streak;
    localStorage.setItem(this.statsKey, JSON.stringify(stats));
  }

  /* ==========================================
     CANVAS CHART RENDERING SYSTEM
     ========================================== */
  renderMoodChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Make canvas sharp on high DPI screens
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear Canvas
    ctx.clearRect(0, 0, width, height);

    // Fetch last 7 entries (chronological)
    const entries = this.getEntries().slice(0, 7).reverse();
    if (entries.length < 2) {
      // Draw placeholder text if not enough data points
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText('Log a few moods to see your trend chart!', width / 2, height / 2);
      return;
    }

    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Y Axis represents mood values (1 to 5)
    // X Axis represents the index of entries (0 to entries.length - 1)
    const getX = (index) => paddingLeft + (index / (entries.length - 1)) * chartWidth;
    const getY = (val) => paddingTop + chartHeight - ((val - 1) / 4) * chartHeight;

    // 1. Draw horizontal grid lines & Y labels
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--panel-border') || 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-muted') || '#9ca3af';
    ctx.font = '10px Inter';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const yLevels = [1, 2, 3, 4, 5];
    const yLabels = ['Down', 'Anxious', 'Neutral', 'Calm', 'Radiant'];

    yLevels.forEach((level, i) => {
      const y = getY(level);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();
      
      // Draw labels on the left
      ctx.fillText(yLabels[i], paddingLeft - 8, y);
    });

    // 2. Draw line path and points
    const points = entries.map((entry, idx) => ({
      x: getX(idx),
      y: getY(entry.value),
      mood: entry.mood,
      date: entry.date
    }));

    // Draw grid columns / X labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    points.forEach((p, idx) => {
      ctx.fillText(p.date, p.x, height - paddingBottom + 8);
    });

    // Draw the main line shadow/fill (gradient beneath the curve)
    const primaryColor = getComputedStyle(document.body).getPropertyValue('--primary') || '#8a7df0';
    const secondaryColor = getComputedStyle(document.body).getPropertyValue('--secondary') || '#4de2c0';

    const fillGrad = ctx.createLinearGradient(0, paddingTop, 0, height - paddingBottom);
    fillGrad.addColorStop(0, 'rgba(138, 125, 240, 0.25)');
    fillGrad.addColorStop(1, 'rgba(77, 226, 192, 0.0)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, height - paddingBottom);
    
    // Draw smooth Bezier curve for premium design
    for (let i = 0; i < points.length; i++) {
      if (i === 0) {
        ctx.lineTo(points[i].x, points[i].y);
      } else {
        const cpX1 = points[i - 1].x + (points[i].x - points[i - 1].x) / 2;
        const cpY1 = points[i - 1].y;
        const cpX2 = points[i - 1].x + (points[i].x - points[i - 1].x) / 2;
        const cpY2 = points[i].y;
        ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, points[i].x, points[i].y);
      }
    }
    ctx.lineTo(points[points.length - 1].x, height - paddingBottom);
    ctx.closePath();
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Draw the main line stroke
    const strokeGrad = ctx.createLinearGradient(paddingLeft, 0, width - paddingRight, 0);
    strokeGrad.addColorStop(0, primaryColor);
    strokeGrad.addColorStop(1, secondaryColor);

    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      if (i === 0) {
        ctx.moveTo(points[i].x, points[i].y);
      } else {
        const cpX1 = points[i - 1].x + (points[i].x - points[i - 1].x) / 2;
        const cpY1 = points[i - 1].y;
        const cpX2 = points[i - 1].x + (points[i].x - points[i - 1].x) / 2;
        const cpY2 = points[i].y;
        ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, points[i].x, points[i].y);
      }
    }
    ctx.strokeStyle = strokeGrad;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 3. Draw glowing data points
    points.forEach((p) => {
      // Outer glow ring
      const dotColor = this.moodColors[p.mood] || primaryColor;
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#161a2b'; // Dark background center
      ctx.fill();
      ctx.strokeStyle = dotColor;
      ctx.lineWidth = 3.5;
      ctx.stroke();
    });
  }
}

// Export single instance
window.AuraJournal = new JournalManager();
