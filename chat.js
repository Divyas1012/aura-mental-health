/**
 * Aura Empathetic AI Companion Engine
 * Handles sentiment analysis, conversational flows, and guided suggestions client-side.
 */

class AuraChatEngine {
  constructor() {
    this.conversationHistory = [];
    this.currentContext = 'general'; // general, anxious, sad, angry, tired, cbt_prompt
    
    // Emotion keyword mappings
    this.emotionKeywords = {
      anxious: ['anxious', 'panic', 'scared', 'stress', 'worried', 'nervous', 'fear', 'overwhelmed', 'freaking', 'tight', 'breathless', 'shaking'],
      sad: ['sad', 'lonely', 'depressed', 'cry', 'crying', 'hurt', 'empty', 'grief', 'down', 'unhappy', 'worthless', 'unwanted', 'alone'],
      angry: ['angry', 'mad', 'frustrated', 'hate', 'annoyed', 'pissed', 'furious', 'rage', 'screaming', 'unfair'],
      tired: ['tired', 'exhausted', 'sleepy', 'burnout', 'overworked', 'drained', 'fatigued', 'heavy', 'no energy', 'cant focus'],
      positive: ['good', 'happy', 'great', 'thankful', 'grateful', 'excited', 'well', 'calm', 'peaceful', 'recovered', 'better', 'love']
    };

    // Empathetic response banks
    this.responses = {
      greetings: [
        "Hello, I'm Aura. I'm here to listen, support, and help you find a calm center. How are you feeling today?",
        "Welcome back. Take a deep breath. Whatever is on your mind, I'm here to hold space for you. What's going on?",
        "Hi there. I'm glad you reached out. How are you holding up in this moment?"
      ],
      
      anxious: {
        validate: [
          "I hear you. Feeling overwhelmed and anxious can feel really heavy in the body. It is completely okay to feel this way right now.",
          "Anxiety has a way of making everything feel urgent and scary. You're safe here. Let's take things one step at a time.",
          "Thank you for sharing that with me. Your nervous system is just trying to protect you, but we can help it calm down together."
        ],
        coping: [
          "Would you like to try a quick **4-7-8 breathing exercise** with me? It can help trigger your body's relaxation response.",
          "We could also practice a simple **5-4-3-2-1 grounding technique** to help bring you back to the present moment.",
          "Let's focus on slowing down your breath. Try to breathe in through your nose, and let out a long, slow sigh."
        ],
        chips: ["Start 4-7-8 Breathing", "5-4-3-2-1 Grounding", "Talk about something else"]
      },
      
      sad: {
        validate: [
          "I'm so sorry things feel heavy right now. It's okay to not be okay, and it's okay to feel sad or lonely.",
          "I'm here with you. You don't have to carry this sadness alone, and you don't have to put on a brave face for me.",
          "It takes courage to admit you're feeling down. I'm listening. Tell me more about what's bringing this cloud over you."
        ],
        coping: [
          "Sometimes putting thoughts down on paper helps release some of the weight. Would you like to write a entry in your **Journal**?",
          "We could also layer some soothing **ambient sounds** (like ocean waves or binaural beats) to create a gentle background.",
          "Be gentle with yourself today. What is one small, simple act of kindness you can show yourself in the next hour?"
        ],
        chips: ["Write in Journal", "Play Calm Sounds", "Just venting..."]
      },
      
      angry: {
        validate: [
          "It sounds like you're dealing with a lot of frustration, and that anger is completely valid. Let it out. I won't judge.",
          "Anger is a powerful messenger. It often tells us when our boundaries have been crossed. Tell me what's making you feel this way.",
          "That sounds incredibly frustrating. It makes complete sense why you'd feel angry about that."
        ],
        coping: [
          "Venting is a healthy release. If you want to dump your thoughts here, write as much as you need.",
          "To release some physical tension, try unclenching your jaw, lowering your shoulders, and taking a deep, slow breath.",
          "Would you like to try the **CBT thought reframing tool** to dissect this situation and find a balanced perspective?"
        ],
        chips: ["Reframe a Thought", "Do breathing exercises", "Vent more"]
      },

      tired: {
        validate: [
          "It sounds like you are running on empty. Please remember that resting is not lazy; it is essential recovery.",
          "Your energy is valuable, and it's okay to reach a point where you just can't do it anymore. You've been doing a lot.",
          "I can hear how drained you are. Let's take off all the pressure right now. You don't have to achieve anything here."
        ],
        coping: [
          "I highly recommend turning on the **Binaural Beats (Theta Waves)** and just closing your eyes for a few minutes.",
          "Try to do the bare minimum for the rest of today. What is one thing on your to-do list you can give yourself permission to drop?",
          "Would you like to try a very slow, gentle breathing rhythm just to help you relax?"
        ],
        chips: ["Play Theta Waves", "Guided Slow Breathing", "Goodnight Aura"]
      },

      positive: {
        validate: [
          "That is wonderful to hear! I'm so glad you're experiencing a moment of peace and light.",
          "It's beautiful to celebrate these positive feelings. Soak them in! What do you think contributed to this good mood?",
          "Love that for you. It's so important to notice and appreciate these brighter moments."
        ],
        coping: [
          "If you have a moment, write this down in your **Journal**! It's a great positive anchor to look back on when days are harder.",
          "How can you carry this positive energy forward today to nourish yourself or share it with others?",
          "Would you like to listen to some uplifting soundscapes to enhance this state?"
        ],
        chips: ["Log this Mood", "Listen to Soundscapes", "Thanks Aura!"]
      },

      reflexive: [
        "I hear you. Tell me more about that.",
        "That sounds like it has a big impact on you. How does that make you feel?",
        "Thank you for sharing that. What does that mean for you in this moment?",
        "I'm listening. What else comes up when you think about that?",
        "It sounds like you are navigating some complex feelings. What would feel most supportive for you right now?"
      ]
    };
  }

