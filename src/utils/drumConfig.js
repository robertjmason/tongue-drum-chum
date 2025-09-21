/**
 * Drum configuration utilities and scale mappings for tongue drums
 * Handles frequency calculations, layouts, and preset configurations
 */

// Scale patterns in semitones relative to root note
export const SCALE_PATTERNS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  akebono: [0, 2, 3, 7, 8],
  hijaz: [0, 1, 4, 5, 7, 8, 11]
};

// Note names to semitone offsets from C
export const NOTE_TO_SEMITONE = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
  'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};

// Preset drum configurations with layouts and frequency mappings
export const DRUM_PRESETS = {
  'D Major 15-note': {
    noteCount: 15,
    key: 'D',
    scaleType: 'major',
    rootOctave: 4,
    layout: null
  },
  'G Minor 13-note': {
    noteCount: 13,
    key: 'G',
    scaleType: 'minor',
    rootOctave: 4,
    layout: null
  },
  'C Pentatonic 11-note': {
    noteCount: 11,
    key: 'C',
    scaleType: 'pentatonic',
    rootOctave: 4,
    layout: null
  },
  'A Minor Pentatonic 9-note': {
    noteCount: 9,
    key: 'A',
    scaleType: 'minorPentatonic',
    rootOctave: 4,
    layout: null
  },
  'F Akebono 8-note': {
    noteCount: 8,
    key: 'F',
    scaleType: 'akebono',
    rootOctave: 4,
    layout: null
  }
};

/**
 * Drum configuration manager class
 */
export class DrumConfigManager {
  constructor(config = {}) {
    this.config = {
      noteCount: config.noteCount || 15,
      key: config.key || 'D',
      scaleType: config.scaleType || 'major',
      rootOctave: config.rootOctave || 4
    };
    
    this.customLayouts = new Map();
    this.loadPresetsFromStorage();
  }

  /**
   * Update drum configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Calculate frequency for a specific tongue
   */
  getTongueFrequency(tongueNumber) {
    if (tongueNumber < 1 || tongueNumber > this.config.noteCount) {
      return null;
    }
    
    // Get base frequency for root note in specified octave
    const baseFrequency = this.getNoteFrequency(this.config.key, this.config.rootOctave);
    
    // Get scale pattern
    const pattern = SCALE_PATTERNS[this.config.scaleType] || SCALE_PATTERNS.major;
    
    // Calculate note offset
    const scaleIndex = (tongueNumber - 1) % pattern.length;
    const octaveOffset = Math.floor((tongueNumber - 1) / pattern.length);
    const semitoneOffset = pattern[scaleIndex] + (octaveOffset * 12);
    
    // Calculate frequency using equal temperament
    return baseFrequency * Math.pow(2, semitoneOffset / 12);
  }

  /**
   * Get all tongue frequencies as a mapping
   */
  getTongueFrequencies() {
    const frequencies = {};
    for (let i = 1; i <= this.config.noteCount; i++) {
      frequencies[i] = this.getTongueFrequency(i);
    }
    return frequencies;
  }

  /**
   * Get frequency for a specific note and octave
   */
  getNoteFrequency(note, octave) {
    const semitoneOffset = NOTE_TO_SEMITONE[note] || 0;
    // A4 = 440 Hz, calculate from there
    const semitonesFromA4 = (octave - 4) * 12 + semitoneOffset - 9; // A is the 9th semitone
    return 440 * Math.pow(2, semitonesFromA4 / 12);
  }

  /**
   * Generate default circular layout for tongues
   */
  generateDefaultLayout() {
    const positions = {};
    const centerX = 300; // Canvas center
    const centerY = 300;
    const radius = 200;

    for (let i = 1; i <= this.config.noteCount; i++) {
      const angle = (2 * Math.PI * (i - 1)) / this.config.noteCount - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      positions[i] = { x, y };
    }

    return {
      name: `Default ${this.config.noteCount}-Note Layout`,
      positions: positions
    };
  }

  /**
   * Load a preset configuration
   */
  loadPreset(presetName) {
    const preset = DRUM_PRESETS[presetName];
    if (!preset) {
      console.warn(`Preset "${presetName}" not found`);
      return null;
    }

    this.updateConfig({
      noteCount: preset.noteCount,
      key: preset.key,
      scaleType: preset.scaleType,
      rootOctave: preset.rootOctave
    });

    return preset.layout;
  }

  /**
   * Save custom layout
   */
  saveCustomLayout(layout) {
    this.customLayouts.set(layout.name, layout);
    this.savePresetsToStorage();
  }

  /**
   * Get custom layout by name
   */
  getCustomLayout(name) {
    return this.customLayouts.get(name);
  }

  /**
   * Get all available presets (built-in + custom)
   */
  getAllPresets() {
    const presets = { ...DRUM_PRESETS };
    
    // Add custom layouts
    for (const [name, layout] of this.customLayouts) {
      presets[name] = {
        noteCount: this.config.noteCount,
        key: this.config.key,
        scaleType: this.config.scaleType,
        rootOctave: this.config.rootOctave,
        layout: layout
      };
    }
    
    return presets;
  }

