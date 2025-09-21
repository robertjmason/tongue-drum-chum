import { AudioManager } from './audio/audioManager.js';
import { DrumVisualizer } from './components/DrumVisualizer.js';
import { NotationBuilder } from './components/NotationBuilder.js';
import { LayoutBuilder } from './components/LayoutBuilder.js';

/**
 * Main application class for the Tongue Drum Chum app
 * Now powered by EssentiaJS for professional-grade audio analysis
 */
class TongueDrumApp {
  constructor() {
    this.audioManager = null;
    this.drumVisualizer = null;
    this.notationBuilder = null;
    this.layoutBuilder = null;

    // Application state
    this.isListening = false;
    this.currentConfig = {
      noteCount: 15,
      key: 'D',
      scaleType: 'major',
      rootOctave: 4
    };
    this.detectionHistory = [];

    this.initializeElements();
    this.setupEventListeners();
    this.initializeComponents();
    this.updateUI();
  }

  /**
   * Initialize DOM elements
   */
  initializeElements() {
    // Setup panel and navigation - map to actual HTML IDs
    this.setupPanel = document.querySelector('.setup-panel');
    this.tabButtons = document.querySelectorAll('.tab');
    this.tabPanels = document.querySelectorAll('.tab-content');

    // Control buttons - map to actual HTML IDs
    this.startButton = document.getElementById('startButton');
    this.stopButton = null; // We'll create this dynamically or handle differently
    this.testMicButton = document.getElementById('testMicrophone');

    // Create sensitivity controls if they don't exist
    this.sensitivitySlider = this.createSensitivityControls();
    this.sensitivityValue = document.getElementById('sensitivityValue');

    // Status displays - map to actual HTML IDs
    this.detectionResults = document.getElementById('detectionResults');
    this.audioInfo = document.querySelector('.audio-metrics');
    this.statusMessage = document.getElementById('status');
    this.progressBar = document.getElementById('progressFill');

    // Configuration controls - map to actual HTML IDs
    this.drumSizeSelect = document.getElementById('noteCount');
    this.keySelect = document.getElementById('drumKey');
    this.scaleSelect = document.getElementById('scaleType');
    this.octaveSelect = document.getElementById('rootOctave');
    this.presetSelect = this.createPresetSelect();
    this.loadPresetButton = document.getElementById('applyManualConfig');

    // Builder toggles - map to actual HTML IDs
    this.notationToggle = document.getElementById('toggleBuilder');
    this.layoutToggle = document.getElementById('loadPhoto'); // We'll repurpose this

    // Auto-detection button
    this.autoDetectButton = document.getElementById('startDetection');

    // Validate required elements with more lenient approach
    const requiredElements = [
      this.setupPanel, this.startButton, this.testMicButton,
      this.audioInfo, this.statusMessage, this.drumSizeSelect, 
      this.keySelect, this.scaleSelect
    ];

    const missingElements = requiredElements.filter(el => !el);
    if (missingElements.length > 0) {
      console.warn('Some optional DOM elements not found, but continuing...');
    }
  }

  /**
   * Create sensitivity controls if they don't exist
   */
  createSensitivityControls() {
    // Check if sensitivity control already exists
    let sensitivitySlider = document.getElementById('sensitivitySlider');
    if (sensitivitySlider) return sensitivitySlider;

    // Create sensitivity controls and add to control panel
    const controlsDiv = document.querySelector('.controls');
    if (controlsDiv) {
      const sensitivityGroup = document.createElement('div');
      sensitivityGroup.className = 'config-group';
      sensitivityGroup.innerHTML = `
        <label for="sensitivitySlider">Detection Sensitivity</label>
        <div class="slider-container">
          <input type="range" id="sensitivitySlider" min="0.1" max="1.0" step="0.1" value="0.7">
          <span id="sensitivityValue">0.7</span>
        </div>
        <small>Higher = more sensitive</small>
      `;
      controlsDiv.appendChild(sensitivityGroup);
      return document.getElementById('sensitivitySlider');
    }
    return null;
  }

