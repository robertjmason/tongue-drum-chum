/**
 * NotationBuilder component for creating visual sequences
 */
export class NotationBuilder {
  constructor(container, drumConfig) {
    this.container = container;
    this.drumConfig = drumConfig;

    // Get required elements
    this.selectorGrid = container.querySelector('#tongueSelector');
    this.sequenceContainer = container.querySelector('#sequenceContainer');
    this.playButton = container.querySelector('#playSequence');
    this.clearButton = container.querySelector('#clearSequence');
    this.exportButton = container.querySelector('#exportSequence');
    this.closeButton = container.querySelector('#closeBuilder');

    if (!this.selectorGrid || !this.sequenceContainer || !this.playButton || 
        !this.clearButton || !this.exportButton || !this.closeButton) {
      throw new Error('Required notation builder elements not found');
    }

    this.sequence = [];
    this.isPlaying = false;
    this.onSequenceChange = null;
    this.onSequenceExport = null;
    this.onClose = null;
    this.onTonguePlay = null;

    this.setupEventListeners();
    this.createTongueSelector();
    this.updateSequenceDisplay();
  }

  /**
   * Set up event listeners for builder controls
   */
  setupEventListeners() {
    this.playButton.addEventListener('click', () => this.playSequence());
    this.clearButton.addEventListener('click', () => this.clearSequence());
    this.exportButton.addEventListener('click', () => this.exportSequence());
    this.closeButton.addEventListener('click', () => this.close());
  }

  /**
   * Update drum configuration and regenerate selector
   */
  updateConfiguration(config) {
    this.drumConfig = config;
    this.createTongueSelector();
  }

  /**
   * Set callback for sequence changes
   */
  onSequenceChanged(callback) {
    this.onSequenceChange = callback;
  }

  /**
   * Set callback for sequence export
   */
  onSequenceExported(callback) {
    this.onSequenceExport = callback;
  }

  /**
   * Set callback for builder close
   */
  onBuilderClosed(callback) {
    this.onClose = callback;
  }

  /**
   * Set callback for tongue play events
   */
  onTonguePlayback(callback) {
    this.onTonguePlay = callback;
  }