  /**
   * Get formatted drum information string
   */
  getDrumInfo() {
    const scaleDisplayName = this.config.scaleType.charAt(0).toUpperCase() + 
                           this.config.scaleType.slice(1);
    return `${this.config.noteCount}-Note ${this.config.key} ${scaleDisplayName}`;
  }

  /**
   * Get note name for a specific tongue
   */
  getTongueNoteName(tongueNumber) {
    if (tongueNumber < 1 || tongueNumber > this.config.noteCount) {
      return 'Invalid';
    }
    
    const pattern = SCALE_PATTERNS[this.config.scaleType] || SCALE_PATTERNS.major;
    const scaleIndex = (tongueNumber - 1) % pattern.length;
    const octaveOffset = Math.floor((tongueNumber - 1) / pattern.length);
    
    // Calculate semitone offset from root
    const rootSemitone = NOTE_TO_SEMITONE[this.config.key] || 0;
    const noteSemitone = (rootSemitone + pattern[scaleIndex]) % 12;
    const noteOctave = this.config.rootOctave + octaveOffset + 
                      Math.floor((rootSemitone + pattern[scaleIndex]) / 12);
    
    // Convert back to note name
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const noteName = noteNames[noteSemitone];
    
    return `${noteName}${noteOctave}`;
  }

  /**
   * Analyze detected frequency and provide note information
   */
  analyzeFrequency(frequency) {
    // Find closest semitone
    const A4 = 440;
    const semitoneFromA4 = Math.round(12 * Math.log2(frequency / A4));
    const closestFrequency = A4 * Math.pow(2, semitoneFromA4 / 12);
    const centsOff = Math.round(1200 * Math.log2(frequency / closestFrequency));
    
    // Calculate note name and octave
    const noteIndex = (semitoneFromA4 + 9) % 12; // A4 is index 9
    const octave = 4 + Math.floor((semitoneFromA4 + 9) / 12);
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const noteName = noteNames[noteIndex < 0 ? noteIndex + 12 : noteIndex];
    
    return {
      frequency: frequency,
      closestNote: `${noteName}${octave}`,
      closestFrequency: closestFrequency,
      centsOff: centsOff,
      inTune: Math.abs(centsOff) <= 10
    };
  }

  /**
   * Validate if a tongue sequence is musically coherent
   */
  validateSequence(sequence) {
    if (!sequence || sequence.length === 0) {
      return { valid: false, reason: 'Empty sequence' };
    }
    
    // Check if all tongue numbers are valid
    for (const note of sequence) {
      const tongueNumber = typeof note === 'object' ? note.tongue : note;
      if (tongueNumber < 1 || tongueNumber > this.config.noteCount) {
        return { valid: false, reason: `Invalid tongue number: ${tongueNumber}` };
      }
    }
    
    // Check for reasonable melodic intervals (no jumps > 2 octaves)
    for (let i = 1; i < sequence.length; i++) {
      const prevTongue = typeof sequence[i-1] === 'object' ? sequence[i-1].tongue : sequence[i-1];
      const currTongue = typeof sequence[i] === 'object' ? sequence[i].tongue : sequence[i];
      
      const prevFreq = this.getTongueFrequency(prevTongue);
      const currFreq = this.getTongueFrequency(currTongue);
      
      const interval = Math.abs(Math.log2(currFreq / prevFreq));
      if (interval > 2) { // More than 2 octaves
        return { 
          valid: false, 
          reason: `Large melodic jump between tongues ${prevTongue} and ${currTongue}` 
        };
      }
    }
    
    return { valid: true };
  }

  /**
   * Save presets to localStorage
   */
  savePresetsToStorage() {
    try {
      const customData = {};
      for (const [name, layout] of this.customLayouts) {
        customData[name] = layout;
      }
      localStorage.setItem('tongueDrumCustomLayouts', JSON.stringify(customData));
    } catch (error) {
      console.warn('Failed to save custom layouts to storage:', error);
    }
  }

  /**
   * Load presets from localStorage
   */
  loadPresetsFromStorage() {
    try {
      const customData = localStorage.getItem('tongueDrumCustomLayouts');
      if (customData) {
        const layouts = JSON.parse(customData);
        for (const [name, layout] of Object.entries(layouts)) {
          this.customLayouts.set(name, layout);
        }
      }
    } catch (error) {
      console.warn('Failed to load custom layouts from storage:', error);
    }
  }

  /**
   * Export configuration as JSON
   */
  exportConfig() {
    return {
      config: this.config,
      customLayouts: Object.fromEntries(this.customLayouts),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Import configuration from JSON
   */
  importConfig(data) {
    try {
      if (data.config) {
        this.updateConfig(data.config);
      }
      
      if (data.customLayouts) {
        this.customLayouts.clear();
        for (const [name, layout] of Object.entries(data.customLayouts)) {
          this.customLayouts.set(name, layout);
        }
        this.savePresetsToStorage();
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return false;
    }
  }
}