  /**
   * Create preset selector if it doesn't exist
   */
  createPresetSelect() {
    // Check if preset select already exists
    let presetSelect = document.getElementById('presetSelect');
    if (presetSelect) return presetSelect;

    // Create preset selector in manual config tab
    const manualTab = document.getElementById('manual-tab');
    if (manualTab) {
      const presetGroup = document.createElement('div');
      presetGroup.className = 'config-group';
      presetGroup.innerHTML = `
        <label for="presetSelect">Quick Presets</label>
        <select id="presetSelect">
          <option value="">-- Select a preset --</option>
          <option value="D Major 15-note">D Major 15-note</option>
          <option value="G Minor 13-note">G Minor 13-note</option>
          <option value="C Pentatonic 11-note">C Pentatonic 11-note</option>
        </select>
      `;
      manualTab.appendChild(presetGroup);
      return document.getElementById('presetSelect');
    }
    return null;
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Tab navigation - updated to work with actual HTML
    this.tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target;
        const tabId = target.dataset.tab;
        if (tabId) {
          this.switchTab(tabId);
        }
      });
    });

    // Audio controls - handle both detection methods
    if (this.startButton) {
      this.startButton.addEventListener('click', () => this.startListening());
    }
    if (this.autoDetectButton) {
      this.autoDetectButton.addEventListener('click', () => this.startListening());
    }
    if (this.testMicButton) {
      this.testMicButton.addEventListener('click', () => this.testMicrophone());
    }

    // Sensitivity control - only if it exists
    if (this.sensitivitySlider) {
      this.sensitivitySlider.addEventListener('input', () => this.updateSensitivity());
    }

    // Configuration controls
    if (this.drumSizeSelect) {
      this.drumSizeSelect.addEventListener('change', () => this.updateConfiguration());
    }
    if (this.keySelect) {
      this.keySelect.addEventListener('change', () => this.updateConfiguration());
    }
    if (this.scaleSelect) {
      this.scaleSelect.addEventListener('change', () => this.updateConfiguration());
    }
    if (this.octaveSelect) {
      this.octaveSelect.addEventListener('change', () => this.updateConfiguration());
    }
    if (this.loadPresetButton) {
      this.loadPresetButton.addEventListener('click', () => this.updateConfiguration());
    }
    if (this.presetSelect) {
      this.presetSelect.addEventListener('change', () => this.loadPreset());
    }

    // Builder toggles - updated for actual HTML
    if (this.notationToggle) {
      this.notationToggle.addEventListener('click', () => this.toggleNotationBuilder());
    }

    // Window resize handler
    window.addEventListener('resize', () => {
      if (this.drumVisualizer) {
        this.drumVisualizer.resize();
      }
    });
  }

  /**
   * Initialize main components
   */
  initializeComponents() {
    try {
      // Initialize drum visualizer - use the existing drum container
      const drumContainer = document.querySelector('.drum-container');
      if (drumContainer) {
        this.drumVisualizer = new DrumVisualizer(drumContainer);
        this.drumVisualizer.onTongueClicked((tongue) => this.handleTongueClick(tongue));
      } else {
        console.warn('Drum container not found, drum visualizer not initialized');
      }

      // Initialize notation builder - use the existing notation builder
      const notationContainer = document.getElementById('notationBuilder');
      if (notationContainer) {
        this.notationBuilder = new NotationBuilder(notationContainer, this.currentConfig);
        this.notationBuilder.onSequenceChanged((sequence) => this.handleSequenceChange(sequence));
        this.notationBuilder.onSequenceExported((sequence) => this.exportSequence(sequence));
        this.notationBuilder.onBuilderClosed(() => this.toggleNotationBuilder());
        this.notationBuilder.onTonguePlayback((tongue) => this.playTongue(tongue));
        this.notationBuilder.setVisible(false);
      } else {
        console.warn('Notation builder container not found');
      }

      // Initialize layout builder - create container if needed or skip for now
      const layoutContainer = document.getElementById('layoutBuilder');
      if (layoutContainer) {
        this.layoutBuilder = new LayoutBuilder(layoutContainer, this.currentConfig);
        this.layoutBuilder.onLayoutSave((layout) => this.saveCustomLayout(layout));
        this.layoutBuilder.onBuilderClosed(() => this.toggleLayoutBuilder());
        this.layoutBuilder.setVisible(false);
      } else {
        console.warn('Layout builder container not found - using layout tab instead');
        // Use the existing layout tab functionality
        this.setupLayoutTabFunctionality();
      }

      console.log('🎵 Components initialized successfully!');

    } catch (error) {
      console.error('Failed to initialize components:', error);
      this.showStatus('Application partially loaded - some features may be limited', 'warning');
    }
  }

  /**
   * Set up layout tab functionality as fallback
   */
  setupLayoutTabFunctionality() {
    const layoutCanvas = document.getElementById('layoutCanvas');
    if (layoutCanvas && this.drumVisualizer) {
      // Add basic drag functionality to the existing layout tab
      console.log('Setting up basic layout functionality in layout tab');
    }
  }

  /**
   * Switch between tabs
   */
  switchTab(tabId) {
    // Update tab buttons
    this.tabButtons.forEach(button => {
      button.classList.toggle('active', button.dataset.tab === tabId);
    });

    // Update tab panels
    this.tabPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `${tabId}Tab`);
    });
  }

  /**
   * Start audio listening with EssentiaJS
   */
  async startListening() {
    if (this.isListening || this.audioManager) return;

    try {
      this.showStatus('Initializing EssentiaJS audio analysis engine...', 'info');
      this.setProgress(10);

      // Initialize enhanced audio manager with EssentiaJS
      this.audioManager = new AudioManager({
        fftSize: 4096,
        sensitivity: parseFloat(this.sensitivitySlider.value) || 0.7,
        cooldownTime: 150
      });
      
      this.setProgress(30);
      
      // Set up note detection callback
      this.audioManager.onNoteDetected((detection) => this.handleNoteDetection(detection));
      this.audioManager.onError((error) => this.showStatus(error, 'error'));
      
      this.setProgress(50);
      
      // Update with current tongue frequencies
      if (this.drumVisualizer) {
        const frequencies = this.drumVisualizer.getTongueFrequencies();
        this.audioManager.updateTongueFrequencies(frequencies);
      }
      
      this.setProgress(70);
      
      // Start listening
      await this.audioManager.startListening();
      
      this.setProgress(100);
      
      this.isListening = true;
      this.updateUI();
      this.showStatus('EssentiaJS audio analysis active - listening for tongue drum notes...', 'success');
      
      // Update audio info
      this.updateAudioInfo();
      
      setTimeout(() => this.setProgress(0), 1000);

    } catch (error) {
      console.error('Failed to start listening:', error);
      this.showStatus(`Failed to start listening: ${error.message}`, 'error');
      this.setProgress(0);
      this.audioManager = null;
    }
  }

  /**
   * Stop audio listening
   */
  stopListening() {
    if (!this.isListening || !this.audioManager) return;

    this.audioManager.stopListening();
    this.audioManager = null;
    this.isListening = false;
    this.updateUI();
    this.showStatus('Audio analysis stopped', 'info');
    this.clearDetectionResults();
  }

  /**
   * Test microphone access
   */
  async testMicrophone() {
    try {
      this.showStatus('Testing microphone access...', 'info');
      
      const tempAudioManager = new AudioManager();
      const isWorking = await tempAudioManager.testMicrophone();
      
      if (isWorking) {
        this.showStatus('Microphone test successful! EssentiaJS ready.', 'success');
      } else {
        this.showStatus('Microphone test failed', 'error');
      }
      
      tempAudioManager.stopListening();
    } catch (error) {
      console.error('Microphone test failed:', error);
      this.showStatus(`Microphone test failed: ${error.message}`, 'error');
    }
  }

  /**
   * Update sensitivity setting
   */
  updateSensitivity() {
    const sensitivity = parseFloat(this.sensitivitySlider.value);
    this.sensitivityValue.textContent = sensitivity.toFixed(1);
    
    if (this.audioManager) {
      this.audioManager.setSensitivity(sensitivity);
    }
  }

  /**
   * Update drum configuration
   */
  updateConfiguration() {
    const newConfig = {
      noteCount: parseInt(this.drumSizeSelect.value),
      key: this.keySelect.value,
      scaleType: this.scaleSelect.value,
      rootOctave: parseInt(this.octaveSelect.value)
    };

    this.currentConfig = newConfig;

    // Update components
    if (this.drumVisualizer) {
      this.drumVisualizer.updateConfiguration(newConfig);
    }
    if (this.notationBuilder) {
      this.notationBuilder.updateConfiguration(newConfig);
    }
    if (this.layoutBuilder) {
      this.layoutBuilder.updateConfiguration(newConfig);
    }

    // Update audio manager with new frequencies
    if (this.audioManager && this.drumVisualizer) {
      const frequencies = this.drumVisualizer.getTongueFrequencies();
      this.audioManager.updateTongueFrequencies(frequencies);
    }

    this.updateAudioInfo();
  }

  /**
   * Load preset configuration
   */
  loadPreset() {
    const presetName = this.presetSelect.value;
    if (!presetName) return;

    if (this.drumVisualizer) {
      const success = this.drumVisualizer.loadPreset(presetName);
      if (success) {
        this.showStatus(`Loaded preset: ${presetName}`, 'success');
        this.updateAudioInfo();
      } else {
        this.showStatus(`Failed to load preset: ${presetName}`, 'error');
      }
    }
  }

  /**
   * Handle note detection from EssentiaJS audio manager
   */
  handleNoteDetection(detection) {
    // Add to history
    this.detectionHistory.unshift(detection);
    if (this.detectionHistory.length > 10) {
      this.detectionHistory = this.detectionHistory.slice(0, 10);
    }

    // Enhanced visual feedback with confidence
    if (this.drumVisualizer) {
      this.drumVisualizer.showDetectionFeedback(detection);
    }

    // Update detection results display
    this.updateDetectionResults();

    // Log detection for debugging
    console.log(`EssentiaJS detected: Tongue ${detection.tongue}, ${detection.frequency.toFixed(1)}Hz, confidence: ${(detection.confidence * 100).toFixed(1)}%`);
  }

  /**
   * Handle tongue click from visualizer
   */
  handleTongueClick(tongue) {
    this.playTongue(tongue);
    
    // Simulate detection for feedback
    if (this.drumVisualizer) {
      this.drumVisualizer.simulateNoteDetection(tongue);
    }
  }

  /**
   * Play a tongue with audio synthesis
   */
  playTongue(tongue) {
    // Enhanced audio synthesis using Web Audio API
    if (this.drumVisualizer) {
      const frequency = this.drumVisualizer.getTongueFrequencies()[tongue];
      if (frequency) {
        this.synthesizeTongueNote(frequency, 0.5); // 500ms duration
      }
      
      this.drumVisualizer.highlightTongue(tongue, 300);
    }
  }

  /**
   * Synthesize a tongue drum note using Web Audio API
   */
  synthesizeTongueNote(frequency, duration) {
    if (!window.AudioContext && !window.webkitAudioContext) {
      console.warn('Web Audio API not supported');
      return;
    }

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create oscillator for the fundamental frequency
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Use a combination of sine waves to simulate tongue drum timbre
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      
      // Create envelope (attack-decay-sustain-release)
      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01); // Attack
      gainNode.gain.exponentialRampToValueAtTime(0.1, now + 0.1); // Decay
      gainNode.gain.exponentialRampToValueAtTime(0.05, now + duration * 0.7); // Sustain
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // Release
      
      // Connect audio graph
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Start and stop
      oscillator.start(now);
      oscillator.stop(now + duration);
      
    } catch (error) {
      console.warn('Failed to synthesize note:', error);
    }
  }

  /**
   * Handle sequence changes from notation builder
   */
  handleSequenceChange(sequence) {
    console.log('Sequence updated:', sequence);
  }

  /**
   * Export sequence data with enhanced metadata
   */
  exportSequence(sequence) {
    const notation = this.notationBuilder?.sequenceToNotation() || [];
    const data = {
      drumConfig: this.currentConfig,
      sequence: sequence,
      notation: notation,
      tongueFrequencies: this.drumVisualizer?.getTongueFrequencies() || {},
      timestamp: new Date().toISOString(),
      version: '2.0-EssentiaJS'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `tongue-drum-sequence-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    this.showStatus('Sequence exported successfully!', 'success');
  }

  /**
   * Save custom layout
   */
  saveCustomLayout(layout) {
    // Save to drum visualizer's config manager
    if (this.drumVisualizer && this.drumVisualizer.configManager) {
      this.drumVisualizer.configManager.saveCustomLayout(layout);
    }
    
    // Add to preset selector if not already there
    let optionExists = false;
    for (const option of this.presetSelect.options) {
      if (option.value === layout.name) {
        optionExists = true;
        break;
      }
    }
    
    if (!optionExists) {
      const option = document.createElement('option');
      option.value = layout.name;
      option.textContent = layout.name;
      this.presetSelect.appendChild(option);
    }
    
    this.showStatus(`Layout "${layout.name}" saved!`, 'success');
  }

  /**
   * Toggle notation builder visibility
   */
  toggleNotationBuilder() {
    if (!this.notationBuilder) return;
    
    const container = document.getElementById('notationBuilder');
    const isVisible = container.style.display !== 'none';
    
    this.notationBuilder.setVisible(!isVisible);
    this.notationToggle.textContent = isVisible ? '🎵 Show Notation Builder' : '🎵 Hide Notation Builder';
  }

  /**
   * Toggle layout builder visibility
   */
  toggleLayoutBuilder() {
    if (!this.layoutBuilder) return;
    
    const container = document.getElementById('layoutBuilder');
    const isVisible = container.style.display !== 'none';
    
    this.layoutBuilder.setVisible(!isVisible);
    this.layoutToggle.textContent = isVisible ? '🎯 Show Layout Builder' : '🎯 Hide Layout Builder';
  }

  /**
   * Update UI state
   */
  updateUI() {
    // Update button states - handle missing elements
    if (this.startButton) {
      this.startButton.style.display = this.isListening ? 'none' : 'inline-block';
      this.startButton.textContent = this.isListening ? 'Stop Detection' : 'Start Detection';
    }
    
    if (this.autoDetectButton) {
      this.autoDetectButton.textContent = this.isListening ? 'Stop Detection' : 'Start Detection';
    }
    
    // Handle stop button if it exists (but it doesn't in our HTML)
    if (this.stopButton) {
      this.stopButton.style.display = this.isListening ? 'inline-block' : 'none';
    }
    
    // Update configuration controls - with null checks
    if (this.drumSizeSelect) this.drumSizeSelect.disabled = this.isListening;
    if (this.keySelect) this.keySelect.disabled = this.isListening;
    if (this.scaleSelect) this.scaleSelect.disabled = this.isListening;
    if (this.octaveSelect) this.octaveSelect.disabled = this.isListening;
  }

  /**
   * Update audio information display
   */
  updateAudioInfo() {
    if (this.drumVisualizer) {
      const drumInfo = this.drumVisualizer.getDrumInfo();
      const contextState = this.audioManager ? this.audioManager.getAudioContextState() : 'closed';
      const sampleRate = this.audioManager ? this.audioManager.getSampleRate() : 'N/A';
      
      this.audioInfo.innerHTML = `
        <div class="audio-stat">
          <span class="stat-label">Configuration:</span>
          <span class="stat-value">${drumInfo}</span>
        </div>
        <div class="audio-stat">
          <span class="stat-label">Status:</span>
          <span class="stat-value">${this.isListening ? 'EssentiaJS Active' : 'Stopped'}</span>
        </div>
        <div class="audio-stat">
          <span class="stat-label">Sample Rate:</span>
          <span class="stat-value">${sampleRate} Hz</span>
        </div>
        <div class="audio-stat">
          <span class="stat-label">Audio Context:</span>
          <span class="stat-value">${contextState}</span>
        </div>
      `;
    }
  }

  /**
   * Update detection results display with enhanced information
   */
  updateDetectionResults() {
    if (this.detectionHistory.length === 0) {
      this.detectionResults.innerHTML = '<div class="no-results">No notes detected yet... (EssentiaJS ready)</div>';
      return;
    }

    const resultsHTML = this.detectionHistory.map(detection => `
      <div class="detection-result">
        <span class="tongue-number">Tongue ${detection.tongue}</span>
        <span class="confidence ${detection.confidence > 0.8 ? 'high-confidence' : detection.confidence > 0.5 ? 'medium-confidence' : 'low-confidence'}">
          ${(detection.confidence * 100).toFixed(1)}%
        </span>
        <span class="frequency">${detection.frequency.toFixed(1)} Hz</span>
        ${detection.targetFrequency ? `<span class="target-freq">(target: ${detection.targetFrequency.toFixed(1)}Hz)</span>` : ''}
      </div>
    `).join('');

    this.detectionResults.innerHTML = resultsHTML;
  }

  /**
   * Clear detection results
   */
  clearDetectionResults() {
    this.detectionHistory = [];
    this.updateDetectionResults();
  }

  /**
   * Show status message
   */
  showStatus(message, type = 'info') {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    
    // Auto-hide after 5 seconds for non-error messages
    if (type !== 'error') {
      setTimeout(() => {
        this.statusMessage.textContent = '';
        this.statusMessage.className = 'status-message';
      }, 5000);
    }
  }

  /**
   * Set progress bar value
   */
  setProgress(percent) {
    this.progressBar.style.width = `${percent}%`;
    this.progressBar.style.display = percent > 0 ? 'block' : 'none';
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    new TongueDrumApp();
    console.log('🎵 Tongue Drum Chum app initialized successfully with EssentiaJS! 🎵');
  } catch (error) {
    console.error('Failed to initialize Tongue Drum Chum app:', error);
    
    // Show error message to user
    const statusElement = document.getElementById('statusMessage');
    if (statusElement) {
      statusElement.textContent = `Failed to initialize app: ${error.message}`;
      statusElement.className = 'status-message error';
    }
  }
});
