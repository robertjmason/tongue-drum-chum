/**
 * LayoutBuilder component for creating custom drum layouts with drag-and-drop
 */
export class LayoutBuilder {
  constructor(container, drumConfig) {
    this.container = container;
    this.drumConfig = drumConfig;

    // Get required elements
    this.canvas = container.querySelector('#layoutCanvas');
    this.saveButton = container.querySelector('#saveLayout');
    this.resetButton = container.querySelector('#resetLayout');
    this.closeButton = container.querySelector('#closeLayoutBuilder');
    this.nameInput = container.querySelector('#layoutName');

    if (!this.canvas || !this.saveButton || !this.resetButton || 
        !this.closeButton || !this.nameInput) {
      throw new Error('Required layout builder elements not found');
    }

    // Initialize with default circular layout
    this.currentLayout = this.generateDefaultLayout();
    
    this.dragState = {
      isDragging: false,
      dragElement: null,
      dragOffset: { x: 0, y: 0 }
    };
    
    this.onLayoutSaved = null;
    this.onClose = null;
    
    this.setupEventListeners();
    this.createDraggableTongues();
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    this.saveButton.addEventListener('click', () => this.saveLayout());
    this.resetButton.addEventListener('click', () => this.resetLayout());
    this.closeButton.addEventListener('click', () => this.close());

    // Canvas mouse events for dragging
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));

    // Touch events for mobile
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
  }

  /**
   * Update drum configuration and regenerate layout
   */
  updateConfiguration(config) {
    this.drumConfig = config;
    this.currentLayout = this.generateDefaultLayout();
    this.createDraggableTongues();
  }

  /**
   * Set callback for layout saved
   */
  onLayoutSave(callback) {
    this.onLayoutSaved = callback;
  }

  /**
   * Set callback for builder close
   */
  onBuilderClosed(callback) {
    this.onClose = callback;
  }

  /**
   * Generate default circular layout
   */
  generateDefaultLayout() {
    const positions = {};
    const canvasRect = this.canvas.getBoundingClientRect();
    const centerX = canvasRect.width / 2 || 300;
    const centerY = canvasRect.height / 2 || 300;
    const radius = Math.min(centerX, centerY) - 60;

    for (let i = 1; i <= this.drumConfig.noteCount; i++) {
      const angle = (2 * Math.PI * (i - 1)) / this.drumConfig.noteCount - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      positions[i] = { x, y };
    }

    return {
      name: `Custom ${this.drumConfig.noteCount}-Note Layout`,
      positions: positions
    };
  }

  /**
   * Create draggable tongue elements
   */
  createDraggableTongues() {
    this.canvas.innerHTML = '';
    
    // Create center reference
    const centerDiv = document.createElement('div');
    centerDiv.className = 'layout-center';
    centerDiv.textContent = '0';
    this.canvas.appendChild(centerDiv);

    // Create draggable tongues
    for (let i = 1; i <= this.drumConfig.noteCount; i++) {
      const tongueDiv = document.createElement('div');
      tongueDiv.className = 'draggable-tongue';
      tongueDiv.dataset.tongue = i.toString();
      tongueDiv.textContent = i.toString();
      tongueDiv.draggable = false; // Use custom drag handling
      
      // Position according to current layout
      const pos = this.currentLayout.positions[i];
      if (pos) {
        tongueDiv.style.left = pos.x + 'px';
        tongueDiv.style.top = pos.y + 'px';
      }
      
      this.canvas.appendChild(tongueDiv);
    }
  }

  /**
   * Handle mouse down for drag start
   */
  handleMouseDown(e) {
    const target = e.target;
    if (!target.classList.contains('draggable-tongue')) return;

    e.preventDefault();
    this.startDrag(target, e.clientX, e.clientY);
  }

  /**
   * Handle mouse move for dragging
   */
  handleMouseMove(e) {
    if (!this.dragState.isDragging || !this.dragState.dragElement) return;

    e.preventDefault();
    this.updateDragPosition(e.clientX, e.clientY);
  }

  /**
   * Handle mouse up for drag end
   */
  handleMouseUp(e) {
    if (this.dragState.isDragging) {
      this.endDrag();
    }
  }

  /**
   * Handle touch start
   */
  handleTouchStart(e) {
    const target = e.target;
    if (!target.classList.contains('draggable-tongue')) return;

    e.preventDefault();
    const touch = e.touches[0];
    this.startDrag(target, touch.clientX, touch.clientY);
  }

  /**
   * Handle touch move
   */
  handleTouchMove(e) {
    if (!this.dragState.isDragging || !this.dragState.dragElement) return;

    e.preventDefault();
    const touch = e.touches[0];
    this.updateDragPosition(touch.clientX, touch.clientY);
  }

  /**
   * Handle touch end
   */
  handleTouchEnd(e) {
    if (this.dragState.isDragging) {
      this.endDrag();
    }
  }

  /**
   * Start dragging a tongue element
   */
  startDrag(element, clientX, clientY) {
    const canvasRect = this.canvas.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    this.dragState = {
      isDragging: true,
      dragElement: element,
      dragOffset: {
        x: clientX - elementRect.left,
        y: clientY - elementRect.top
      }
    };
    
    element.classList.add('dragging');
    this.canvas.classList.add('dragging-active');
  }

  /**
   * Update drag position
   */
  updateDragPosition(clientX, clientY) {
    if (!this.dragState.dragElement) return;

    const canvasRect = this.canvas.getBoundingClientRect();
    let x = clientX - canvasRect.left - this.dragState.dragOffset.x;
    let y = clientY - canvasRect.top - this.dragState.dragOffset.y;
    
    // Constrain to canvas bounds
    const tongueWidth = 44; // From CSS
    const tongueHeight = 70; // From CSS
    
    x = Math.max(0, Math.min(x, canvasRect.width - tongueWidth));
    y = Math.max(0, Math.min(y, canvasRect.height - tongueHeight));
    
    this.dragState.dragElement.style.left = x + 'px';
    this.dragState.dragElement.style.top = y + 'px';
  }

  /**
   * End dragging and update layout
   */
  endDrag() {
    if (!this.dragState.dragElement) return;

    const element = this.dragState.dragElement;
    const tongueNumber = parseInt(element.dataset.tongue || '0');
    
    if (tongueNumber > 0) {
      // Update layout position
      this.currentLayout.positions[tongueNumber] = {
        x: parseFloat(element.style.left),
        y: parseFloat(element.style.top)
      };
    }
    
    element.classList.remove('dragging');
    this.canvas.classList.remove('dragging-active');
    
    this.dragState = {
      isDragging: false,
      dragElement: null,
      dragOffset: { x: 0, y: 0 }
    };
  }

  /**
   * Save the current layout
   */
  saveLayout() {
    const layoutName = this.nameInput.value.trim();
    if (!layoutName) {
      alert('Please enter a name for the layout');
      this.nameInput.focus();
      return;
    }
    
    const layout = {
      name: layoutName,
      positions: { ...this.currentLayout.positions }
    };
    
    if (this.onLayoutSaved) {
      this.onLayoutSaved(layout);
    }
    
    alert(`Layout "${layoutName}" saved successfully!`);
  }

  /**
   * Reset layout to default circular arrangement
   */
  resetLayout() {
    if (confirm('Reset all tongue positions to default circular layout?')) {
      this.currentLayout = this.generateDefaultLayout();
      this.createDraggableTongues();
    }
  }

  /**
   * Close the layout builder
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
    if (visible) {
      // Reset layout name input
      this.nameInput.value = this.currentLayout.name || '';
    }
  }

  /**
   * Load an existing layout for editing
   */
  loadLayout(layout) {
    this.currentLayout = {
      name: layout.name,
      positions: { ...layout.positions }
    };
    
    this.nameInput.value = layout.name;
    this.createDraggableTongues();
  }

  /**
   * Get current layout
   */
  getCurrentLayout() {
    return {
      name: this.currentLayout.name,
      positions: { ...this.currentLayout.positions }
    };
  }

  /**
   * Auto-arrange tongues in specific patterns
   */
  autoArrangePattern(pattern) {
    const canvasRect = this.canvas.getBoundingClientRect();
    const centerX = canvasRect.width / 2 || 300;
    const centerY = canvasRect.height / 2 || 300;
    const positions = {};

    switch (pattern) {
      case 'circle':
        const radius = Math.min(centerX, centerY) - 60;
        for (let i = 1; i <= this.drumConfig.noteCount; i++) {
          const angle = (2 * Math.PI * (i - 1)) / this.drumConfig.noteCount - Math.PI / 2;
          positions[i] = {
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius
          };
        }
        break;

      case 'grid':
        const cols = Math.ceil(Math.sqrt(this.drumConfig.noteCount));
        const spacing = Math.min(canvasRect.width, canvasRect.height) / (cols + 1);
        for (let i = 1; i <= this.drumConfig.noteCount; i++) {
          const row = Math.floor((i - 1) / cols);
          const col = (i - 1) % cols;
          positions[i] = {
            x: spacing * (col + 1),
            y: spacing * (row + 1)
          };
        }
        break;

      case 'spiral':
        let angle = 0;
        let radiusSpiral = 20;
        const spiralGrowth = 15;
        for (let i = 1; i <= this.drumConfig.noteCount; i++) {
          positions[i] = {
            x: centerX + Math.cos(angle) * radiusSpiral,
            y: centerY + Math.sin(angle) * radiusSpiral
          };
          angle += 0.8;
          radiusSpiral += spiralGrowth;
        }
        break;

      case 'line':
        const spacing_line = (canvasRect.width - 80) / (this.drumConfig.noteCount - 1);
        for (let i = 1; i <= this.drumConfig.noteCount; i++) {
          positions[i] = {
            x: 40 + (i - 1) * spacing_line,
            y: centerY
          };
        }
        break;

      default:
        console.warn(`Unknown pattern: ${pattern}`);
        return;
    }

    this.currentLayout.positions = positions;
    this.createDraggableTongues();
  }

  /**
   * Export layout as JSON
   */
  exportLayout() {
    const layoutData = {
      ...this.getCurrentLayout(),
      drumConfig: this.drumConfig,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(layoutData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `tongue-drum-layout-${layoutData.name.replace(/\s+/g, '-')}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  /**
   * Import layout from JSON
   */
  importLayout(data) {
    try {
      let layoutData;
      
      if (typeof data === 'string') {
        layoutData = JSON.parse(data);
      } else {
        layoutData = data;
      }
      
      // Validate layout structure
      if (!layoutData.name || !layoutData.positions) {
        throw new Error('Invalid layout format');
      }
      
      // Load the layout
      this.loadLayout(layoutData);
      return true;
      
    } catch (error) {
      console.error('Failed to import layout:', error);
      alert(`Failed to import layout: ${error.message}`);
      return false;
    }
  }

  /**
   * Get layout statistics
   */
  getLayoutStats() {
    const positions = Object.values(this.currentLayout.positions);
    if (positions.length === 0) return null;
    
    const xs = positions.map(p => p.x);
    const ys = positions.map(p => p.y);
    
    return {
      tongueCount: positions.length,
      bounds: {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys)
      },
      center: {
        x: xs.reduce((a, b) => a + b, 0) / xs.length,
        y: ys.reduce((a, b) => a + b, 0) / ys.length
      }
    };
  }
}
