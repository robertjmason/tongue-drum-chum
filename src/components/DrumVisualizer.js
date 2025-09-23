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
    
    // Update center note with proper notation
    this.centerElement.className = `center-note center-${config.noteCount}`;
    this.centerElement.innerHTML = this.formatTongueNotation(0, config.noteCount);
    
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
      tongue.innerHTML = this.formatTongueNotation(i, config.noteCount);
      
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
      tongue.innerHTML = this.formatTongueNotation(i, config.noteCount);
      
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

  /**
   * Format tongue notation using proper 1-7 system with octave dots
   * Based on real tongue drum notation (like user's drum image)
   * - Numbers 1-7 represent scale degrees
   * - Dot below = low octave
   * - No dot = middle octave  
   * - Dot above = high octave
   */
  formatTongueNotation(tongueIndex, totalCount) {
    if (tongueIndex === 0) {
      // Center note gets a special symbol
      return '●';
    }

    // Map tongue indices to 1-7 scale degrees with octave indicators
    const scalePositions = this.mapToScalePositions(tongueIndex, totalCount);
    const { note, octave } = scalePositions;
    
    // Create notation with octave dot indicators
    let notation = note.toString();
    
    if (octave === 'low') {
      notation = `${note}<span class="octave-dot low-octave">●</span>`;
    } else if (octave === 'high') {  
      notation = `<span class="octave-dot high-octave">●</span>${note}`;
    }
    // middle octave has no dot (default)
    
    return notation;
  }

  /**
   * Map tongue index to scale position and octave
   * This creates a logical mapping from 0-15 system to 1-7 with octaves
   */
  mapToScalePositions(tongueIndex, totalCount) {
    // Create a repeating 1-7 pattern with octave progression
    const scaleNote = ((tongueIndex - 1) % 7) + 1;
    
    // Determine octave based on position in the sequence
    let octave = 'middle'; // default
    
    if (totalCount <= 7) {
      // Small drums: all middle octave
      octave = 'middle';
    } else if (totalCount <= 11) {
      // Medium drums: mix of middle and high
      octave = tongueIndex <= 7 ? 'middle' : 'high';
    } else {
      // Large drums (13-17 notes): full octave range
      const third = Math.floor(totalCount / 3);
      if (tongueIndex <= third) {
        octave = 'low';
      } else if (tongueIndex <= third * 2) {
        octave = 'middle';
      } else {
        octave = 'high';
      }
    }
    
    return { note: scaleNote, octave };
  }

  /**
   * Set photo background for calibration
   * @param {Object} drumPhoto - Photo object with url, width, height
   */
  setPhotoBackground(drumPhoto) {
    if (!drumPhoto || !drumPhoto.url) return;

    this.drumPhoto = drumPhoto;
    
    // Create photo overlay element
    this.createPhotoOverlay();
    
    // Enable calibration click handlers
    this.enableCalibrationMode();
  }

  /**
   * Create photo overlay element
   */
  createPhotoOverlay() {
    // Remove existing overlay
    this.removePhotoOverlay();
    
    this.photoOverlay = document.createElement('div');
    this.photoOverlay.className = 'drum-photo-overlay';
    this.photoOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: url(${this.drumPhoto.url});
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      opacity: 0.7;
      pointer-events: none;
      z-index: 5;
      border-radius: 50%;
    `;
    
    this.drumElement.appendChild(this.photoOverlay);
    
    // Make drum element clickable for calibration
    this.drumElement.style.position = 'relative';
    this.drumElement.style.cursor = 'crosshair';
  }

  /**
   * Set photo opacity
   * @param {number} opacity - Opacity value between 0 and 1
   */
  setPhotoOpacity(opacity) {
    if (this.photoOverlay) {
      this.photoOverlay.style.opacity = opacity;
    }
  }

  /**
   * Enable calibration mode with click handlers
   */
  enableCalibrationMode() {
    this.isCalibrating = true;
    this.calibrationPoints = [];
    this.currentCalibrationStep = 0;
    
    // Add click handler to drum element
    this.calibrationClickHandler = (event) => {
      if (!this.isCalibrating) return;
      
      event.preventDefault();
      event.stopPropagation();
      
      const rect = this.drumElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Convert to relative coordinates (0-1)
      const relativeX = x / rect.width;
      const relativeY = y / rect.height;
      
      this.addCalibrationPoint(relativeX, relativeY);
    };
    
    this.drumElement.addEventListener('click', this.calibrationClickHandler);
  }

  /**
   * Add calibration point and advance to next tongue
   * @param {number} x - Relative X coordinate (0-1)
   * @param {number} y - Relative Y coordinate (0-1)
   */
  addCalibrationPoint(x, y) {
    const config = this.configManager.getConfig();
    const tongueIndex = this.currentCalibrationStep;
    
    if (tongueIndex >= config.noteCount) return;
    
    // Store calibration point
    this.calibrationPoints[tongueIndex] = { x, y };
    
    // Create visual marker
    this.createCalibrationMarker(x, y, tongueIndex + 1);
    
    // Advance to next tongue
    this.currentCalibrationStep++;
    
    // Update progress in main app
    if (window.tongueApp && window.tongueApp.updateCalibrationProgress) {
      window.tongueApp.currentCalibrationStep = this.currentCalibrationStep;
      window.tongueApp.updateCalibrationProgress();
    }
    
    console.log(`📍 Calibration point ${tongueIndex + 1} set at (${x.toFixed(2)}, ${y.toFixed(2)})`);
  }

  /**
   * Create visual marker for calibration point
   * @param {number} x - Relative X coordinate
   * @param {number} y - Relative Y coordinate  
   * @param {number} tongueNumber - Tongue number (1-based)
   */
  createCalibrationMarker(x, y, tongueNumber) {
    const marker = document.createElement('div');
    marker.className = 'calibration-marker';
    marker.textContent = tongueNumber;
    marker.style.cssText = `
      position: absolute;
      left: ${x * 100}%;
      top: ${y * 100}%;
      transform: translate(-50%, -50%);
      width: 20px;
      height: 20px;
      background: #48bb78;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      z-index: 10;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    `;
    
    this.drumElement.appendChild(marker);
  }

  /**
   * Reset calibration process
   */
  resetCalibration() {
    // Remove all calibration markers
    const markers = this.drumElement.querySelectorAll('.calibration-marker');
    markers.forEach(marker => marker.remove());
    
    // Reset calibration state
    this.calibrationPoints = [];
    this.currentCalibrationStep = 0;
    
    console.log('🔄 Calibration reset');
  }

  /**
   * Apply photo calibration and create custom layout
   */
  applyPhotoCalibration() {
    if (!this.calibrationPoints || this.calibrationPoints.length === 0) return;
    
    const config = this.configManager.getConfig();
    const customLayout = {
      name: `Photo Layout - ${this.drumPhoto.name}`,
      noteCount: config.noteCount,
      positions: {}
    };
    
    // Convert calibration points to layout positions
    this.calibrationPoints.forEach((point, index) => {
      if (point) {
        customLayout.positions[index + 1] = {
          x: point.x * 100, // Convert to percentage
          y: point.y * 100
        };
      }
    });
    
    // Apply the custom layout
    this.setCustomLayout(customLayout);
    
    // Keep photo visible but reduce opacity for better visibility
    if (this.photoOverlay) {
      this.photoOverlay.style.opacity = '0.3';
    }
    
    // Disable calibration mode
    this.disableCalibrationMode();
    
    console.log('✅ Photo calibration applied successfully');
  }

  /**
   * Disable calibration mode
   */
  disableCalibrationMode() {
    this.isCalibrating = false;
    
    // Remove click handler
    if (this.calibrationClickHandler) {
      this.drumElement.removeEventListener('click', this.calibrationClickHandler);
      this.calibrationClickHandler = null;
    }
    
    // Reset cursor
    this.drumElement.style.cursor = 'default';
    
    // Remove calibration markers
    const markers = this.drumElement.querySelectorAll('.calibration-marker');
    markers.forEach(marker => marker.remove());
  }

  /**
   * Remove photo background and overlay
   */
  removePhotoBackground() {
    this.removePhotoOverlay();
    this.disableCalibrationMode();
    this.drumPhoto = null;
  }

  /**
   * Remove photo overlay element
   */
  removePhotoOverlay() {
    if (this.photoOverlay) {
      this.photoOverlay.remove();
      this.photoOverlay = null;
    }
  }
}
