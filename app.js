/**
 * Aura Main Controller & SPA Routing Engine
 * Wires together Audio, Chat, Breathing, CBT, and Journaling modules.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Stats in localStorage if empty
  if (!localStorage.getItem('aura_stats')) {
    localStorage.setItem('aura_stats', JSON.stringify({
      breathedMinutes: 0,
      journalStreak: 0,
      moodLogToday: false
    }));
  }

  // --- Theme Controller ---
  const initTheme = () => {
    const isLight = localStorage.getItem('aura_light_theme') === 'true';
    const themeBtn = document.getElementById('themeToggleBtn');
    
    if (isLight) {
      document.body.classList.add('light-theme');
      if (themeBtn) themeBtn.innerHTML = '<i class="fas fa-moon"></i> <span>Dark Mode</span>';
    } else {
      document.body.classList.remove('light-theme');
      if (themeBtn) themeBtn.innerHTML = '<i class="fas fa-sun"></i> <span>Light Mode</span>';
    }
  };

  const toggleTheme = () => {
    const isLightNow = document.body.classList.toggle('light-theme');
    localStorage.setItem('aura_light_theme', isLightNow);
    initTheme();
  };

  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  initTheme();


  // --- SPA Tab Router ---
  const navLinks = document.querySelectorAll('.nav-link');
  const panels = document.querySelectorAll('.view-panel');

  const switchTab = (tabId) => {
    navLinks.forEach(link => {
      if (link.getAttribute('data-target') === tabId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    panels.forEach(panel => {
      if (panel.id === tabId) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    // Special initialization when tab is opened
    if (tabId === 'journal') {
      setTimeout(() => {
        window.AuraJournal.renderMoodChart('moodChart');
        renderJournalHistory();
      }, 50);
    } else if (tabId === 'cbt') {
      renderReframedThoughts();
      resetCbtWizard();
    } else if (tabId === 'dashboard') {
      updateDashboardStats();
      setTimeout(() => {
        window.AuraJournal.renderMoodChart('dashboardMoodChart');
      }, 50);
    }

    // Scroll main panel to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('data-target');
      switchTab(target);
    });
  });


  // --- Calming Quotes Engine ---
  const quotes = [
    { text: "You don't have to control your thoughts. You just have to stop letting them control you.", author: "Dan Millman" },
    { text: "Quiet the mind and the soul will speak.", author: "Ma Jaya Sati Bhagavati" },
    { text: "Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor.", author: "Thich Nhat Hanh" },
    { text: "You are stronger than you know. More capable than you ever dreamed.", author: "Unknown" },
    { text: "Self-care is how you take your power back.", author: "Lalah Delia" },
    { text: "Breathe in deeply to bring your mind home to your body.", author: "Thich Nhat Hanh" },
    { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
    { text: "Flow is the state of mind when you are fully immersed in what you are doing.", author: "Mihaly Csikszentmihalyi" }
  ];

  const shuffleQuote = () => {
    const qText = document.getElementById('quoteText');
    const qAuth = document.getElementById('quoteAuthor');
    if (!qText || !qAuth) return;

    const randomQ = quotes[Math.floor(Math.random() * quotes.length)];
    qText.textContent = `"${randomQ.text}"`;
    qAuth.textContent = `— ${randomQ.author}`;
  };

  const shuffleBtn = document.getElementById('shuffleQuoteBtn');
  if (shuffleBtn) shuffleBtn.addEventListener('click', shuffleQuote);
  shuffleQuote();


  // --- Dashboard Statistics Tracker ---
  const updateDashboardStats = () => {
    const stats = JSON.parse(localStorage.getItem('aura_stats')) || { breathedMinutes: 0, journalStreak: 0, moodLogToday: false };
    
    // Elements
    const streakEl = document.getElementById('statStreak');
    const breatheEl = document.getElementById('statBreathe');
    const statusEl = document.getElementById('statStatus');

    const sidebarStreakEl = document.getElementById('sidebarStreak');
    const sidebarBreatheEl = document.getElementById('sidebarBreathe');

    if (streakEl) streakEl.textContent = `${stats.journalStreak} Days`;
    if (breatheEl) breatheEl.textContent = `${stats.breathedMinutes} Min`;
    if (statusEl) statusEl.innerHTML = stats.moodLogToday 
      ? '<i class="fas fa-check-circle"></i> Logged Today' 
      : '<i class="far fa-circle"></i> Mood Unlogged';

    if (sidebarStreakEl) sidebarStreakEl.textContent = `${stats.journalStreak}d streak`;
    if (sidebarBreatheEl) sidebarBreatheEl.textContent = `${stats.breathedMinutes}m breathed`;
  };

  window.addEventListener('auraStatsUpdated', updateDashboardStats);
  updateDashboardStats();


  // --- Aura Chat Assistant Panel UI ---
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const chatMessages = document.getElementById('chatMessages');
  const chatSuggestions = document.getElementById('chatSuggestions');

  const addChatBubble = (text, sender) => {
    if (!chatMessages) return;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    
    // Support markdown style breaks
    bubble.innerHTML = text.replace(/\n/g, '<br>');

    // Time stamp
    const time = document.createElement('span');
    time.className = 'chat-time';
    const now = new Date();
    time.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    bubble.appendChild(time);

    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  const renderTypingIndicator = () => {
    if (!chatMessages) return null;

    const indicator = document.createElement('div');
    indicator.className = 'chat-bubble bot typing-indicator-container';
    indicator.innerHTML = `
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;
    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return indicator;
  };

  const handleSendMessage = (customText = null) => {
    const text = customText || (chatInput ? chatInput.value.trim() : '');
    if (!text) return;

    if (!customText && chatInput) chatInput.value = '';

    // Add user bubble
    addChatBubble(text, 'user');

    // Show bot typing indicator
    const indicator = renderTypingIndicator();

    // Emulate natural response delay
    setTimeout(() => {
      if (indicator) indicator.remove();

      // Get reply from engine
      const response = window.AuraChat.generateResponse(text);
      addChatBubble(response.text, 'bot');

      // Update suggestion chips
      updateSuggestionChips(response.chips);

      // Handle redirect triggers
      if (response.redirect) {
        setTimeout(() => {
          switchTab(response.redirect);
        }, 1800);
      }
    }, 1000 + Math.random() * 800);
  };

  const updateSuggestionChips = (chipsList) => {
    if (!chatSuggestions) return;
    chatSuggestions.innerHTML = '';
    
    chipsList.forEach(chipText => {
      const chip = document.createElement('button');
      chip.className = 'suggestion-chip';
      chip.textContent = chipText;
      chip.addEventListener('click', () => handleSendMessage(chipText));
      chatSuggestions.appendChild(chip);
    });
  };

  if (chatSendBtn) chatSendBtn.addEventListener('click', () => handleSendMessage());
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSendMessage();
    });
  }

  // Load greeting on startup
  if (chatMessages && chatMessages.children.length === 0) {
    addChatBubble(window.AuraChat.getGreeting(), 'bot');
    updateSuggestionChips(["Feeling anxious", "Stressed about work", "Need a breathing break", "Help me reframe a thought"]);
  }


  // --- Soundscapes Mixer Controller ---
  const soundMixerItems = document.querySelectorAll('.mixer-item');
  const soundCards = document.querySelectorAll('.sound-card');

  const setupSoundElement = (el, isCardMode = false) => {
    const name = el.getAttribute('data-sound');
    const playBtn = el.querySelector('.play-toggle-btn');
    const volumeSlider = el.querySelector('.volume-slider');

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        const isPlaying = window.AuraAudio.toggleSound(name);
        
        if (isPlaying) {
          el.classList.add('playing');
          playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
          el.classList.remove('playing');
          playBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
      });
    }

    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        const vol = parseFloat(e.target.value);
        window.AuraAudio.setVolume(name, vol);
      });
    }
  };

  soundMixerItems.forEach(item => setupSoundElement(item, false));
  soundCards.forEach(card => setupSoundElement(card, true));

  // Binaural beat frequency buttons
  const freqBtns = document.querySelectorAll('.binaural-freq-btn');
  freqBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      freqBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const targetFreq = btn.getAttribute('data-freq');
      window.AuraAudio.setBinauralBeat(targetFreq);
    });
  });

  // Master singing bowl chime hit trigger
  const playBowlBtn = document.getElementById('playBowlChime');
  if (playBowlBtn) {
    playBowlBtn.addEventListener('click', () => {
      window.AuraAudio.playSingingBowl();
    });
  }


  // --- Deep Breathing Assistant UI ---
  const setupBreathingUI = (isDashboardMode = false) => {
    const prefix = isDashboardMode ? 'dash-' : '';
    
    const startBtn = document.getElementById(`${prefix}startBreathingBtn`);
    const sphere = document.getElementById(`${prefix}breathingSphere`);
    const instructionEl = document.getElementById(`${prefix}breathingInstruction`);
    const modeSelect = document.getElementById(`${prefix}breathingPattern`);
    const timeEl = document.getElementById(`${prefix}breathTimerText`);

    if (!startBtn || !sphere) return;

    let localIsPlaying = false;

    startBtn.addEventListener('click', () => {
      if (localIsPlaying) {
        // Stop
        window.AuraBreathing.stop();
        localIsPlaying = false;
        startBtn.textContent = 'Start Session';
        startBtn.classList.remove('btn-secondary');
        startBtn.classList.add('btn-primary');
        sphere.style.transform = 'scale(1.0)';
        if (instructionEl) instructionEl.textContent = 'Ready to begin...';
        if (timeEl) timeEl.textContent = '';
      } else {
        // Start
        const selectedPattern = modeSelect ? modeSelect.value : 'calm';
        localIsPlaying = true;
        startBtn.textContent = 'Stop Session';
        startBtn.classList.remove('btn-primary');
        startBtn.classList.add('btn-secondary');
        
        window.AuraBreathing.start(
          selectedPattern,
          // onTick
          (state, secondsLeft, scale) => {
            sphere.style.transform = `scale(${scale})`;
            if (timeEl) timeEl.textContent = `${secondsLeft}s`;
          },
          // onStateChange
          (state, duration, scaleStart, msg) => {
            sphere.style.transform = `scale(${scaleStart})`;
            if (instructionEl) instructionEl.textContent = msg;
            if (timeEl) timeEl.textContent = `${duration}s`;
          },
          // onStop
          (minutesCompleted) => {
            localIsPlaying = false;
            startBtn.textContent = 'Start Session';
            startBtn.classList.remove('btn-secondary');
            startBtn.classList.add('btn-primary');
            sphere.style.transform = 'scale(1.0)';
            if (instructionEl) instructionEl.textContent = 'Session complete. Well done!';
            if (timeEl) timeEl.textContent = '';
          }
        );
      }
    });
  };

  setupBreathingUI(false); // Full Panel UI
  setupBreathingUI(true);  // Dashboard Mini Widget UI


  // --- Mood Log & Journal UI ---
  const moodBtns = document.querySelectorAll('.mood-btn');
  const tagBtns = document.querySelectorAll('.tag-btn');
  const journalNote = document.getElementById('journalNote');
  const saveJournalBtn = document.getElementById('saveJournalBtn');
  let selectedMood = '';
  let selectedTags = [];

  // Mood buttons log selection
  moodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      moodBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedMood = btn.getAttribute('data-mood');
    });
  });

  // Tag buttons multiple selection toggle
  tagBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tagVal = btn.textContent;
      if (btn.classList.toggle('active')) {
        selectedTags.push(tagVal);
      } else {
        selectedTags = selectedTags.filter(t => t !== tagVal);
      }
    });
  });

  // Save journal entries
  if (saveJournalBtn) {
    saveJournalBtn.addEventListener('click', () => {
      if (!selectedMood) {
        alert("Please select a mood that represents how you feel right now.");
        return;
      }
      
      const note = journalNote ? journalNote.value.trim() : '';
      window.AuraJournal.addEntry(selectedMood, selectedTags, note);

      // Reset selection styles
      moodBtns.forEach(b => b.classList.remove('active'));
      tagBtns.forEach(b => b.classList.remove('active'));
      if (journalNote) journalNote.value = '';
      selectedMood = '';
      selectedTags = [];

      alert("Thank you. Your mood and reflections have been recorded.");
      
      // Update charts & history list
      window.AuraJournal.renderMoodChart('moodChart');
      renderJournalHistory();
      updateDashboardStats();
    });
  }

  // Render list of historic logs in the Journal panel
  const renderJournalHistory = () => {
    const historyList = document.getElementById('journalHistoryList');
    if (!historyList) return;

    const entries = window.AuraJournal.getEntries();
    historyList.innerHTML = '';

    entries.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'history-card';
      
      const tagsHtml = entry.tags.map(t => `<span class="history-tag">${t}</span>`).join('');
      const moodLabel = window.AuraJournal.moodLabels[entry.mood] || 'Neutral';

      card.innerHTML = `
        <div class="history-header">
          <span class="history-date">${new Date(entry.timestamp).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          <div class="history-mood-badge ${entry.mood}">
            <span>${entry.mood === 'radiant' ? '☀️' : entry.mood === 'peaceful' ? '🌿' : entry.mood === 'meh' ? '😐' : entry.mood === 'anxious' ? '⚡' : '🌧️'}</span>
            <span>${moodLabel}</span>
          </div>
        </div>
        ${tagsHtml ? `<div class="history-tags">${tagsHtml}</div>` : ''}
        ${entry.note ? `<p class="history-note">${entry.note}</p>` : '<p class="history-note" style="font-style:italic; opacity:0.6;">No reflections recorded.</p>'}
      `;
      historyList.appendChild(card);
    });
  };

  // Initial dashboard load updates
  setTimeout(() => {
    window.AuraJournal.renderMoodChart('dashboardMoodChart');
  }, 50);

  // Re-draw when tab loads or storage updates
  window.addEventListener('auraJournalUpdated', () => {
    window.AuraJournal.renderMoodChart('dashboardMoodChart');
  });


  // --- CBT Cognitive Reframing Wizard UI ---
  let cbtStep = 1;
  const cbtStepsEls = document.querySelectorAll('.cbt-step');
  const progressNodes = document.querySelectorAll('.progress-node');
  const cbtProgressBar = document.getElementById('cbtProgressBar');
  const nextCbtBtn = document.getElementById('nextCbtBtn');
  const prevCbtBtn = document.getElementById('prevCbtBtn');

  // CBT elements
  const oldThoughtText = document.getElementById('oldThoughtText');
  const distortionCards = document.querySelectorAll('.distortion-card');
  const balancedThoughtText = document.getElementById('balancedThoughtText');
  let selectedDistortion = '';

  const updateCbtWizardUI = () => {
    // Show active step
    cbtStepsEls.forEach((el, idx) => {
      if (idx === cbtStep - 1) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Update progress nodes
    progressNodes.forEach((node, idx) => {
      node.className = 'progress-node';
      if (idx === cbtStep - 1) {
        node.classList.add('active');
      } else if (idx < cbtStep - 1) {
        node.classList.add('complete');
      }
    });

    // Progress bar width percentage
    const progressWidths = [0, 50, 100];
    if (cbtProgressBar) {
      cbtProgressBar.style.width = `${progressWidths[cbtStep - 1]}%`;
    }

    // Toggle Back button
    if (cbtStep === 1) {
      if (prevCbtBtn) prevCbtBtn.style.visibility = 'hidden';
    } else {
      if (prevCbtBtn) prevCbtBtn.style.visibility = 'visible';
    }

    // Toggle Next / Submit button text
    if (cbtStep === 3) {
      if (nextCbtBtn) nextCbtBtn.textContent = 'Save Reframed Thought';
    } else {
      if (nextCbtBtn) nextCbtBtn.textContent = 'Next';
    }
  };

  const resetCbtWizard = () => {
    cbtStep = 1;
    selectedDistortion = '';
    if (oldThoughtText) oldThoughtText.value = '';
    if (balancedThoughtText) balancedThoughtText.value = '';
    distortionCards.forEach(c => c.classList.remove('selected'));
    updateCbtWizardUI();
  };

  distortionCards.forEach(card => {
    card.addEventListener('click', () => {
      distortionCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedDistortion = card.getAttribute('data-distortion');
    });
  });

  if (nextCbtBtn) {
    nextCbtBtn.addEventListener('click', () => {
      if (cbtStep === 1) {
        if (!oldThoughtText.value.trim()) {
          alert("Please write down the negative thought you are experiencing.");
          return;
        }
        cbtStep = 2;
        updateCbtWizardUI();
      } else if (cbtStep === 2) {
        if (!selectedDistortion) {
          alert("Please select the cognitive distortion that describes this thought.");
          return;
        }
        cbtStep = 3;
        updateCbtWizardUI();
      } else if (cbtStep === 3) {
        if (!balancedThoughtText.value.trim()) {
          alert("Please write a more balanced, logical alternative thought.");
          return;
        }
        
        // Save thought
        window.AuraReframing.saveReframedThought(
          oldThoughtText.value.trim(),
          selectedDistortion,
          balancedThoughtText.value.trim()
        );

        alert("Thought reframed and saved. Developing alternative perspectives heals the mind.");
        resetCbtWizard();
        renderReframedThoughts();
      }
    });
  }

  if (prevCbtBtn) {
    prevCbtBtn.addEventListener('click', () => {
      if (cbtStep > 1) {
        cbtStep--;
        updateCbtWizardUI();
      }
    });
  }

  // Render saved reframed thoughts list
  const renderReframedThoughts = () => {
    const listEl = document.getElementById('reframedThoughtsList');
    if (!listEl) return;

    const list = window.AuraReframing.getReframedThoughts();
    listEl.innerHTML = '';

    list.forEach(item => {
      const card = document.createElement('div');
      card.className = 'reframed-thought-card';
      card.innerHTML = `
        <span class="distortion-badge">${item.distortionTitle}</span>
        <div class="thought-comparison">
          <div>
            <div style="font-weight:600; font-size:0.75rem; text-transform:uppercase; margin-bottom:0.25rem; color:#fca5a5;">Automatic Thought</div>
            <p class="old-thought">${item.oldThought}</p>
          </div>
          <div>
            <div style="font-weight:600; font-size:0.75rem; text-transform:uppercase; margin-bottom:0.25rem; color:#86efac;">Balanced Perspective</div>
            <p class="new-thought">${item.newThought}</p>
          </div>
        </div>
      `;
      listEl.appendChild(card);
    });
  };

  resetCbtWizard();
});