  // Analyzes user text for emotions
  detectEmotion(text) {
    const cleanText = text.toLowerCase();
    let scores = { anxious: 0, sad: 0, angry: 0, tired: 0, positive: 0 };

    for (const [emotion, keywords] of Object.entries(this.emotionKeywords)) {
      keywords.forEach(keyword => {
        if (cleanText.includes(keyword)) {
          scores[emotion]++;
        }
      });
    }

    // Find highest score
    let highestEmotion = 'general';
    let highestScore = 0;

    for (const [emotion, score] of Object.entries(scores)) {
      if (score > highestScore) {
        highestScore = score;
        highestEmotion = emotion;
      }
    }

    return highestEmotion;
  }

  // Passive active listening reflection helper
  generateReflexivePattern(text) {
    // Basic regex reflections
    const reflections = [
      { regex: /i feel (.*)/i, replacement: "It makes sense that you feel $1. How long have you felt this way?" },
      { regex: /i am (.*)/i, replacement: "You say you are $1. What do you think led to that?" },
      { regex: /i can't (.*)/i, replacement: "It sounds like you feel blocked from $1. What is the biggest hurdle?" },
      { regex: /i want (.*)/i, replacement: "What would it mean to you if you were able to have or do $1?" },
      { regex: /my (.*) is (.*)/i, replacement: "Tell me more about your $1. How does it affect your day-to-day?" }
    ];

    for (let rule of reflections) {
      const match = text.match(rule.regex);
      if (match && match[1]) {
        // Return replaced string
        return text.replace(rule.regex, rule.replacement);
      }
    }

    return null;
  }

  // Core reply generator
  generateResponse(userMsg) {
    this.conversationHistory.push({ role: 'user', content: userMsg });

    // Check for explicit commands or chips
    const text = userMsg.toLowerCase().trim();
    
    // Command routing
    if (text.includes("start 4-7-8") || text.includes("breathing exercise")) {
      this.currentContext = 'anxious';
      return {
        text: "Excellent choice. Let's head over to the **Breathing** tab or start it right here. Breathe in slowly for 4 seconds, hold for 7, and exhale for 8. Let's do it together.",
        chips: ["Open Breathing Tab", "Actually, let's chat"],
        redirect: "breathing"
      };
    }
    
    if (text.includes("grounding") || text.includes("5-4-3-2-1")) {
      this.currentContext = 'anxious';
      return {
        text: "Let's do the **5-4-3-2-1 Grounding Exercise** together. Wherever you are, look around and identify:\n\n" +
              "👀 **5 things you can see** (e.g. a lamp, a book, a dust mote)\n" +
              "✋ **4 things you can feel** (e.g. the seat under you, your hair on your neck)\n" +
              "👂 **3 things you can hear** (e.g. hum of a computer, traffic outside)\n" +
              "👃 **2 things you can smell** (e.g. coffee, fresh laundry)\n" +
              "👅 **1 thing you can taste** (e.g. toothpaste, mint)\n\n" +
              "Take your time to notice each one. Write down what you see or feel first.",
        chips: ["Done, I feel calmer", "That was tough", "Try breathing next"]
      };
    }

    if (text.includes("write in journal") || text.includes("log this mood") || text.includes("open journal")) {
      return {
        text: "Writing down your feelings helps clarify and release them. I've guided you to the **Journal & Mood Tracker** page. What's on your mind today?",
        chips: ["Write Journal Now", "Go back to chat"],
        redirect: "journal"
      };
    }

    if (text.includes("play calm sounds") || text.includes("play theta waves") || text.includes("listen to soundscapes")) {
      return {
        text: "Creating a soothing auditory environment is a beautiful way to center yourself. Let's play some ambient tones in the **Soundscapes** panel.",
        chips: ["Play Ocean Waves", "Play Binaural Beats", "Open Soundscapes"],
        redirect: "soundscapes"
      };
    }

    if (text.includes("reframe a thought") || text.includes("cbt")) {
      return {
        text: "Wonderful. Recognizing that our thoughts aren't always facts is the first step. Let's launch the **Cognitive Reframing (CBT)** wizard so we can unpack it together.",
        chips: ["Open CBT Wizard", "Let's just chat"],
        redirect: "cbt"
      };
    }

    // Detect emotion context
    const detectedEmotion = this.detectEmotion(userMsg);
    this.currentContext = detectedEmotion;

    let responseText = "";
    let suggestionChips = [];

    if (detectedEmotion !== 'general') {
      const bank = this.responses[detectedEmotion];
      const val = bank.validate[Math.floor(Math.random() * bank.validate.length)];
      const cop = bank.coping[Math.floor(Math.random() * bank.coping.length)];
      responseText = `${val}\n\n${cop}`;
      suggestionChips = bank.chips;
    } else {
      // General response fallback using reflexive listening or generic response
      const reflexiveText = this.generateReflexivePattern(userMsg);
      if (reflexiveText) {
        responseText = reflexiveText;
      } else {
        responseText = this.responses.reflexive[Math.floor(Math.random() * this.responses.reflexive.length)];
      }
      suggestionChips = ["Feeling anxious", "Feeling sad", "Help me reframe a thought", "Just wanted to say hi"];
    }

    this.conversationHistory.push({ role: 'bot', content: responseText });
    
    return {
      text: responseText,
      chips: suggestionChips
    };
  }

  getGreeting() {
    const greeting = this.responses.greetings[Math.floor(Math.random() * this.responses.greetings.length)];
    this.conversationHistory.push({ role: 'bot', content: greeting });
    return greeting;
  }
}

// Export single instance
window.AuraChat = new AuraChatEngine();
