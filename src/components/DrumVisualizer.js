import { DrumConfigManager } from '../utils/drumConfig.js';

/**
 * DrumVisualizer component handles the drum display and tongue interactions
 */
export class DrumVisualizer {
  constructor(container) {
    this.container = container;
    this.drumElement = container.querySelector('#drumVisual');
    this.centerElement = container.querySelector('#centerNote');
    
    if (!this.drumElement || !this.centerElement) {
      throw new Error('Required drum elements not found');
    }

    // Initialize with default configuration
    this.configManager = new DrumConfigManager({
      noteCount: 15,
      key: 'D',
      scaleType: 'major',
      rootOctave: 4
    });

    this.customLayout = null;
    this.onTongueClick = null;

    this.updateDrumVisual();
  }

  /**
   * Update drum configuration and refresh visual
   */
  updateConfiguration(config) {
    this.configManager.updateConfig(config);
    this.updateDrumVisual();
  }

  /**
   * Set custom layout for tongues
   */
  setCustomLayout(layout) {
    this.customLayout = layout;
    this.updateDrumVisual();
  }

  /**
   * Set callback for tongue click events
   */
  onTongueClicked(callback) {
    this.onTongueClick = callback;
  }

  /**
   * Highlight a specific tongue (for note detection feedback)
   */
  highlightTongue(tongueNumber, duration = 500) {
    const tongue = this.drumElement.querySelector(`[data-tongue="${tongueNumber}"]`);
    if (!tongue) return;

    // Clear existing highlighting
    this.clearHighlights();

    // Add playing class
    tongue.classList.add('playing');

    // Remove highlighting after duration
    setTimeout(() => {
      tongue.classList.remove('playing');
    }, duration);
  }

  /**
   * Show which tongue should be played next
   */
  showNextTongue(tongueNumber) {
    // Clear existing next indicators
    this.drumElement.querySelectorAll('.tongue').forEach(t => {
      t.classList.remove('next');
    });

    // Highlight the next tongue
    const tongue = this.drumElement.querySelector(`[data-tongue="${tongueNumber}"]`);
    if (tongue) {
      tongue.classList.add('next');
    }
  }

  /**
   * Clear all visual highlights
   */
  clearHighlights() {
    this.drumElement.querySelectorAll('.tongue').forEach(tongue => {
      tongue.classList.remove('playing', 'next');
    });
  }

  /**
   * Get current drum configuration
   */
  getConfiguration() {
    return this.configManager.getConfig();
  }

  /**
   * Get tongue frequencies mapping
   */
  getTongueFrequencies() {
    return this.configManager.getTongueFrequencies();
  }

  /**
   * Update the visual drum display
   */
  updateDrumVisual() {
    const config = this.configManager.getConfig();
    
    // Update drum size class
    this.drumElement.className = `drum-visual drum-${config.noteCount}`;
    
    // Update center note
    this.centerElement.className = `center-note center-${config.noteCount}`;
    this.centerElement.textContent = '0';
    
    // Clear existing tongues
    const existingTongues = this.drumElement.querySelectorAll('.tongue, .draggable-tongue');
    existingTongues.forEach(tongue => tongue.remove());
    
    // Generate new tongues
    if (this.customLayout) {
      this.generateCustomLayout();
    } else {
      this.generateCircularLayout();
    }
  }

  /**
   * Generate tongues using custom layout positions
   */
  generateCustomLayout() {
    if (!this.customLayout) return;

    const config = this.configManager.getConfig();
    const positions = this.customLayout.positions;
    
    for (let i = 1; i <= config.noteCount; i++) {
      const tongue = document.createElement('div');
      tongue.className = `tongue tongue-${config.noteCount}`;
      tongue.dataset.tongue = i.toString();
      tongue.textContent = i.toString();
      
      // Use custom position if available, otherwise default
      if (positions[i]) {
        // Convert absolute positions to relative for the visual drum container
        const drumRect = this.drumElement.getBoundingClientRect();
        const drumWidth = drumRect.width || 500;
        const drumHeight = drumRect.height || 500;
        const canvasWidth = 600; // Original canvas width from layout builder
        const canvasHeight = 600; // Original canvas height from layout builder
        
        const scaleX = drumWidth / canvasWidth;
        const scaleY = drumHeight / canvasHeight;
        
        const x = positions[i].x * scaleX;
        const y = positions[i].y * scaleY;
        
        tongue.style.position = 'absolute';
        tongue.style.left = x + 'px';
        tongue.style.top = y + 'px';
      } else {
        // Fallback to circular positioning
        this.positionTongueCircularly(tongue, i, config.noteCount);
      }
      
      // Add click handler
      tongue.addEventListener('click', () => {
        if (this.onTongueClick) {
          this.onTongueClick(i);
        }
      });
      
      this.drumElement.appendChild(tongue);
    }
  }

