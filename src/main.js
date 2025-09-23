import { AudioManager } from './audio/audioManager.js';
import { DrumVisualizer } from './components/DrumVisualizer.js';
import { NotationBuilder } from './components/NotationBuilder.js';
import { LayoutBuilder } from './components/LayoutBuilder.js';
import { OpenCVTongueDetector } from './utils/openCVTongueDetector.js';

/**
 * Main application class for the Tongue Drum Chum app
 * Now powered by EssentiaJS for professional-grade audio analysis
 */
class TongueDrumApp {
  constructor() {
    console.log('🔧 TongueDrumApp constructor started...');
    
    this.audioManager = null;
    this.drumVisualizer = null;
    this.notationBuilder = null;
    this.layoutBuilder = null;
    this.tongueDetector = null;

    // Application state
    this.isListening = false;
    this.currentConfig = {
      noteCount: 15,
      key: 'D',
      scaleType: 'major',
      rootOctave: 4
    };
    this.detectionHistory = [];

    console.log('🔧 Initializing DOM elements...');
    this.initializeElements();
    
    console.log('🔧 Setting up event listeners...');
    this.setupEventListeners();
    
    console.log('🔧 Initializing components...');
    this.initializeComponents();
    
    console.log('🔧 Updating UI...');
    this.updateUI();
    
    console.log('✅ TongueDrumApp constructor completed successfully!');
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
    console.log('🔧 Setting up tab navigation...');
    // Tab navigation - updated to work with actual HTML
    this.tabButtons.forEach((button, index) => {
      console.log(`🔧 Adding tab listener ${index + 1}/${this.tabButtons.length}:`, button);
      button.addEventListener('click', (e) => {
        console.log('🔧 Tab clicked:', e.target.dataset.tab);
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

    // File upload functionality
    console.log('🔧 Setting up file upload...');
    const fileInput = document.getElementById('fileInput');
    console.log('🔧 File input element:', fileInput);
    if (fileInput) {
      console.log('🔧 Adding file upload event listener...');
      fileInput.addEventListener('change', (e) => {
        console.log('🔧 File upload triggered:', e.target.files);
        this.handleFileUpload(e);
      });
      console.log('✅ File upload listener attached successfully');
    } else {
      console.warn('❌ File input element not found!');
    }

    // Common Presets tab functionality
    const presetOptions = document.querySelectorAll('.layout-option');
    presetOptions.forEach(option => {
      option.addEventListener('click', () => {
        const presetName = option.dataset.preset;
        if (presetName) {
          this.loadPresetConfiguration(presetName);
        }
      });
    });

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

  // Duplicate switchTab function removed - using the improved version at line 1983

  /**
   * Handle file upload for importing configurations, layouts, or drum photos
   */
  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      // Check if it's an image file
      if (file.type.startsWith('image/')) {
        await this.handleDrumPhotoUpload(file);
        return;
      }

      // Handle JSON files (configurations and layouts)
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Determine file type and process accordingly
      if (data.type === 'drum-layout' && data.layout) {
        // Import custom drum layout
        this.importCustomLayout(data.layout);
        this.showStatus(`Layout "${data.name || 'Custom'}" imported successfully!`, 'success');
      } else if (data.type === 'drum-config' && data.config) {
        // Import drum configuration
        this.importDrumConfiguration(data.config);
        this.showStatus(`Configuration "${data.name || 'Custom'}" imported successfully!`, 'success');
      } else if (data.noteCount && data.scale) {
        // Legacy format - treat as drum configuration
        this.importDrumConfiguration(data);
        this.showStatus(`Configuration imported successfully!`, 'success');
      } else {
        throw new Error('Invalid file format. Expected drum layout, configuration, or image file.');
      }
      
      // Clear the file input
      event.target.value = '';
      
    } catch (error) {
      console.error('File upload error:', error);
      this.showStatus(`Import failed: ${error.message}`, 'error');
      event.target.value = '';
    }
  }

  /**
   * Handle drum photo upload for tongue placement analysis
   */
  async handleDrumPhotoUpload(file) {
    try {
      // Validate image file
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Please upload a JPEG, PNG, or WebP image file.');
      }

      // Check file size (limit to 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('Image file too large. Please use an image under 10MB.');
      }

      // Create image URL
      const imageUrl = URL.createObjectURL(file);
      
      // Load and validate the image
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Invalid image file.'));
        img.src = imageUrl;
      });

      // Store the drum photo
      this.drumPhoto = {
        file: file,
        url: imageUrl,
        width: img.width,
        height: img.height,
        name: file.name
      };

      // Store image for detection
      this.analysisImage = img;
      
      // Set up interactive tongue detection system
      this.setupInteractiveTongueDetection();
      
      // Switch to layout tab for detection controls
      this.switchTab('layout');
      
    } catch (error) {
      console.error('Photo upload error:', error);
      this.showStatus(`Photo upload failed: ${error.message}`, 'error');
    }
  }

  /**
   * Set up interactive tongue detection system - IMPROVED VERSION
   */
  setupInteractiveTongueDetection() {
    console.log('🔧 Setting up interactive tongue detection...');
    console.log('🔧 Drum photo data:', this.drumPhoto);
    
    // First, ensure we're on the correct tab
    console.log('🔄 Switching to layout tab...');
    this.switchTab('layout');
    
    // Wait a moment for tab to fully switch
    setTimeout(() => {
      // Show the photo detection controls
      const photoDetectionControls = document.getElementById('photoDetectionControls');
      console.log('🔧 Photo detection controls element:', photoDetectionControls);
      if (photoDetectionControls) {
        photoDetectionControls.style.display = 'block';
        console.log('✅ Photo detection controls are now visible');
      } else {
        console.error('❌ Could not find photoDetectionControls element');
      }
      
      // Set the drum photo as background in the layout canvas
      const layoutBackground = document.getElementById('layoutBackground');
      console.log('🔧 Layout background element:', layoutBackground);
      console.log('🔧 Element dimensions:', layoutBackground ? {
        width: layoutBackground.offsetWidth,
        height: layoutBackground.offsetHeight,
        display: window.getComputedStyle(layoutBackground).display,
        visibility: window.getComputedStyle(layoutBackground).visibility
      } : 'ELEMENT NOT FOUND');
      
      if (layoutBackground && this.drumPhoto) {
        // Set background image with proper alignment - contain ensures entire drum fits within circle
        layoutBackground.style.backgroundImage = `url(${this.drumPhoto.url})`;
        layoutBackground.style.backgroundSize = 'contain';
        layoutBackground.style.backgroundRepeat = 'no-repeat';
        layoutBackground.style.backgroundPosition = 'center center';
        layoutBackground.style.height = '600px';
        layoutBackground.style.width = '600px';
        layoutBackground.style.border = '3px solid #4299e1';
        layoutBackground.style.borderRadius = '50%';
        layoutBackground.style.margin = '20px auto';
        layoutBackground.style.display = 'block';
        layoutBackground.style.backgroundColor = '#f8f9fa';
        
        console.log('✅ Drum photo set as background:', this.drumPhoto.url);
        console.log('✅ Background styles applied with proper centering');
        
        // Hide the default instructions
        const instructions = layoutBackground.querySelector('.canvas-instructions');
        if (instructions) {
          instructions.style.display = 'none';
          console.log('✅ Canvas instructions hidden');
        }
        
        // Add clean visual confirmation above the drum
        const existingConfirmation = layoutBackground.parentNode.querySelector('.drum-confirmation');
        if (existingConfirmation) {
          existingConfirmation.remove();
        }
        
        const confirmationDiv = document.createElement('div');
        confirmationDiv.className = 'drum-confirmation';
        confirmationDiv.innerHTML = `
          <div style="background: rgba(34, 197, 94, 0.9); color: white; padding: 12px 20px; border-radius: 8px; margin: 10px auto 20px; text-align: center; max-width: 500px; font-weight: 500; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            ✅ Drum image loaded successfully! Click "Detect Tongues" to map your drum layout.
          </div>
        `;
        layoutBackground.parentNode.insertBefore(confirmationDiv, layoutBackground);
        
      } else {
        console.error('❌ Could not set background - layoutBackground:', !!layoutBackground, 'drumPhoto:', !!this.drumPhoto);
        
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
          <div style="background: rgba(220, 38, 38, 0.9); color: white; padding: 10px; border-radius: 5px; margin: 10px; text-align: center;">
            ❌ Failed to display drum image. Please try uploading again.
          </div>
        `;
        const layoutTab = document.getElementById('layout-tab');
        if (layoutTab) {
          layoutTab.insertBefore(errorDiv, layoutTab.firstChild);
        }
      }
      
      // Initialize detection state
      this.detectedTongues = [];
      this.selectedTongues = [];
      this.detectionOverlays = [];
      
      // Set up event handlers for detection controls
      this.setupDetectionEventHandlers();
      
      console.log('✅ Interactive tongue detection system ready');
      
    }, 500); // Give tab time to switch
  }

  /**
   * Set up event handlers for detection controls
   */
  setupDetectionEventHandlers() {
    const detectButton = document.getElementById('detectTongues');
    const clearButton = document.getElementById('clearSelection');
    
    if (detectButton) {
      detectButton.addEventListener('click', () => this.runInteractiveTongueDetection());
    }
    
    if (clearButton) {
      clearButton.addEventListener('click', () => this.clearTongueSelection());
    }
  }

  /**
   * Run tongue detection with user-specified count
   */
  async runInteractiveTongueDetection() {
    if (!this.analysisImage || !this.drumPhoto) {
      console.error('No image available for detection');
      return;
    }
    
    const expectedCount = parseInt(document.getElementById('expectedTongueCount').value);
    
    try {
      console.log(`🔍 Starting tongue detection for ${expectedCount} tongues...`);
      
      // Run detection with user-specified count
      const detectedTongues = await this.detectDrumTongues(this.analysisImage, this.drumPhoto.url, expectedCount);
      
      if (detectedTongues && detectedTongues.length > 0) {
        console.log(`🎯 Detected ${detectedTongues.length} potential tongues`);
        this.detectedTongues = detectedTongues;
        
        // Create interactive overlays
        this.createInteractiveTongueOverlays(detectedTongues);
        
        // Show clear button
        const clearButton = document.getElementById('clearSelection');
        if (clearButton) {
          clearButton.style.display = 'inline-block';
        }
        
        console.log('✅ Interactive tongue detection completed');
      } else {
        console.log('⚠️ No tongues detected');
        alert('No tongues detected. Try adjusting the expected count or upload a clearer image.');
      }
    } catch (error) {
      console.error('❌ Detection error:', error);
      alert(`Detection failed: ${error.message}`);
    }
  }

  /**
   * Create interactive overlays for detected tongues
   */
  createInteractiveTongueOverlays(tongues) {
    // Clear existing overlays
    this.clearDetectionOverlays();
    
    const layoutBackground = document.getElementById('layoutBackground');
    if (!layoutBackground) return;
    
    const backgroundRect = layoutBackground.getBoundingClientRect();
    const layoutCanvasRect = layoutBackground.parentElement.getBoundingClientRect();
    
    tongues.forEach((tongue, index) => {
      const overlay = document.createElement('div');
      overlay.className = 'detected-tongue newly-detected';
      overlay.dataset.tongueIndex = index;
      
      // Calculate position relative to the background container
      const x = (tongue.boundingRect.x / this.drumPhoto.width) * backgroundRect.width;
      const y = (tongue.boundingRect.y / this.drumPhoto.height) * backgroundRect.height;
      const width = (tongue.boundingRect.width / this.drumPhoto.width) * backgroundRect.width;
      const height = (tongue.boundingRect.height / this.drumPhoto.height) * backgroundRect.height;
      
      overlay.style.left = `${x - width/2}px`;
      overlay.style.top = `${y - height/2}px`;
      overlay.style.width = `${Math.max(width, 30)}px`;
      overlay.style.height = `${Math.max(height, 30)}px`;
      
      // Add selection number element
      const numberElement = document.createElement('div');
      numberElement.className = 'tongue-number';
      overlay.appendChild(numberElement);
      
      // Add click handler
      overlay.addEventListener('click', (e) => this.handleTongueSelection(e, index));
      
      layoutBackground.appendChild(overlay);
      this.detectionOverlays.push(overlay);
    });
    
    console.log(`Created ${tongues.length} interactive tongue overlays`);
  }

  /**
   * Handle tongue selection for ordering
   */
  handleTongueSelection(event, tongueIndex) {
    event.stopPropagation();
    
    const overlay = event.currentTarget;
    const isSelected = overlay.classList.contains('selected');
    
    if (isSelected) {
      // Deselect tongue
      this.deselectTongue(tongueIndex);
    } else {
      // Select tongue
      this.selectTongue(tongueIndex);
    }
    
    this.updateSelectionUI();
  }

  /**
   * Select a tongue and assign it the next number
   */
  selectTongue(tongueIndex) {
    if (this.selectedTongues.includes(tongueIndex)) return;
    
    this.selectedTongues.push(tongueIndex);
    
    const overlay = this.detectionOverlays[tongueIndex];
    if (overlay) {
      overlay.classList.add('selected');
      
      const numberElement = overlay.querySelector('.tongue-number');
      if (numberElement) {
        numberElement.textContent = this.selectedTongues.length;
      }
    }
  }

  /**
   * Deselect a tongue and reorder the remaining selections
   */
  deselectTongue(tongueIndex) {
    const selectedIndex = this.selectedTongues.indexOf(tongueIndex);
    if (selectedIndex === -1) return;
    
    this.selectedTongues.splice(selectedIndex, 1);
    
    const overlay = this.detectionOverlays[tongueIndex];
    if (overlay) {
      overlay.classList.remove('selected');
      
      const numberElement = overlay.querySelector('.tongue-number');
      if (numberElement) {
        numberElement.textContent = '';
      }
    }
    
    // Renumber remaining selections
    this.selectedTongues.forEach((selectedTongueIndex, newOrder) => {
      const selectedOverlay = this.detectionOverlays[selectedTongueIndex];
      if (selectedOverlay) {
        const numberElement = selectedOverlay.querySelector('.tongue-number');
        if (numberElement) {
          numberElement.textContent = newOrder + 1;
        }
      }
    });
  }

  /**
   * Clear all tongue selections
   */
  clearTongueSelection() {
    this.selectedTongues = [];
    
    this.detectionOverlays.forEach(overlay => {
      overlay.classList.remove('selected');
      const numberElement = overlay.querySelector('.tongue-number');
      if (numberElement) {
        numberElement.textContent = '';
      }
    });
    
    this.updateSelectionUI();
    console.log('Cleared all tongue selections');
  }

  /**
   * Clear all detection overlays
   */
  clearDetectionOverlays() {
    this.detectionOverlays.forEach(overlay => {
      if (overlay.parentElement) {
        overlay.parentElement.removeChild(overlay);
      }
    });
    this.detectionOverlays = [];
    this.selectedTongues = [];
  }

  /**
   * Update selection UI feedback
   */
  updateSelectionUI() {
    // Update status or add selection feedback here if needed
    console.log(`Selected tongues: ${this.selectedTongues.length}/${this.detectedTongues.length}`);
  }

  /**
   * Advanced automatic tongue detection using OpenCV.js
   * Replaces manual computer vision with professional-grade algorithms
   */
  async detectDrumTongues(img, imageUrl, expectedCount = 15) {
    console.log(`🔬 Analyzing drum photo with OpenCV.js for ${expectedCount} tongues...`);
    
    if (!this.tongueDetector) {
      console.error('❌ OpenCV tongue detector not initialized');
      return [];
    }
    
    // Create canvas for image analysis
    const analysisCanvas = document.createElement('canvas');
    const ctx = analysisCanvas.getContext('2d');
    
    // Set canvas size to match image
    analysisCanvas.width = img.width;
    analysisCanvas.height = img.height;
    
    // Draw image to canvas for pixel analysis
    ctx.drawImage(img, 0, 0);
    
    // Get image data for OpenCV processing
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    console.log('📊 Image data extracted:', img.width, 'x', img.height, 'pixels');
    
    try {
      // Use OpenCV.js for advanced tongue detection
      const openCVResults = await this.tongueDetector.detectTongueWithOpenCV(
        imageData, 
        img.width, 
        img.height
      );
      
      // Convert OpenCV results to the format expected by the rest of the application
      const tongueShapes = this.convertOpenCVResultsToTongueShapes(
        openCVResults, 
        expectedCount
      );
      
      console.log(`🎯 OpenCV.js pipeline complete: ${tongueShapes.length} tongues detected for expected ${expectedCount}`);
      console.log(`🔍 Detection confidence scores:`, tongueShapes.map(t => t.confidence?.toFixed(3)));
      
      return tongueShapes;
      
    } catch (error) {
      console.error('🚨 OpenCV tongue detection failed:', error);
      console.log('🔄 Falling back to basic detection...');
      
      // Fallback to a simple center-based detection if OpenCV fails
      return this.createFallbackTongueDetection(img.width, img.height, expectedCount);
    }
  }

  /**
   * Convert OpenCV.js detection results to application format
   */
  convertOpenCVResultsToTongueShapes(openCVResults, expectedCount) {
    // Sort by confidence and take the best results
    const sortedResults = openCVResults
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, Math.min(expectedCount + 5, openCVResults.length)); // Allow some extra for filtering
    
    // If we have more results than expected, filter by confidence threshold
    if (sortedResults.length > expectedCount) {
      const confidenceThreshold = 0.5; // Filter out low-confidence results
      const filteredShapes = sortedResults.filter(shape => shape.confidence >= confidenceThreshold);
      
      // Take the best results up to expected count
      return filteredShapes.slice(0, expectedCount);
    }
    
    return sortedResults;
  }

  /**
   * Fallback tongue detection when OpenCV.js fails
   */
  createFallbackTongueDetection(width, height, expectedCount) {
    console.log('🔄 Creating fallback tongue detection pattern');
    
    const tongueShapes = [];
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.3; // Drum tongues usually arranged in a circle
    
    // Create a circular pattern of tongue positions
    for (let i = 0; i < expectedCount; i++) {
      const angle = (i / expectedCount) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      tongueShapes.push({
        x: x,
        y: y,
        width: 40,  // Default tongue size
        height: 60,
        area: 2400,
        confidence: 0.1,  // Low confidence for fallback
        aspectRatio: 1.5,
        solidity: 0.8,
        isFallback: true
      });
    }
    
    return tongueShapes;
  }

  /**
   * Convert image data to grayscale for edge detection
   * @deprecated - Replaced by OpenCV.js implementation
   */
  convertToGrayscale(imageData) {
    const data = imageData.data;
    const grayData = new Uint8ClampedArray(data.length / 4);
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Standard luminance formula
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      grayData[i / 4] = gray;
    }
    
    console.log('⚫ Converted to grayscale:', grayData.length, 'pixels');
    return grayData;
  }

  /**
   * Apply Gaussian blur to reduce image noise
   */
  applyGaussianBlur(grayData, width, height) {
    // 3x3 Gaussian kernel for noise reduction
    const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
    const kernelSum = 16;
    
    const blurred = new Uint8ClampedArray(grayData.length);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixel = grayData[(y + ky) * width + (x + kx)];
            const weight = kernel[(ky + 1) * 3 + (kx + 1)];
            sum += pixel * weight;
          }
        }
        
        blurred[y * width + x] = sum / kernelSum;
      }
    }
    
    console.log('🌫️ Applied Gaussian blur for noise reduction');
    return blurred;
  }

  /**
   * Apply Sobel edge detection to find tongue boundaries
   */
  applySobelEdgeDetection(grayData, width, height) {
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    const edges = new Uint8ClampedArray(grayData.length);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixel = grayData[(y + ky) * width + (x + kx)];
            const kernelIndex = (ky + 1) * 3 + (kx + 1);
            
            gx += pixel * sobelX[kernelIndex];
            gy += pixel * sobelY[kernelIndex];
          }
        }
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edges[y * width + x] = Math.min(255, magnitude);
      }
    }
    
    console.log('🔍 Applied Sobel edge detection');
    return edges;
  }

  /**
   * Find contours in the edge-detected image
   */
  findContours(edgeData, width, height) {
    const threshold = 30; // LOWERED: More sensitive edge detection
    const contours = [];
    const visited = new Array(width * height).fill(false);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        
        if (edgeData[index] > threshold && !visited[index]) {
          const contour = this.traceContour(edgeData, width, height, x, y, threshold, visited);
          if (contour.length > 10) { // REDUCED: Smaller minimum contour size
            contours.push(contour);
          }
        }
      }
    }
    
    console.log(`📏 Found ${contours.length} contours (threshold: ${threshold})`);
    return contours;
  }

  /**
   * Trace contour from starting point using flood-fill algorithm
   */
  traceContour(edgeData, width, height, startX, startY, threshold, visited) {
    const contour = [];
    const stack = [{x: startX, y: startY}];
    
    while (stack.length > 0) {
      const {x, y} = stack.pop();
      const index = y * width + x;
      
      if (x < 0 || x >= width || y < 0 || y >= height || 
          visited[index] || edgeData[index] <= threshold) {
        continue;
      }
      
      visited[index] = true;
      contour.push({x, y});
      
      // Add 8-connected neighbors
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          stack.push({x: x + dx, y: y + dy});
        }
      }
    }
    
    return contour;
  }

  /**
   * Filter contours to identify tongue-like shapes with detailed debugging
   */
  filterTongueShapes(contours, imageWidth, imageHeight, expectedCount = 15) {
    console.log(`🔍 DETAILED FILTERING: Analyzing ${contours.length} contours for ${expectedCount} expected tongues...`);
    
    const tongueShapes = [];
    let rejectedCount = 0;
    const rejectionReasons = {};
    
    // ULTRA-RELAXED filtering criteria to catch smaller tongues
    const minArea = (imageWidth * imageHeight) * 0.00014; // ULTRA-REDUCED: ~500 pixels for 1887x1932
    const maxArea = (imageWidth * imageHeight) * 0.25;   // INCREASED: 25% of image
    const minAspectRatio = 0.75; // Allow more circular/oval shapes (tongues can be round!)
    const maxAspectRatio = 8.0;  // Allow more elongated shapes
    const minWidth = imageWidth * 0.01;   // Smaller minimum width
    const minHeight = imageHeight * 0.01; // Smaller minimum height
    
    console.log(`📏 Filter criteria:`, {
      imageSize: `${imageWidth}x${imageHeight}`,
      minArea: Math.round(minArea),
      maxArea: Math.round(maxArea),
      minAspectRatio,
      maxAspectRatio,
      minWidth: Math.round(minWidth),
      minHeight: Math.round(minHeight)
    });
    
    for (let i = 0; i < contours.length; i++) {
      const contour = contours[i];
      const bbox = this.getBoundingBox(contour);
      const area = bbox.width * bbox.height;
      const aspectRatio = bbox.width / bbox.height;
      
      // Detailed logging for each candidate
      const candidate = {
        index: i,
        contourPoints: contour.length,
        bbox: `${bbox.width}x${bbox.height} at (${bbox.x},${bbox.y})`,
        area: Math.round(area),
        aspectRatio: aspectRatio.toFixed(2),
        center: `(${Math.round(bbox.x + bbox.width/2)}, ${Math.round(bbox.y + bbox.height/2)})`
      };
      
      // Check each criterion and log rejection reasons
      let rejected = false;
      let reason = '';
      
      if (area < minArea) {
        rejected = true;
        reason = `area too small (${Math.round(area)} < ${Math.round(minArea)})`;
      } else if (area > maxArea) {
        rejected = true;
        reason = `area too large (${Math.round(area)} > ${Math.round(maxArea)})`;
      } else if (aspectRatio < minAspectRatio) {
        rejected = true;
        reason = `aspect ratio too small (${aspectRatio.toFixed(2)} < ${minAspectRatio})`;
      } else if (aspectRatio > maxAspectRatio) {
        rejected = true;
        reason = `aspect ratio too large (${aspectRatio.toFixed(2)} > ${maxAspectRatio})`;
      } else if (bbox.width < minWidth) {
        rejected = true;
        reason = `width too small (${Math.round(bbox.width)} < ${Math.round(minWidth)})`;
      } else if (bbox.height < minHeight) {
        rejected = true;
        reason = `height too small (${Math.round(bbox.height)} < ${Math.round(minHeight)})`;
      }
      
      if (rejected) {
        rejectedCount++;
        rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
        console.log(`❌ Rejected contour ${i}: ${reason}`, candidate);
      } else {
        const confidence = this.calculateTongueConfidence(bbox, area, aspectRatio);
        const tongue = {
          contour,
          bbox,
          area,
          aspectRatio,
          centerX: bbox.x + bbox.width / 2,
          centerY: bbox.y + bbox.height / 2,
          confidence
        };
        tongueShapes.push(tongue);
        console.log(`✅ Accepted contour ${i}: confidence ${Math.round(confidence * 100)}%`, candidate);
      }
    }
    
    console.log(`📊 Filtering summary:`);
    console.log(`   Total contours: ${contours.length}`);
    console.log(`   Accepted: ${tongueShapes.length}`);
    console.log(`   Rejected: ${rejectedCount}`);
    console.log(`   Rejection reasons:`, rejectionReasons);
    
    // Sort by confidence and position
    tongueShapes.sort((a, b) => b.confidence - a.confidence);
    console.log(`🏆 Top candidates by confidence:`, tongueShapes.slice(0, 5).map((t, i) => 
      `#${i+1}: ${Math.round(t.confidence * 100)}% at (${Math.round(t.centerX)},${Math.round(t.centerY)})`
    ));
    
    // LESS aggressive overlap removal - keep more detections
    const beforeOverlap = tongueShapes.length;
    const filteredTongues = this.removeOverlappingTongues(tongueShapes);
    const removedByOverlap = beforeOverlap - filteredTongues.length;
    
    console.log(`🔄 Overlap removal: ${beforeOverlap} → ${filteredTongues.length} (removed ${removedByOverlap} overlapping)`);
    
    // Use intelligent limiting based on expected count
    // Take up to 1.5x expected count to give user options for selection
    const maxCandidates = Math.max(expectedCount * 1.5, expectedCount + 5);
    const finalTongues = filteredTongues.slice(0, maxCandidates);
    
    console.log(`🎯 ENHANCED RESULT (expecting ${expectedCount}): ${contours.length} contours → ${tongueShapes.length} candidates → ${filteredTongues.length} after overlap → ${finalTongues.length} final tongues (max ${maxCandidates})`);
    return finalTongues;
  }

  /**
   * Calculate confidence score for tongue detection
   */
  calculateTongueConfidence(bbox, area, aspectRatio) {
    // Higher confidence for ideal tongue characteristics
    let confidence = 0.5; // Base confidence
    
    // Boost confidence for good aspect ratio (2-4 is ideal for tongues)
    if (aspectRatio >= 2.0 && aspectRatio <= 4.0) {
      confidence += 0.3;
    }
    
    // Boost confidence for reasonable size
    if (area > 1000 && area < 50000) {
      confidence += 0.2;
    }
    
    return Math.min(1.0, confidence);
  }

  /**
   * Remove overlapping tongue detections with detailed logging
   */
  removeOverlappingTongues(tongues) {
    console.log(`🔄 OVERLAP REMOVAL: Analyzing ${tongues.length} tongues for overlaps...`);
    
    const filtered = [];
    let removedCount = 0;
    
    for (let i = 0; i < tongues.length; i++) {
      const tongue = tongues[i];
      let isOverlapping = false;
      let overlapDetails = [];
      
      for (let j = 0; j < filtered.length; j++) {
        const existing = filtered[j];
        const overlap = this.calculateDetailedOverlap(tongue.bbox, existing.bbox);
        overlapDetails.push({
          withIndex: j,
          percentage: Math.round(overlap.percentage * 100),
          area: Math.round(overlap.area)
        });
        
        if (this.isOverlapping(tongue.bbox, existing.bbox)) {
          isOverlapping = true;
          console.log(`❌ Tongue ${i} REMOVED: ${Math.round(overlap.percentage * 100)}% overlap with tongue ${j}`);
          console.log(`   Current: confidence ${Math.round(tongue.confidence * 100)}% at (${Math.round(tongue.centerX)}, ${Math.round(tongue.centerY)}) size ${tongue.bbox.width}x${tongue.bbox.height}`);
          console.log(`   Existing: confidence ${Math.round(existing.confidence * 100)}% at (${Math.round(existing.centerX)}, ${Math.round(existing.centerY)}) size ${existing.bbox.width}x${existing.bbox.height}`);
          break;
        }
      }
      
      if (!isOverlapping) {
        filtered.push(tongue);
        const maxOverlap = overlapDetails.length > 0 ? Math.max(...overlapDetails.map(o => o.percentage)) : 0;
        console.log(`✅ Tongue ${i} KEPT: confidence ${Math.round(tongue.confidence * 100)}% at (${Math.round(tongue.centerX)}, ${Math.round(tongue.centerY)}) size ${tongue.bbox.width}x${tongue.bbox.height} - max overlap: ${maxOverlap}%`);
      } else {
        removedCount++;
      }
    }
    
    console.log(`🔄 Overlap summary: ${tongues.length} input → ${filtered.length} kept (${removedCount} removed due to overlap)`);
    
    return filtered;
  }

  /**
   * Calculate detailed overlap information between two bounding boxes
   */
  calculateDetailedOverlap(bbox1, bbox2) {
    const x1 = Math.max(bbox1.x, bbox2.x);
    const y1 = Math.max(bbox1.y, bbox2.y);
    const x2 = Math.min(bbox1.x + bbox1.width, bbox2.x + bbox2.width);
    const y2 = Math.min(bbox1.y + bbox1.height, bbox2.y + bbox2.height);
    
    if (x1 >= x2 || y1 >= y2) {
      return { area: 0, percentage: 0 };
    }
    
    const overlapArea = (x2 - x1) * (y2 - y1);
    const area1 = bbox1.width * bbox1.height;
    const area2 = bbox2.width * bbox2.height;
    const minArea = Math.min(area1, area2);
    const percentage = overlapArea / minArea;
    
    return { area: overlapArea, percentage };
  }

  /**
   * Check if two bounding boxes overlap significantly
   */
  isOverlapping(bbox1, bbox2) {
    const overlapThreshold = 0.3; // 30% overlap threshold
    const overlap = this.calculateDetailedOverlap(bbox1, bbox2);
    return overlap.percentage > overlapThreshold;
  }

  /**
   * Get bounding box of contour points
   */
  getBoundingBox(contour) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const point of contour) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Auto-suggest calibration settings based on detection
   */
  suggestCalibrationSettings(tongueCount) {
    console.log(`🎯 Auto-suggesting settings for ${tongueCount} detected tongues`);
    
    // Update note count dropdown if it exists
    const noteCountSelect = document.getElementById('noteCount');
    if (noteCountSelect) {
      noteCountSelect.value = tongueCount.toString();
    }
    
    // Suggest a reasonable lowest note based on count
    const lowestDotNoteSelect = document.getElementById('lowestDotNote');
    if (lowestDotNoteSelect && tongueCount <= 8) {
      lowestDotNoteSelect.value = '3'; // Middle range for smaller drums
    } else if (lowestDotNoteSelect && tongueCount > 8) {
      lowestDotNoteSelect.value = '.3'; // Lower range for larger drums
    }
  }

  /**
   * Draw visual outlines around detected tongues
   */
  drawTongueOutlines(detectedTongues) {
    console.log('🎨 Drawing visual outlines around detected tongues...');
    
    // Find the photo overlay element
    const photoOverlay = document.querySelector('#drum-photo-overlay');
    if (!photoOverlay) {
      console.warn('❌ Photo overlay not found for drawing outlines');
      return;
    }
    
    // Create outline overlay canvas
    let outlineCanvas = document.getElementById('tongue-outline-canvas');
    if (!outlineCanvas) {
      outlineCanvas = document.createElement('canvas');
      outlineCanvas.id = 'tongue-outline-canvas';
      outlineCanvas.style.position = 'absolute';
      outlineCanvas.style.top = '0';
      outlineCanvas.style.left = '0';
      outlineCanvas.style.pointerEvents = 'none';
      outlineCanvas.style.zIndex = '1001';
      photoOverlay.appendChild(outlineCanvas);
    }
    
    // Set canvas size to match photo
    const photoImg = photoOverlay.querySelector('img');
    if (photoImg) {
      outlineCanvas.width = photoImg.clientWidth;
      outlineCanvas.height = photoImg.clientHeight;
      
      const ctx = outlineCanvas.getContext('2d');
      ctx.clearRect(0, 0, outlineCanvas.width, outlineCanvas.height);
      
      // Scale factors for canvas vs original image
      const scaleX = photoImg.clientWidth / this.drumPhoto.width;
      const scaleY = photoImg.clientHeight / this.drumPhoto.height;
      
      // Draw outlines for each detected tongue
      detectedTongues.forEach((tongue, index) => {
        const bbox = tongue.bbox;
        const confidence = tongue.confidence;
        
        // Scale bounding box to canvas coordinates
        const scaledX = bbox.x * scaleX;
        const scaledY = bbox.y * scaleY;
        const scaledWidth = bbox.width * scaleX;
        const scaledHeight = bbox.height * scaleY;
        
        // Color-code by confidence (green = high, yellow = medium, red = low)
        const hue = confidence * 120; // 0 = red, 120 = green
        ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.lineWidth = 3;
        
        // Draw bounding box
        ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
        
        // Draw tongue number
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = 'bold 16px Arial';
        ctx.fillText(`T${index + 1}`, scaledX + 5, scaledY + 20);
        
        // Draw confidence indicator
        ctx.font = '12px Arial';
        ctx.fillText(`${Math.round(confidence * 100)}%`, scaledX + 5, scaledY + scaledHeight - 5);
      });
      
      console.log(`🎨 Drew outlines for ${detectedTongues.length} detected tongues`);
    }
  }

  /**
   * Enable drum photo overlay mode for calibration
   */
  enableDrumPhotoOverlay() {
    if (!this.drumPhoto || !this.drumVisualizer) return;

    // Set the drum photo as background
    this.drumVisualizer.setPhotoBackground(this.drumPhoto);
    
    // Enable calibration mode
    this.isCalibrating = true;
    
    // Show calibration controls
    this.showCalibrationControls();
    
    console.log('📸 Drum photo overlay enabled - ready for calibration');
  }

  /**
   * Show calibration controls for mapping tongue positions
   */
  showCalibrationControls() {
    // First show the pre-calibration setup dialog
    this.showPreCalibrationDialog();
  }

  /**
   * Show pre-calibration dialog to identify the lowest note
   */
  showPreCalibrationDialog() {
    let preCalibrationDialog = document.getElementById('pre-calibration-dialog');
    if (!preCalibrationDialog) {
      preCalibrationDialog = this.createPreCalibrationDialog();
      document.body.appendChild(preCalibrationDialog);
    }
    
    preCalibrationDialog.style.display = 'block';
    preCalibrationDialog.classList.add('active');
  }

  /**
   * Create pre-calibration dialog for identifying lowest note
   */
  createPreCalibrationDialog() {
    const dialog = document.createElement('div');
    dialog.id = 'pre-calibration-dialog';
    dialog.className = 'calibration-panel';
    
    dialog.innerHTML = `
      <div class="calibration-content">
        <h3>🎵 Drum Photo Calibration Setup</h3>
        <p>Before we start, choose how you'd like to identify your drum notes for calibration.</p>
        
        <div class="notation-choice">
          <div class="config-group">
            <label>How do you prefer to see drum notes?</label>
            <div class="notation-options">
              <label class="radio-option">
                <input type="radio" name="notationType" value="dots" checked>
                <span>🎯 <strong>Number/Dot Notation</strong> (Beginner-friendly)</span>
                <small>Uses .3, .4, .5, 1, 2, 3, 4, 5, 6, 7, 1., 2., 3. notation</small>
              </label>
              <label class="radio-option">
                <input type="radio" name="notationType" value="musical">
                <span>🎼 <strong>Musical Note Names</strong> (Advanced)</span>
                <small>Uses C, D, E, F, G, A, B with octave numbers</small>
              </label>
            </div>
          </div>
        </div>
        
        <div class="scale-setup" id="dotNotationSetup">
          <div class="config-group">
            <label for="noteCount">How many notes does your drum have?</label>
            <select id="noteCount">
              <option value="8" selected>8 notes</option>
              <option value="6">6 notes</option>
              <option value="9">9 notes</option>
              <option value="10">10 notes</option>
              <option value="11">11 notes</option>
              <option value="12">12 notes</option>
              <option value="13">13 notes</option>
              <option value="14">14 notes</option>
              <option value="15">15 notes</option>
            </select>
          </div>
          
          <div class="config-group">
            <label for="lowestDotNote">What is the LOWEST note on your drum?</label>
            <select id="lowestDotNote">
              <option value=".1">.1 (low 1, dot below)</option>
              <option value=".2">.2 (low 2, dot below)</option>
              <option value=".3">.3 (low 3, dot below)</option>
              <option value=".4">.4 (low 4, dot below)</option>
              <option value=".5">.5 (low 5, dot below)</option>
              <option value=".6">.6 (low 6, dot below)</option>
              <option value=".7">.7 (low 7, dot below)</option>
              <option value="1">1 (middle octave, no dot)</option>
              <option value="2">2 (middle octave, no dot)</option>
              <option value="3" selected>3 (middle octave, no dot)</option>
              <option value="4">4 (middle octave, no dot)</option>
              <option value="5">5 (middle octave, no dot)</option>
              <option value="6">6 (middle octave, no dot)</option>
              <option value="7">7 (middle octave, no dot)</option>
              <option value="1.">1. (high 1, dot above)</option>
              <option value="2.">2. (high 2, dot above)</option>
              <option value="3.">3. (high 3, dot above)</option>
              <option value="4.">4. (high 4, dot above)</option>
              <option value="5.">5. (high 5, dot above)</option>
              <option value="6.">6. (high 6, dot above)</option>
              <option value="7.">7. (high 7, dot above)</option>
            </select>
          </div>
          
          <div class="calibration-example">
            <h4>Example for your drum:</h4>
            <p>If your lowest note is <strong>.3</strong> (low 3, dot below) with 15 notes, we'll ask you to click in this order:</p>
            <div class="note-sequence" id="dotSequencePreview">
              .3 → .4 → .5 → .6 → .7 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 1. → 2. → 3. → 4. → 5.
            </div>
          </div>
        </div>
        
        <div class="scale-setup" id="musicalNotationSetup" style="display: none;">
          <div class="config-group">
            <label for="lowestNote">What is the LOWEST note on your drum?</label>
            <select id="lowestNote">
              <option value="C2">C (low octave with dot below)</option>
              <option value="D2">D (low octave with dot below)</option>
              <option value="E2">E (low octave with dot below)</option>
              <option value="F2">F (low octave with dot below)</option>
              <option value="G2">G (low octave with dot below)</option>
              <option value="A2">A (low octave with dot below)</option>
              <option value="B2">B (low octave with dot below)</option>
              <option value="C3">C (middle octave, no dot)</option>
              <option value="D3" selected>D (middle octave, no dot)</option>
              <option value="E3">E (middle octave, no dot)</option>
              <option value="F3">F (middle octave, no dot)</option>
              <option value="G3">G (middle octave, no dot)</option>
              <option value="A3">A (middle octave, no dot)</option>
              <option value="B3">B (middle octave, no dot)</option>
            </select>
          </div>
          
          <div class="config-group">
            <label for="scaleType">Scale Type</label>
            <select id="scaleType">
              <option value="major" selected>Major Scale</option>
              <option value="pentatonic">Pentatonic</option>
              <option value="minor">Natural Minor</option>
              <option value="chromatic">Chromatic</option>
            </select>
          </div>
          
          <div class="calibration-example">
            <h4>Example for your drum:</h4>
            <p>If your lowest note is <strong>D3</strong> (middle D, no dot), we'll ask you to click in this order:</p>
            <div class="note-sequence" id="noteSequencePreview">
              D3 → E3 → F#3 → G3 → A3 → B3 → C#4 → D4 (high D, dot above)
            </div>
          </div>
        </div>
        
        <div class="calibration-buttons">
          <button id="startMusicalCalibration" class="btn btn-primary">🎯 Start Musical Calibration</button>
          <button id="cancelCalibration" class="btn btn-outline">Cancel</button>
        </div>
      </div>
    `;
    
    // Add event listeners
    const notationRadios = dialog.querySelectorAll('input[name="notationType"]');
    const dotNotationSetup = dialog.querySelector('#dotNotationSetup');
    const musicalNotationSetup = dialog.querySelector('#musicalNotationSetup');
    const lowestNoteSelect = dialog.querySelector('#lowestNote');
    const scaleTypeSelect = dialog.querySelector('#scaleType');
    const noteSequencePreview = dialog.querySelector('#noteSequencePreview');
    const noteCountSelect = dialog.querySelector('#noteCount');
    const lowestDotNoteSelect = dialog.querySelector('#lowestDotNote');
    const dotSequencePreview = dialog.querySelector('#dotSequencePreview');
    
    // Switch between notation types
    const toggleNotationType = () => {
      const selectedType = dialog.querySelector('input[name="notationType"]:checked').value;
      if (selectedType === 'dots') {
        dotNotationSetup.style.display = 'block';
        musicalNotationSetup.style.display = 'none';
        updateDotPreview();
      } else {
        dotNotationSetup.style.display = 'none';
        musicalNotationSetup.style.display = 'block';
        updateMusicalPreview();
      }
    };
    
    const updateMusicalPreview = () => {
      const preview = this.generateNoteSequencePreview(lowestNoteSelect.value, scaleTypeSelect.value);
      noteSequencePreview.textContent = preview;
    };
    
    const updateDotPreview = () => {
      const preview = this.generateDotSequencePreview(parseInt(noteCountSelect.value), lowestDotNoteSelect.value);
      dotSequencePreview.textContent = preview;
    };
    
    // Add all event listeners
    notationRadios.forEach(radio => radio.addEventListener('change', toggleNotationType));
    lowestNoteSelect.addEventListener('change', updateMusicalPreview);
    scaleTypeSelect.addEventListener('change', updateMusicalPreview);
    noteCountSelect.addEventListener('change', updateDotPreview);
    lowestDotNoteSelect.addEventListener('change', updateDotPreview);
    
    dialog.querySelector('#startMusicalCalibration').addEventListener('click', () => {
      const selectedType = dialog.querySelector('input[name="notationType"]:checked').value;
      
      if (selectedType === 'dots') {
        const noteCount = parseInt(noteCountSelect.value);
        const lowestDotNote = lowestDotNoteSelect.value;
        this.startDotNotationCalibration(noteCount, lowestDotNote);
      } else {
        const lowestNote = lowestNoteSelect.value;
        const scaleType = scaleTypeSelect.value;
        this.startMusicalCalibration(lowestNote, scaleType);
      }
    });
    
    dialog.querySelector('#cancelCalibration').addEventListener('click', () => {
      this.cancelCalibration();
    });
    
    return dialog;
  }

  /**
   * Generate preview of note sequence for the user (musical notation)
   */
  generateNoteSequencePreview(lowestNote, scaleType) {
    const config = this.currentConfig;
    const noteCount = config.noteCount;
    
    // This is a simplified preview - actual implementation would be more complex
    const noteNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const startNote = lowestNote.charAt(0);
    const startOctave = parseInt(lowestNote.charAt(1));
    
    let sequence = [];
    let currentNoteIndex = noteNames.indexOf(startNote);
    let currentOctave = startOctave;
    
    for (let i = 0; i < Math.min(noteCount, 8); i++) {
      const noteName = noteNames[currentNoteIndex % 7];
      const octaveDisplay = currentOctave < 3 ? `${noteName}${currentOctave} (dot below)` : 
                           currentOctave > 4 ? `${noteName}${currentOctave} (dot above)` : 
                           `${noteName}${currentOctave}`;
      sequence.push(octaveDisplay);
      
      currentNoteIndex++;
      if (currentNoteIndex % 7 === 0) currentOctave++;
    }
    
    return sequence.slice(0, Math.min(8, noteCount)).join(' → ') + (noteCount > 8 ? '...' : '');
  }

  /**
   * Generate preview of dot notation sequence for the user
   */
  generateDotSequencePreview(noteCount, lowestDotNote) {
    const sequence = [];
    const noteNumbers = ['1', '2', '3', '4', '5', '6', '7'];
    
    // Parse the lowest note
    let startNumber, startOctave;
    if (lowestDotNote.startsWith('.')) {
      startNumber = parseInt(lowestDotNote.slice(1));
      startOctave = 'low'; // dot below
    } else if (lowestDotNote.endsWith('.')) {
      startNumber = parseInt(lowestDotNote.slice(0, -1));
      startOctave = 'high'; // dot above
    } else {
      startNumber = parseInt(lowestDotNote);
      startOctave = 'middle'; // no dot
    }
    
    let currentNumber = startNumber;
    let currentOctave = startOctave;
    
    for (let i = 0; i < noteCount; i++) {
      let displayNote;
      if (currentOctave === 'low') {
        displayNote = `.${currentNumber}`;
      } else if (currentOctave === 'high') {
        displayNote = `${currentNumber}.`;
      } else {
        displayNote = `${currentNumber}`;
      }
      
      sequence.push(displayNote);
      
      // Move to next note
      currentNumber++;
      if (currentNumber > 7) {
        currentNumber = 1;
        if (currentOctave === 'low') {
          currentOctave = 'middle';
        } else if (currentOctave === 'middle') {
          currentOctave = 'high';
        }
      }
    }
    
    return sequence.slice(0, Math.min(8, noteCount)).join(' → ') + (noteCount > 8 ? '...' : '');
  }

  /**
   * Start musical calibration with proper note ordering
   */
  startMusicalCalibration(lowestNote, scaleType) {
    // Hide pre-calibration dialog
    const preDialog = document.getElementById('pre-calibration-dialog');
    if (preDialog) {
      preDialog.style.display = 'none';
    }
    
    // Store calibration settings
    this.calibrationSettings = {
      lowestNote,
      scaleType,
      musicalOrder: this.generateMusicalOrder(lowestNote, scaleType)
    };
    
    // Create and show main calibration panel
    let calibrationPanel = document.getElementById('calibration-panel');
    if (!calibrationPanel) {
      calibrationPanel = this.createCalibrationPanel();
      document.body.appendChild(calibrationPanel);
    }
    
    calibrationPanel.style.display = 'block';
    calibrationPanel.classList.add('active');
    
    // Initialize calibration step and update display
    this.calibrationStep = 0;
    this.updateCalibrationDisplay();
  }

  /**
   * Start dot notation calibration with proper ordering
   */
  startDotNotationCalibration(noteCount, lowestDotNote) {
    // Hide pre-calibration dialog
    const preDialog = document.getElementById('pre-calibration-dialog');
    if (preDialog) {
      preDialog.style.display = 'none';
    }
    
    // Store calibration settings for dot notation
    this.calibrationSettings = {
      notationType: 'dots',
      noteCount,
      lowestDotNote,
      dotOrder: this.generateDotOrder(noteCount, lowestDotNote)
    };
    
    // Create and show main calibration panel
    let calibrationPanel = document.getElementById('calibration-panel');
    if (!calibrationPanel) {
      calibrationPanel = this.createCalibrationPanel();
      document.body.appendChild(calibrationPanel);
    }
    
    calibrationPanel.style.display = 'block';
    calibrationPanel.classList.add('active');
    
    // Initialize calibration step and update display
    this.calibrationStep = 0;
    this.updateCalibrationDisplay();
  }

  /**
   * Generate dot notation order for calibration
   */
  generateDotOrder(noteCount, lowestDotNote) {
    const dotOrder = [];
    
    // Parse the lowest note
    let startNumber, startOctave;
    if (lowestDotNote.startsWith('.')) {
      startNumber = parseInt(lowestDotNote.slice(1));
      startOctave = 'low'; // dot below
    } else if (lowestDotNote.endsWith('.')) {
      startNumber = parseInt(lowestDotNote.slice(0, -1));
      startOctave = 'high'; // dot above
    } else {
      startNumber = parseInt(lowestDotNote);
      startOctave = 'middle'; // no dot
    }
    
    let currentNumber = startNumber;
    let currentOctave = startOctave;
    
    for (let i = 0; i < noteCount; i++) {
      let displayNote;
      if (currentOctave === 'low') {
        displayNote = `.${currentNumber}`;
      } else if (currentOctave === 'high') {
        displayNote = `${currentNumber}.`;
      } else {
        displayNote = `${currentNumber}`;
      }
      
      dotOrder.push({
        tongueIndex: i + 1,
        dotNotation: displayNote,
        displayName: displayNote
      });
      
      // Move to next note
      currentNumber++;
      if (currentNumber > 7) {
        currentNumber = 1;
        if (currentOctave === 'low') {
          currentOctave = 'middle';
        } else if (currentOctave === 'middle') {
          currentOctave = 'high';
        }
      }
    }
    
    return dotOrder;
  }

  /**
   * Generate the musical order for calibration
   */
  generateMusicalOrder(lowestNote, scaleType) {
    const config = this.currentConfig;
    const noteCount = config.noteCount;
    
    // Generate musical sequence from lowest to highest
    const musicalOrder = [];
    for (let i = 0; i < noteCount; i++) {
      musicalOrder.push({
        tongueIndex: i + 1, // We'll map this properly later
        musicalNote: this.calculateMusicalNote(lowestNote, scaleType, i),
        displayName: this.getDisplayName(lowestNote, scaleType, i)
      });
    }
    
    return musicalOrder;
  }

  /**
   * Calculate musical note for calibration step
   */
  calculateMusicalNote(lowestNote, scaleType, step) {
    // Simplified calculation - would need more sophisticated logic for different scales
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const startNote = lowestNote.charAt(0);
    const startOctave = parseInt(lowestNote.charAt(1));
    
    let semitoneOffset = 0;
    if (scaleType === 'major') {
      const majorIntervals = [0, 2, 4, 5, 7, 9, 11];
      semitoneOffset = majorIntervals[step % 7] + Math.floor(step / 7) * 12;
    } else if (scaleType === 'pentatonic') {
      const pentatonicIntervals = [0, 2, 4, 7, 9];
      semitoneOffset = pentatonicIntervals[step % 5] + Math.floor(step / 5) * 12;
    }
    
    const startSemitone = noteNames.indexOf(startNote) + startOctave * 12;
    const targetSemitone = startSemitone + semitoneOffset;
    const targetOctave = Math.floor(targetSemitone / 12);
    const targetNote = noteNames[targetSemitone % 12];
    
    return `${targetNote}${targetOctave}`;
  }

  /**
   * Get display name with octave dots
   */
  getDisplayName(lowestNote, scaleType, step) {
    const musicalNote = this.calculateMusicalNote(lowestNote, scaleType, step);
    const noteName = musicalNote.charAt(0);
    const octave = parseInt(musicalNote.slice(-1));
    
    if (octave < 3) {
      return `${noteName} (dot below)`;
    } else if (octave > 4) {
      return `${noteName} (dot above)`;
    } else {
      return `${noteName}`;
    }
  }

  /**
   * Get the next calibration note to display
   */
  getNextCalibrationNote() {
    const currentStep = this.calibrationStep || 0;
    
    // Handle dot notation mode
    if (this.calibrationSettings?.notationType === 'dots' && this.calibrationSettings?.dotOrder) {
      const dotOrder = this.calibrationSettings.dotOrder;
      if (currentStep < dotOrder.length) {
        return dotOrder[currentStep].displayName;
      }
      return "Complete";
    }
    
    // Handle musical notation mode
    if (this.calibrationSettings?.musicalOrder) {
      const musicalOrder = this.calibrationSettings.musicalOrder;
      if (currentStep < musicalOrder.length) {
        return musicalOrder[currentStep].displayName;
      }
      return "Complete";
    }
    
    return "Note 1";
  }

  /**
   * Get the sequence display for the calibration panel
   */
  getSequenceDisplay() {
    const currentStep = this.calibrationStep || 0;
    
    // Handle dot notation mode
    if (this.calibrationSettings?.notationType === 'dots' && this.calibrationSettings?.dotOrder) {
      const dotOrder = this.calibrationSettings.dotOrder;
      return dotOrder.map((note, index) => {
        if (index < currentStep) {
          return `✅ ${note.displayName}`;
        } else if (index === currentStep) {
          return `👉 ${note.displayName}`;
        } else {
          return `⏳ ${note.displayName}`;
        }
      }).join(' → ');
    }
    
    // Handle musical notation mode  
    if (this.calibrationSettings?.musicalOrder) {
      const musicalOrder = this.calibrationSettings.musicalOrder;
      return musicalOrder.map((note, index) => {
        if (index < currentStep) {
          return `✅ ${note.displayName}`;
        } else if (index === currentStep) {
          return `👉 ${note.displayName}`;
        } else {
          return `⏳ ${note.displayName}`;
        }
      }).join(' → ');
    }
    
    return "Setting up sequence...";
  }

  /**
   * Update the calibration display with current step information
   */
  updateCalibrationDisplay() {
    const progressElement = document.getElementById('calibration-progress');
    const sequenceElement = document.getElementById('sequence-display');
    
    if (progressElement) {
      const currentStep = this.calibrationStep || 0;
      const nextNote = this.getNextCalibrationNote();
      
      if (nextNote === "Complete") {
        progressElement.textContent = "Calibration complete!";
      } else {
        // Show appropriate message based on notation type
        if (this.calibrationSettings?.notationType === 'dots') {
          progressElement.textContent = `Click on: ${nextNote}`;
        } else {
          progressElement.textContent = `Click on: ${nextNote}`;
        }
      }
    }
    
    if (sequenceElement) {
      sequenceElement.textContent = this.getSequenceDisplay();
    }
    
    const notationType = this.calibrationSettings?.notationType || 'musical';
    console.log(`🎵 Calibration step ${this.calibrationStep + 1} (${notationType}): ${this.getNextCalibrationNote()}`);
  }

  /**
   * Create calibration control panel
   */
  createCalibrationPanel() {
    const panel = document.createElement('div');
    panel.id = 'calibration-panel';
    panel.className = 'calibration-panel';
    
    panel.innerHTML = `
      <div class="calibration-content">
        <h3>🎯 Musical Drum Photo Calibration</h3>
        <p>Click on each tongue in your photo in musical order (lowest to highest pitch). The photo will be semi-transparent so you can see both.</p>
        
        <div class="calibration-controls">
          <div class="calibration-info">
            <span id="calibration-progress">Click on the LOWEST note in your photo</span>
            <div class="musical-sequence">
              <strong>Sequence:</strong> <span id="sequence-display">Setting up musical sequence...</span>
            </div>
          </div>
          
          <div class="calibration-buttons">
            <button id="calibration-reset" class="btn btn-secondary">Reset</button>
            <button id="calibration-finish" class="btn btn-primary" disabled>Finish Calibration</button>
            <button id="calibration-cancel" class="btn btn-outline">Cancel</button>
          </div>
          
          <div class="calibration-settings">
            <label>
              Photo Opacity: <input type="range" id="photo-opacity" min="0.3" max="1" step="0.1" value="0.7">
              <span id="opacity-value">70%</span>
            </label>
          </div>
        </div>
      </div>
    `;
    
    // Add event listeners
    panel.querySelector('#calibration-reset').addEventListener('click', () => this.resetCalibration());
    panel.querySelector('#calibration-finish').addEventListener('click', () => this.finishCalibration());
    panel.querySelector('#calibration-cancel').addEventListener('click', () => this.cancelCalibration());
    
    const opacitySlider = panel.querySelector('#photo-opacity');
    const opacityValue = panel.querySelector('#opacity-value');
    opacitySlider.addEventListener('input', (e) => {
      const opacity = parseFloat(e.target.value);
      opacityValue.textContent = Math.round(opacity * 100) + '%';
      if (this.drumVisualizer) {
        this.drumVisualizer.setPhotoOpacity(opacity);
      }
    });
    
    return panel;
  }

  /**
   * Reset calibration process
   */
  resetCalibration() {
    if (this.drumVisualizer) {
      this.drumVisualizer.resetCalibration();
    }
    this.calibrationPoints = [];
    this.currentCalibrationStep = 0;
    this.updateCalibrationProgress();
  }

  /**
   * Finish calibration and apply the mapping
   */
  finishCalibration() {
    if (this.drumVisualizer) {
      this.drumVisualizer.applyPhotoCalibration();
    }
    
    this.isCalibrating = false;
    const panel = document.getElementById('calibration-panel');
    if (panel) {
      panel.style.display = 'none';
    }
    
    this.showStatus('Drum photo calibration completed! Your virtual drum now matches your physical drum.', 'success');
  }

  /**
   * Cancel calibration and remove photo overlay
   */
  cancelCalibration() {
    if (this.drumVisualizer) {
      this.drumVisualizer.removePhotoBackground();
    }
    
    this.isCalibrating = false;
    this.drumPhoto = null;
    
    const panel = document.getElementById('calibration-panel');
    if (panel) {
      panel.style.display = 'none';
    }
    
    this.showStatus('Photo calibration cancelled.', 'info');
  }

  /**
   * Update calibration progress display
   */
  updateCalibrationProgress() {
    const progressElement = document.getElementById('calibration-progress');
    const finishButton = document.getElementById('calibration-finish');
    
    if (!progressElement || !finishButton) return;
    
    const config = this.currentConfig;
    const totalTongues = config.noteCount;
    const currentStep = this.currentCalibrationStep || 0;
    
    if (currentStep < totalTongues) {
      progressElement.textContent = `Click tongue ${currentStep + 1} in your photo (${currentStep}/${totalTongues} mapped)`;
      finishButton.disabled = true;
    } else {
      progressElement.textContent = `All tongues mapped! (${totalTongues}/${totalTongues})`;
      finishButton.disabled = false;
    }
  }

  /**
   * Import custom drum layout
   */
  importCustomLayout(layout) {
    if (this.drumVisualizer) {
      this.drumVisualizer.setCustomLayout(layout);
      console.log('✅ Custom layout imported and applied');
    }
  }

  /**
   * Import drum configuration
   */
  importDrumConfiguration(config) {
    // Update the current configuration
    this.currentConfig = { ...this.currentConfig, ...config };
    
    // Update UI controls to reflect imported config
    if (config.noteCount && this.drumSizeSelect) {
      this.drumSizeSelect.value = config.noteCount;
    }
    if (config.key && this.keySelect) {
      this.keySelect.value = config.key;
    }
    if (config.scale && this.scaleSelect) {
      this.scaleSelect.value = config.scale;
    }
    if (config.octave && this.octaveSelect) {
      this.octaveSelect.value = config.octave;
    }
    
    // Apply the configuration
    this.updateConfiguration();
    console.log('✅ Drum configuration imported and applied');
  }

  /**
   * Load preset configuration by name
   */
  loadPresetConfiguration(presetName) {
    const presets = {
      '8-note-pentatonic': {
        noteCount: 8,
        key: 'C',
        scale: 'pentatonic',
        octave: 4,
        name: '8-Note Pentatonic'
      },
      '11-note-diatonic': {
        noteCount: 11,
        key: 'D',
        scale: 'major',
        octave: 4,
        name: '11-Note Diatonic'
      },
      '13-note-chromatic': {
        noteCount: 13,
        key: 'C',
        scale: 'chromatic',  
        octave: 4,
        name: '13-Note Chromatic'
      },
      'akebono-scale': {
        noteCount: 9,
        key: 'A',
        scale: 'minor_pentatonic',
        octave: 4,
        name: 'Akebono Scale'
      }
    };
    
    const preset = presets[presetName];
    if (preset) {
      this.importDrumConfiguration(preset);
      this.showStatus(`Preset "${preset.name}" loaded successfully!`, 'success');
      
      // Switch to auto tab to see the result
      this.switchTab('auto');
    } else {
      this.showStatus(`Preset "${presetName}" not found`, 'error');
    }
  }

  /**
   * Initialize main components
   */
  initializeComponents() {
    // Make app globally accessible for calibration updates
    window.tongueApp = this;
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

      // Initialize OpenCV tongue detector for advanced computer vision
      console.log('🔬 Initializing OpenCV tongue detector...');
      this.tongueDetector = new OpenCVTongueDetector();

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
   * Switch between tabs - FIXED VERSION
   */
  switchTab(tabId) {
    console.log('🔄 Switching to tab:', tabId);
    
    // Remove active class from all tabs and tab contents
    this.tabButtons.forEach(button => button.classList.remove('active'));
    this.tabPanels.forEach(panel => panel.classList.remove('active'));
    
    // Add active class to clicked tab
    const activeTabButton = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeTabButton) {
      activeTabButton.classList.add('active');
      console.log('✅ Tab button activated:', tabId);
    } else {
      console.error('❌ Tab button not found:', tabId);
    }
    
    // Show corresponding tab content
    const activeTabPanel = document.getElementById(`${tabId}-tab`);
    if (activeTabPanel) {
      activeTabPanel.classList.add('active');
      console.log('✅ Tab panel activated:', `${tabId}-tab`);
    } else {
      console.error('❌ Tab panel not found:', `${tabId}-tab`);
    }
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
      
      // Initialize EssentiaJS (async operation)
      this.showStatus('Loading EssentiaJS audio analysis engine...', 'info');
      const essentiaReady = await this.audioManager.initializeEssentia();
      
      if (essentiaReady) {
        this.showStatus('EssentiaJS loaded! Professional-grade pitch detection ready...', 'success');
      } else {
        this.showStatus('Using Web Audio API fallback for pitch detection...', 'info');
      }
      
      this.setProgress(40);
      
      // Set up note detection callback
      this.audioManager.onNoteDetected((detection) => this.handleNoteDetection(detection));
      this.audioManager.onError((error) => this.showStatus(error, 'error'));
      
      this.setProgress(60);
      
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
  console.log('🔧 DOM loaded, initializing Tongue Drum Chum app...');
  
  try {
    console.log('🔧 Creating TongueDrumApp instance...');
    const app = new TongueDrumApp();
    console.log('🎵 Tongue Drum Chum app initialized successfully with EssentiaJS! 🎵');
    
    // Make app globally accessible for debugging
    window.tongueDrumApp = app;
    console.log('🔧 App available globally as window.tongueDrumApp');
    
  } catch (error) {
    console.error('❌ Failed to initialize Tongue Drum Chum app:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Show error message to user
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.innerHTML = `<div style="color: red; font-weight: bold;">❌ App failed to initialize: ${error.message}<br><small>Check browser console for details</small></div>`;
      statusElement.className = 'status error';
    }
  }
});
