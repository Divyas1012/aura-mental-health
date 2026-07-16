/**
 * Aura Cognitive Behavioral Therapy (CBT) Cognitive Reframing Wizard Engine
 * Handles step workflows, distortion types database, and reframed thought records.
 */

class ReframingManager {
  constructor() {
    this.thoughtsKey = 'aura_reframed_thoughts';
    
    this.distortionTypes = [
      {
        id: 'catastrophizing',
        title: '💥 Catastrophizing',
        description: 'Expecting the absolute worst-case scenario to happen, even if it is highly unlikely.'
      },
      {
        id: 'all_or_nothing',
        title: '🏁 All-or-Nothing',
        description: 'Viewing situations in black-and-white. If something is not perfect, it is a complete failure.'
      },
      {
        id: 'mind_reading',
        title: '🧠 Mind Reading',
        description: 'Assuming you know what others are thinking about you without any real evidence.'
      },
      {
        id: 'personalization',
        title: '👤 Personalization',
        description: 'Blaming yourself for negative events that are outside of your control.'
      },
      {
        id: 'overgeneralization',
        title: '🔄 Overgeneralization',
        description: 'Taking one negative event and concluding it will happen over and over again.'
      },
      {
        id: 'should_statements',
        title: '📢 Should Statements',
        description: 'Using pressure words like "I should" or "must", creating toxic guilt and frustration.'
      }
    ];

    this.currentThought = {
      oldThought: '',
      distortionId: '',
      newThought: ''
    };
  }

  getReframedThoughts() {
    const data = localStorage.getItem(this.thoughtsKey);
    if (!data) {
      const initialMock = [
        {
          timestamp: Date.now() - 3*24*60*60*1000,
          oldThought: "Everyone at work thinks my presentation was a disaster.",
          distortionTitle: "🧠 Mind Reading",
          newThought: "I received positive feedback from my manager. Although I made a few typos, people got the core message and it went fine."
        },
        {
          timestamp: Date.now() - 5*24*60*60*1000,
          oldThought: "I messed up my diet today; I have no self-control and I will never get healthy.",
          distortionTitle: "🏁 All-or-Nothing",
          newThought: "One meal doesn't ruin weeks of healthy choices. I can simply choose nourishing foods for dinner."
        }
      ];
      localStorage.setItem(this.thoughtsKey, JSON.stringify(initialMock));
      return initialMock;
    }
    return JSON.parse(data).sort((a, b) => b.timestamp - a.timestamp);
  }

  saveReframedThought(oldThought, distortionId, newThought) {
    const list = this.getReframedThoughts();
    const distortion = this.distortionTypes.find(d => d.id === distortionId);
    const distortionTitle = distortion ? distortion.title : 'General Distortion';

    const entry = {
      timestamp: Date.now(),
      oldThought: oldThought,
      distortionTitle: distortionTitle,
      newThought: newThought
    };

    list.push(entry);
    localStorage.setItem(this.thoughtsKey, JSON.stringify(list));

    // Reset current wizard state
    this.currentThought = { oldThought: '', distortionId: '', newThought: '' };

    // Dispatch update event
    window.dispatchEvent(new Event('auraReframedThoughtsUpdated'));
  }

  getDistortionTitle(id) {
    const dist = this.distortionTypes.find(d => d.id === id);
    return dist ? dist.title : 'General';
  }
}

// Export single instance
window.AuraReframing = new ReframingManager();