  /**
   * Generate tongues in circular layout
   */
  generateCircularLayout() {
    const config = this.configManager.getConfig();
    
    for (let i = 1; i <= config.noteCount; i++) {
      const tongue = document.createElement('div');
      tongue.className = `tongue tongue-${config.noteCount}`;
      tongue.dataset.tongue = i.toString();
      tongue.textContent = i.toString();
      
      this.positionTongueCircularly(tongue, i, config.noteCount);
      
      // Add click handler
      tongue.addEventListener('click', () => {
        if (this.onTongueClick) {
          this.onTongueClick(i);
        }
      });
      
      this.drumElement.appendChild(tongue);
    }
  }

  /**
   * Position a tongue element in circular layout
   */
  positionTongueCircularly(tongue, index, totalCount) {
    const drumRect = this.drumElement.getBoundingClientRect();
    const radius = Math.max(drumRect.width, drumRect.height) / 2 - 50;
    
    // Calculate position in circle (start at top, -Math.PI/2)
    const angle = (2 * Math.PI * (index - 1)) / totalCount - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    // Position relative to center
    tongue.style.position = 'absolute';
    tongue.style.left = `calc(50% + ${x}px - 22px)`; // Account for tongue width
    tongue.style.top = `calc(50% + ${y}px - 35px)`; // Account for tongue height
  }

  /**
   * Resize the drum visualization
   */
  resize() {
    // Recalculate positions if using circular layout
    if (!this.customLayout) {
      this.updateDrumVisual();
    }
  }

  /**
   * Get formatted drum info string
   */
  getDrumInfo() {
    return this.configManager.getDrumInfo();
  }

  /**
   * Simulate note detection for testing
   */
  simulateNoteDetection(tongueNumber) {
    const frequency = this.configManager.getTongueFrequency(tongueNumber);
    if (!frequency) return null;

    const detection = {
      tongue: tongueNumber,
      confidence: 0.95,
      frequency: frequency,
      targetFrequency: frequency
    };

    this.highlightTongue(tongueNumber);
    return detection;
  }

  /**
   * Load a preset configuration
   */
  loadPreset(presetName) {
    const customLayout = this.configManager.loadPreset(presetName);
    if (customLayout) {
      this.setCustomLayout(customLayout);
    } else {
      this.setCustomLayout(null);
    }
    this.updateDrumVisual();
    return true;
  }

  /**
   * Get note name for a specific tongue
   */
  getTongueNoteName(tongueNumber) {
    return this.configManager.getTongueNoteName(tongueNumber);
  }

  /**
   * Get all available presets
   */
  getAllPresets() {
    return this.configManager.getAllPresets();
  }

  /**
   * Add visual feedback for successful note detection
   */
  showDetectionFeedback(detection) {
    this.highlightTongue(detection.tongue, 400);
    
    // Add confidence indicator
    const tongue = this.drumElement.querySelector(`[data-tongue="${detection.tongue}"]`);
    if (tongue && detection.confidence) {
      const confidenceBar = document.createElement('div');
      confidenceBar.className = 'confidence-indicator';
      confidenceBar.style.width = `${detection.confidence * 100}%`;
      tongue.appendChild(confidenceBar);
      
      setTimeout(() => {
        confidenceBar.remove();
      }, 400);
    }
  }

  /**
   * Show frequency analysis overlay
   */
  showFrequencyAnalysis(frequency) {
    const analysis = this.configManager.analyzeFrequency(frequency);
    
    // Create temporary display element
    const display = document.createElement('div');
    display.className = 'frequency-analysis';
    display.innerHTML = `
      <div class="detected-freq">${frequency.toFixed(1)} Hz</div>
      <div class="closest-note">${analysis.closestNote}</div>
      <div class="cents-off ${analysis.inTune ? 'in-tune' : 'out-of-tune'}">
        ${analysis.centsOff > 0 ? '+' : ''}${analysis.centsOff} cents
      </div>
    `;
    
    this.container.appendChild(display);
    
    setTimeout(() => {
      display.remove();
    }, 2000);
  }

  /**
   * Export current drum state
   */
  exportDrumState() {
    return {
      configuration: this.getConfiguration(),
      customLayout: this.customLayout,
      drumInfo: this.getDrumInfo(),
      tongueFrequencies: this.getTongueFrequencies()
    };
  }

  /**
   * Import drum state
   */
  importDrumState(state) {
    if (state.configuration) {
      this.updateConfiguration(state.configuration);
    }
    
    if (state.customLayout) {
      this.setCustomLayout(state.customLayout);
    }
    
    return true;
  }
}
