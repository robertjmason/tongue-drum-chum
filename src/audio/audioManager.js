// EssentiaJS import for professional-grade audio analysis
import { Essentia } from 'essentia.js/dist/essentia.js-core.es.js';

/**
 * Enhanced Web Audio API manager powered by EssentiaJS
 * Provides superior audio analysis and pitch detection for tongue drums
 */
export class AudioManager {
  constructor(options = {}) {
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.stream = null;
    this.essentia = null;
    this.isListening = false;
    this.animationFrame = null;
    
    // Configuration
    this.fftSize = options.fftSize || 4096;
    this.sampleRate = 44100;
    this.sensitivity = options.sensitivity || 0.7;
    this.cooldownTime = options.cooldownTime || 150;
    this.lastDetectionTime = 0;
    
    // Callbacks
    this.onNoteDetectedCallback = null;
    this.onErrorCallback = null;
    
    // Tongue frequency mapping
    this.tongueFrequencies = {};
    
    // Audio buffers for EssentiaJS
    this.audioBuffer = new Float32Array(this.fftSize);
    this.bufferIndex = 0;
    this.bufferFilled = false;
    
    // Web Audio API fallback throttling
    this.lastWebAudioAnalysis = 0;
    this.webAudioThrottleMs = 50; // Analyze every 50ms for fallback
    
    // EssentiaJS initialization status
    this.essentiaInitialized = false;
    this.essentiaInitializing = false;
  }

  /**
   * Initialize EssentiaJS for advanced audio analysis
   */
  async initializeEssentia() {
    if (this.essentiaInitializing || this.essentiaInitialized) return this.essentiaInitialized;
    
    this.essentiaInitializing = true;
    
    try {
      console.log('🎵 Initializing EssentiaJS for professional audio analysis...');
      
      // Initialize Essentia with proper configuration
      this.essentia = new Essentia();
      
      // Verify EssentiaJS is ready
      if (this.essentia && typeof this.essentia.Windowing === 'function') {
        console.log('✅ EssentiaJS successfully initialized!');
        this.essentiaInitialized = true;
        this.essentiaInitializing = false;
        return true;
      } else {
        throw new Error('EssentiaJS methods not available');
      }
    } catch (error) {
      console.warn('⚠️ EssentiaJS initialization failed, using Web Audio API fallback:', error);
      this.essentia = null;
      this.essentiaInitialized = false;
      this.essentiaInitializing = false;
      return false;
    }
  }

  /**
   * Set callback for note detection events
   */
  onNoteDetected(callback) {
    this.onNoteDetectedCallback = callback;
  }

  /**
   * Set callback for error events
   */
  onError(callback) {
    this.onErrorCallback = callback;
  }

  /**
   * Update tongue frequency mappings
   */
  updateTongueFrequencies(frequencies) {
    this.tongueFrequencies = { ...frequencies };
  }

  /**
   * Set detection sensitivity (0.0 to 1.0)
   */
  setSensitivity(sensitivity) {
    this.sensitivity = Math.max(0.0, Math.min(1.0, sensitivity));
  }

