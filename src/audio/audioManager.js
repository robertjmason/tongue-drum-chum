import Essentia from 'essentia.js/dist/essentia.js-core.es.js';
import { EssentiaWASM } from 'essentia.js/dist/essentia-wasm.es.js';

// Debug: Log what we actually imported
console.log('🔍 DEBUG - Essentia:', typeof Essentia, Essentia);
console.log('🔍 DEBUG - EssentiaWASM:', typeof EssentiaWASM, EssentiaWASM);

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
   * Uses the getting-started.md pattern: new Essentia(EssentiaWASM)
   */
  async initializeEssentia() {
    if (this.essentiaInitializing || this.essentiaInitialized) return this.essentiaInitialized;
    
    this.essentiaInitializing = true;
    
    try {
      console.log('🎵 Initializing EssentiaJS for professional audio analysis...');
      
      // Use the getting-started.md pattern: new Essentia(EssentiaWASM)
      // EssentiaWASM is already the WASM module object, not a function
      this.essentia = new Essentia(EssentiaWASM);
      
      // Verify EssentiaJS is ready and algorithms are available
      if (this.essentia && typeof this.essentia.Windowing === 'function' && this.essentia.algorithmNames) {
        console.log('✅ EssentiaJS successfully initialized!');
        console.log(`📊 Available algorithms: ${this.essentia.algorithmNames.length}`);
        this.essentiaInitialized = true;
        this.essentiaInitializing = false;
        return true;
      } else {
        throw new Error('EssentiaJS methods not available after initialization');
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
      // STEP 1: Check audio amplitude to avoid processing silence/noise
      const rms = Math.sqrt(this.audioBuffer.reduce((sum, val) => sum + val * val, 0) / this.audioBuffer.length);
      const amplitudeThreshold = 0.01; // Minimum volume threshold
      
      if (rms < amplitudeThreshold) {
        console.log('🔇 SILENCE DETECTED - RMS:', rms.toFixed(4), 'below threshold:', amplitudeThreshold);
        return; // Skip processing for silence/low volume
      }
      
      console.log('🎵 AUDIO DETECTED - RMS:', rms.toFixed(4), 'proceeding with EssentiaJS analysis...');
      
      // Convert JS Float32Array to std::vector<float> for WASM binding
      const inputSignalVector = this.essentia.arrayToVector(this.audioBuffer);
      
      // Apply windowing to reduce spectral leakage
      const windowedResult = this.essentia.Windowing(inputSignalVector, 'hann');
      console.log('🔍 DEBUG - Windowing result:', typeof windowedResult, Object.keys(windowedResult), windowedResult);
      
      // Extract the actual windowed signal from the result object
      const windowedSignal = windowedResult.frame; // Common EssentiaJS output property
      console.log('🔍 DEBUG - Windowed signal:', typeof windowedSignal, windowedSignal);
      
      // Compute FFT spectrum for spectral analysis
      console.log('🔍 DEBUG - About to call Spectrum() with:', windowedSignal);
      let spectrumResult;
      try {
        spectrumResult = this.essentia.Spectrum(windowedSignal);
        console.log('🔍 DEBUG - Spectrum result:', typeof spectrumResult, Object.keys(spectrumResult), spectrumResult);
      } catch (spectrumError) {
        console.log('🔍 DEBUG - Spectrum() error details:', spectrumError);
        throw spectrumError;
      }
      
      // Extract the actual spectrum vector from the result object
      const spectrumVector = spectrumResult.spectrum;
      console.log('🔍 DEBUG - Spectrum vector:', typeof spectrumVector, spectrumVector);
      
      // Try multiple pitch detection approaches (PitchYin has WASM binding issues)
      let finalPitch = 0;
      
      // APPROACH 1: Try PitchYinFFT first (often more stable)
      try {
        console.log('🔍 DEBUG - Trying PitchYinFFT (more stable than PitchYin)...');
        const pitchYinFFTResult = this.essentia.PitchYinFFT(inputSignalVector);
        console.log('✅ SUCCESS - PitchYinFFT result:', typeof pitchYinFFTResult, Object.keys(pitchYinFFTResult), pitchYinFFTResult);
        
        const detectedPitch = pitchYinFFTResult.pitch || pitchYinFFTResult;
        const confidence = pitchYinFFTResult.pitchConfidence || 0;
        const minConfidence = 0.5; // Minimum confidence threshold
        
        console.log('🔍 CONFIDENCE CHECK - Pitch:', detectedPitch, 'Confidence:', confidence.toFixed(3), 'Min required:', minConfidence);
        
        if (confidence >= minConfidence && detectedPitch > 50 && detectedPitch < 2000) {
          finalPitch = detectedPitch;
          console.log('✅ BREAKTHROUGH - High-confidence PitchYinFFT:', finalPitch, 'Hz, confidence:', confidence.toFixed(3));
        } else {
          console.log('❌ LOW CONFIDENCE/INVALID - Pitch:', detectedPitch, 'Confidence:', confidence.toFixed(3), '(threshold:', minConfidence, ')');
        }
      } catch (pitchYinFFTError) {
        console.log('❌ PitchYinFFT failed, trying alternative approaches:', pitchYinFFTError.message);
        
        // APPROACH 2: Try Predominant Fundamental Frequency 
        try {
          console.log('🔍 DEBUG - Trying PredominantPitchMelodia (robust pitch detection)...');
          const pitchMelodiaResult = this.essentia.PredominantPitchMelodia(inputSignalVector);
          console.log('✅ SUCCESS - PredominantPitchMelodia result:', typeof pitchMelodiaResult, Object.keys(pitchMelodiaResult));
          finalPitch = pitchMelodiaResult.pitch || pitchMelodiaResult[0] || 0;
          console.log('✅ ALTERNATIVE SUCCESS - PredominantPitchMelodia pitch:', finalPitch);
        } catch (melodiaError) {
          console.log('❌ PredominantPitchMelodia failed, using spectral peak analysis:', melodiaError.message);
          // Will fall back to spectral peak analysis below
        }
      }
      
      // Get spectral peaks for harmonic analysis
      console.log('🔍 DEBUG - About to call SpectralPeaks() with:', spectrumVector);
      const spectralPeaksResult = this.essentia.SpectralPeaks(spectrumVector);
      console.log('🔍 DEBUG - SpectralPeaks result:', typeof spectralPeaksResult, Object.keys(spectralPeaksResult), spectralPeaksResult);
      
      // CRITICAL FIX: Convert EssentiaJS VectorFloat to JavaScript arrays
      const convertVectorToArray = (vector) => {
        if (!vector || typeof vector.size !== 'function') return [];
        const array = [];
        const size = vector.size();
        for (let i = 0; i < size; i++) {
          array.push(vector.get(i));
        }
        return array;
      };

      const spectralPeaks = {
        frequency: convertVectorToArray(spectralPeaksResult.frequencies || spectralPeaksResult.frequency),
        magnitude: convertVectorToArray(spectralPeaksResult.magnitudes || spectralPeaksResult.magnitude)
      };
      
      console.log('✅ CONVERTED - SpectralPeaks arrays:', spectralPeaks.frequency.length, 'frequencies,', spectralPeaks.magnitude.length, 'magnitudes');

      // If no pitch detected yet from algorithms, try spectral peak analysis
      if (finalPitch === 0 && spectralPeaks.frequency.length > 0) {
        // Find the most prominent spectral peak as pitch estimate
        let maxMagnitudeIndex = 0;
        for (let i = 1; i < spectralPeaks.magnitude.length; i++) {
          if (spectralPeaks.magnitude[i] > spectralPeaks.magnitude[maxMagnitudeIndex]) {
            maxMagnitudeIndex = i;
          }
        }
        finalPitch = spectralPeaks.frequency[maxMagnitudeIndex];
        console.log('🎵 SPECTRAL PEAK FALLBACK - Detected pitch:', finalPitch, 'Hz');
      }

      // Only process if we have a reasonable pitch
      if (finalPitch && finalPitch > 50 && finalPitch < 2000) {
        console.log('🎯 FINAL SUCCESS - Processing pitch:', finalPitch, 'Hz with', spectralPeaks.frequency.length, 'spectral peaks');
        this.processPitchDetection(finalPitch, {
          frequency: spectralPeaks.frequency || [],
          magnitude: spectralPeaks.magnitude || [],
          confidence: 0.9 // High confidence with EssentiaJS
        });
      } else {
        console.log('⚠️ No valid pitch detected, finalPitch:', finalPitch);
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