  /**
   * Create the tongue selector grid
   */
  createTongueSelector() {
    this.selectorGrid.innerHTML = '';
    
    for (let i = 1; i <= this.drumConfig.noteCount; i++) {
      const tongueDiv = document.createElement('div');
      tongueDiv.className = 'selector-tongue';
      tongueDiv.innerHTML = `
        <div class="tongue-number">${i}</div>
        <div class="octave-controls">
          <div class="octave-btn" data-octave="high" title="High octave">↑</div>
          <div class="octave-btn active" data-octave="middle" title="Middle octave">•</div>
          <div class="octave-btn" data-octave="low" title="Low octave">↓</div>
        </div>
      `;
      
      // Add click handlers
      tongueDiv.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('octave-btn')) {
          this.setOctaveForTongue(tongueDiv, target.dataset.octave);
        } else if (!target.closest('.octave-controls')) {
          this.addNoteToSequence(i, this.getSelectedOctave(tongueDiv));
        }
      });
      
      this.selectorGrid.appendChild(tongueDiv);
    }
  }

  /**
   * Set octave selection for a tongue
   */
  setOctaveForTongue(tongueDiv, octave) {
    // Update octave button states
    tongueDiv.querySelectorAll('.octave-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    tongueDiv.querySelector(`[data-octave="${octave}"]`)?.classList.add('active');
  }

  /**
   * Get selected octave for a tongue
   */
  getSelectedOctave(tongueDiv) {
    const activeBtn = tongueDiv.querySelector('.octave-btn.active');
    return activeBtn?.dataset.octave || 'middle';
  }

  /**
   * Add a note to the sequence
   */
  addNoteToSequence(tongueNumber, octave) {
    const note = {
      tongue: tongueNumber,
      octave: octave
    };
    
    this.sequence.push(note);
    this.updateSequenceDisplay();
    
    // Trigger callbacks
    if (this.onSequenceChange) {
      this.onSequenceChange([...this.sequence]);
    }
    
    if (this.onTonguePlay) {
      this.onTonguePlay(tongueNumber);
    }
  }

  /**
   * Remove a note from the sequence
   */
  removeNoteFromSequence(index) {
    if (index >= 0 && index < this.sequence.length) {
      this.sequence.splice(index, 1);
      this.updateSequenceDisplay();
      
      if (this.onSequenceChange) {
        this.onSequenceChange([...this.sequence]);
      }
    }
  }

  /**
   * Update the sequence display
   */
  updateSequenceDisplay() {
    if (this.sequence.length === 0) {
      this.sequenceContainer.innerHTML = '<div class="empty-sequence">Click tongue numbers above to start building your song!</div>';
      return;
    }
    
    this.sequenceContainer.innerHTML = '';
    
    this.sequence.forEach((note, index) => {
      const noteDiv = document.createElement('div');
      noteDiv.className = 'sequence-note';
      
      const octaveMarker = note.octave === 'high' 
        ? '<div class="note-octave high">•</div>'
        : note.octave === 'low' 
        ? '<div class="note-octave low">•</div>'
        : '';
      
      noteDiv.innerHTML = `
        <div class="note-number">${note.tongue}</div>
        ${octaveMarker}
        <button class="note-remove" data-index="${index}">×</button>
      `;
      
      // Add remove handler
      const removeBtn = noteDiv.querySelector('.note-remove');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeNoteFromSequence(index);
      });
      
      this.sequenceContainer.appendChild(noteDiv);
    });
  }

  /**
   * Play the current sequence
   */
  async playSequence() {
    if (this.sequence.length === 0) {
      alert('Please add some notes to the sequence first!');
      return;
    }
    
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.playButton.textContent = '⏸️ Playing...';
    this.playButton.setAttribute('disabled', 'true');
    
    try {
      for (let i = 0; i < this.sequence.length; i++) {
        const note = this.sequence[i];
        
        // Highlight current note in sequence
        const sequenceNotes = this.sequenceContainer.querySelectorAll('.sequence-note');
        sequenceNotes.forEach(n => n.classList.remove('playing'));
        if (sequenceNotes[i]) {
          sequenceNotes[i].classList.add('playing');
        }
        
        // Play note
        if (this.onTonguePlay) {
          this.onTonguePlay(note.tongue);
        }
        
        // Wait before next note
        await new Promise(resolve => setTimeout(resolve, 600));
      }
      
      // Clear highlights
      const sequenceNotes = this.sequenceContainer.querySelectorAll('.sequence-note');
      sequenceNotes.forEach(n => n.classList.remove('playing'));
      
    } finally {
      this.isPlaying = false;
      this.playButton.textContent = '▶️ Play Sequence';
      this.playButton.removeAttribute('disabled');
    }
  }

  /**
   * Clear the sequence
   */
  clearSequence() {
    this.sequence = [];
    this.updateSequenceDisplay();
    
    if (this.onSequenceChange) {
      this.onSequenceChange([]);
    }
  }

  /**
   * Export the sequence
   */
  exportSequence() {
    if (this.sequence.length === 0) {
      alert('Please add some notes to the sequence first!');
      return;
    }
    
    if (this.onSequenceExport) {
      this.onSequenceExport([...this.sequence]);
    }
  }

  /**
   * Close the builder
   */
  close() {
    if (this.onClose) {
      this.onClose();
    }
  }

  /**
   * Show/hide the builder
   */
  setVisible(visible) {
    this.container.style.display = visible ? 'block' : 'none';
  }

  /**
   * Get current sequence
   */
  getSequence() {
    return [...this.sequence];
  }

  /**
   * Set sequence (for loading saved sequences)
   */
  setSequence(sequence) {
    this.sequence = [...sequence];
    this.updateSequenceDisplay();
    
    if (this.onSequenceChange) {
      this.onSequenceChange([...this.sequence]);
    }
  }

  /**
   * Convert sequence to simple notation format
   */
  sequenceToNotation() {
    return this.sequence.map(note => {
      if (note.octave === 'high') {
        return `${note.tongue}^`;
      } else if (note.octave === 'low') {
        return `${note.tongue}v`;
      } else {
        return note.tongue;
      }
    });
  }

  /**
   * Convert notation format to sequence
   */
  static notationToSequence(notation) {
    return notation.map(note => {
      if (typeof note === 'string') {
        if (note.endsWith('^')) {
          return {
            tongue: parseInt(note.slice(0, -1)),
            octave: 'high'
          };
        } else if (note.endsWith('v')) {
          return {
            tongue: parseInt(note.slice(0, -1)),
            octave: 'low'
          };
        } else {
          return {
            tongue: parseInt(note),
            octave: 'middle'
          };
        }
      } else {
        return {
          tongue: note,
          octave: 'middle'
        };
      }
    });
  }

  /**
   * Generate random sequence for testing
   */
  generateRandomSequence(length = 8) {
    this.clearSequence();
    
    for (let i = 0; i < length; i++) {
      const tongueNumber = Math.floor(Math.random() * this.drumConfig.noteCount) + 1;
      const octaves = ['low', 'middle', 'high'];
      const octave = octaves[Math.floor(Math.random() * octaves.length)];
      
      this.addNoteToSequence(tongueNumber, octave);
    }
  }

  /**
   * Import sequence from various formats
   */
  importSequence(data) {
    try {
      let sequence;
      
      if (typeof data === 'string') {
        // Try to parse as JSON
        sequence = JSON.parse(data);
      } else if (Array.isArray(data)) {
        sequence = data;
      } else {
        throw new Error('Invalid sequence format');
      }
      
      // Validate sequence
      if (!Array.isArray(sequence)) {
        throw new Error('Sequence must be an array');
      }
      
      for (const note of sequence) {
        if (!note.tongue || note.tongue < 1 || note.tongue > this.drumConfig.noteCount) {
          throw new Error(`Invalid tongue number: ${note.tongue}`);
        }
        if (note.octave && !['low', 'middle', 'high'].includes(note.octave)) {
          throw new Error(`Invalid octave: ${note.octave}`);
        }
      }
      
      this.setSequence(sequence);
      return true;
      
    } catch (error) {
      console.error('Failed to import sequence:', error);
      alert(`Failed to import sequence: ${error.message}`);
      return false;
    }
  }

  /**
   * Get sequence statistics
   */
  getSequenceStats() {
    if (this.sequence.length === 0) {
      return null;
    }
    
    const tongueUsage = {};
    const octaveUsage = { low: 0, middle: 0, high: 0 };
    let totalTongues = new Set();
    
    for (const note of this.sequence) {
      tongueUsage[note.tongue] = (tongueUsage[note.tongue] || 0) + 1;
      octaveUsage[note.octave] = (octaveUsage[note.octave] || 0) + 1;
      totalTongues.add(note.tongue);
    }
    
    return {
      length: this.sequence.length,
      uniqueTongues: totalTongues.size,
      tongueUsage: tongueUsage,
      octaveUsage: octaveUsage,
      coverage: (totalTongues.size / this.drumConfig.noteCount) * 100
    };
  }
}