  /**
   * Start listening for audio input
   */
  async startListening() {
    if (this.isListening) return;

    try {
      // Request microphone access with enhanced constraints
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: this.sampleRate,
          channelCount: 1
        }
      });

      // Create audio context and nodes
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.sampleRate
      });
      
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      
      // Configure analyser
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = 0.3;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;

      // Create a script processor for real-time audio analysis
      this.processor = this.audioContext.createScriptProcessor(1024, 1, 1);
      this.processor.onaudioprocess = (event) => {
        this.processAudioFrame(event.inputBuffer.getChannelData(0));
      };

      // Connect audio graph
      this.microphone.connect(this.analyser);
      this.microphone.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.isListening = true;
      console.log('Audio listening started');

    } catch (error) {
      console.error('Failed to start audio listening:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(`Microphone access failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Process real-time audio frames for pitch detection
   */
  processAudioFrame(inputData) {
    if (!this.isListening) return;

    // If EssentiaJS is available, use it for frame-by-frame analysis
    if (this.essentia) {
      // Fill audio buffer for EssentiaJS analysis
      const framesToCopy = Math.min(inputData.length, this.audioBuffer.length - this.bufferIndex);
      for (let i = 0; i < framesToCopy; i++) {
        this.audioBuffer[this.bufferIndex + i] = inputData[i];
      }
      
      this.bufferIndex += framesToCopy;
      
      // When buffer is full, analyze it with EssentiaJS
      if (this.bufferIndex >= this.audioBuffer.length) {
        this.bufferFilled = true;
        this.bufferIndex = 0;
        this.analyzeAudioBuffer();
      }
    } else {
      // Fallback to Web Audio API analysis with throttling
      const now = Date.now();
      if (now - this.lastWebAudioAnalysis >= this.webAudioThrottleMs) {
        this.lastWebAudioAnalysis = now;
        this.analyzeWithWebAudio();
      }
    }
  }

  /**
   * Analyze audio buffer using EssentiaJS for pitch detection
   */
  analyzeAudioBuffer() {
    if (!this.bufferFilled) return;

    try {
      if (this.essentia) {
        // Use EssentiaJS for advanced analysis
        this.analyzeWithEssentia();
      } else {
        // Fallback to basic Web Audio API analysis
        this.analyzeWithWebAudio();
      }
    } catch (error) {
      console.warn('Audio analysis error:', error);
      // Fallback to basic analysis if EssentiaJS fails
      this.analyzeWithWebAudio();
    }
  }

  /**
   * Advanced analysis using EssentiaJS
   */
  analyzeWithEssentia() {
    try {
      // Apply windowing to reduce spectral leakage
      const windowedSignal = this.essentia.Windowing(this.audioBuffer, 'hann');
      
      // Compute FFT spectrum for spectral analysis
      const spectrum = this.essentia.Spectrum(windowedSignal);
      
      // Detect pitch using YIN algorithm (more accurate for monophonic instruments like tongue drums)
      const pitchYin = this.essentia.PitchYin(this.audioBuffer, 0.15); // Slightly higher threshold for drums
      
      // Also try PitchYinFFT for comparison (works better for some frequencies)
      let pitchYinFFT = null;
      try {
        pitchYinFFT = this.essentia.PitchYinFFT(this.audioBuffer, 4096, 0.15);
      } catch (fftError) {
        console.log('PitchYinFFT not available, using PitchYin only');
      }
      
      // Find spectral peaks for harmonic analysis
      const spectralPeaks = this.essentia.SpectralPeaks(spectrum);
      
      // Use the most reliable pitch estimate
      let finalPitch = pitchYin;
      if (pitchYinFFT && Math.abs(pitchYinFFT - pitchYin) < 20) {
        // If both algorithms agree (within 20Hz), average them
        finalPitch = (pitchYin + pitchYinFFT) / 2;
      } else if (pitchYinFFT && pitchYin === 0) {
        // If YIN failed but YinFFT has a result
        finalPitch = pitchYinFFT;
      }
      
      if (finalPitch && finalPitch > 50 && finalPitch < 2000) {
        this.processPitchDetection(finalPitch, {
          frequency: spectralPeaks.frequency || [],
          magnitude: spectralPeaks.magnitude || [],
          confidence: 0.8 // EssentiaJS provides high confidence
        });
      }
    } catch (error) {
      console.warn('EssentiaJS analysis failed, falling back to Web Audio API:', error);
      this.analyzeWithWebAudio();
    }
  }

  /**
   * Basic analysis using Web Audio API as fallback
   */
  analyzeWithWebAudio() {
    // Get frequency domain data from the existing analyser
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);
    
    // Find the peak frequency
    let maxIndex = 0;
    let maxValue = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      if (dataArray[i] > maxValue) {
        maxValue = dataArray[i];
        maxIndex = i;
      }
    }
    
    // Convert bin index to frequency
    const frequency = (maxIndex * this.audioContext.sampleRate) / (this.analyser.fftSize * 2);
    
    // Only process if we have a strong enough signal and reasonable frequency
    if (maxValue > 50 && frequency > 50 && frequency < 2000) {
      this.processPitchDetection(frequency, { confidence: maxValue / 255 });
    }
  }

  /**
   * Combine multiple pitch estimates for higher accuracy
   */
  combinePitchEstimates(pitchYin, pitchMelodia, spectralPeaks) {
    const pitches = [];
    
    // Add YIN pitch if valid
    if (pitchYin > 0) pitches.push(pitchYin);
    
    // Add Melodia pitch if valid
    if (pitchMelodia > 0) pitches.push(pitchMelodia);
    
    // Add dominant spectral peak if it looks like a fundamental
    if (spectralPeaks.frequency.length > 0) {
      const dominantFreq = spectralPeaks.frequency[0];
      if (dominantFreq > 50 && dominantFreq < 2000) {
        pitches.push(dominantFreq);
      }
    }
    
    if (pitches.length === 0) return null;
    
    // Return median pitch for robustness
    pitches.sort((a, b) => a - b);
    const midIndex = Math.floor(pitches.length / 2);
    return pitches.length % 2 === 0 
      ? (pitches[midIndex - 1] + pitches[midIndex]) / 2
      : pitches[midIndex];
  }

  /**
   * Process detected pitch and map to tongue
   */
  processPitchDetection(frequency, spectralPeaks) {
    const currentTime = Date.now();
    
    // Apply cooldown to prevent excessive triggering
    if (currentTime - this.lastDetectionTime < this.cooldownTime) {
      return;
    }

    // Find closest tongue frequency
    const detection = this.findClosestTongue(frequency, spectralPeaks);
    
    if (detection && detection.confidence >= this.sensitivity) {
      this.lastDetectionTime = currentTime;
      
      if (this.onNoteDetectedCallback) {
        this.onNoteDetectedCallback(detection);
      }
    }
  }

  /**
   * Find the closest tongue for a detected frequency
   */
  findClosestTongue(frequency, spectralPeaks) {
    if (Object.keys(this.tongueFrequencies).length === 0) {
      return null;
    }

    let bestMatch = null;
    let smallestDifference = Infinity;
    
    // Check each tongue frequency
    for (const [tongueStr, tongueFreq] of Object.entries(this.tongueFrequencies)) {
      const tongue = parseInt(tongueStr);
      const difference = Math.abs(frequency - tongueFreq);
      const percentDifference = difference / tongueFreq;
      
      // Enhanced tolerance based on spectral characteristics
      let tolerance = 0.06; // Base 6% tolerance
      
      // Increase tolerance for higher frequencies
      if (tongueFreq > 800) tolerance = 0.08;
      if (tongueFreq > 1200) tolerance = 0.10;
      
      // Check for harmonic relationships in spectral peaks
      const hasHarmonicSupport = this.checkHarmonicSupport(tongueFreq, spectralPeaks);
      if (hasHarmonicSupport) {
        tolerance += 0.02; // Allow slightly more tolerance with harmonic support
      }
      
      if (percentDifference <= tolerance && difference < smallestDifference) {
        smallestDifference = difference;
        bestMatch = {
          tongue: tongue,
          frequency: frequency,
          targetFrequency: tongueFreq,
          confidence: Math.max(0, 1 - (percentDifference / tolerance))
        };
      }
    }
    
    return bestMatch;
  }

  /**
   * Check for harmonic support in spectral peaks
   */
  checkHarmonicSupport(fundamental, spectralPeaks) {
    if (!spectralPeaks.frequency || spectralPeaks.frequency.length < 2) {
      return false;
    }
    
    // Look for 2nd and 3rd harmonics
    const secondHarmonic = fundamental * 2;
    const thirdHarmonic = fundamental * 3;
    
    const tolerance = 0.1; // 10% tolerance for harmonics
    
    for (const peakFreq of spectralPeaks.frequency) {
      const secondDiff = Math.abs(peakFreq - secondHarmonic) / secondHarmonic;
      const thirdDiff = Math.abs(peakFreq - thirdHarmonic) / thirdHarmonic;
      
      if (secondDiff <= tolerance || thirdDiff <= tolerance) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Stop listening and clean up resources
   */
  stopListening() {
    if (!this.isListening) return;

    this.isListening = false;

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    console.log('Audio listening stopped');
  }

  /**
   * Test microphone access and basic functionality
   */
  async testMicrophone() {
    try {
      const testStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.sampleRate,
          channelCount: 1
        }
      });
      
      // Test for a short duration
      setTimeout(() => {
        testStream.getTracks().forEach(track => track.stop());
      }, 1000);
      
      return true;
    } catch (error) {
      console.error('Microphone test failed:', error);
      return false;
    }
  }

  /**
   * Get current audio context state
   */
  getAudioContextState() {
    return this.audioContext ? this.audioContext.state : 'closed';
  }

  /**
   * Get sampling rate information
   */
  getSampleRate() {
    return this.audioContext ? this.audioContext.sampleRate : this.sampleRate;
  }
}
