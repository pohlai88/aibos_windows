// Window Snapping System for AI-BOS
// Provides snap-to-grid, snap-to-edges, and snap zones functionality
// Enhanced with multi-monitor support

export interface SnapZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'fullscreen' | 'corner';
}

export interface SnapConfig {
  enabled: boolean;
  snapDistance: number;
  showIndicators: boolean;
  snapToGrid: boolean;
  gridSize: number;
  snapToEdges: boolean;
  snapToCorners: boolean;
  snapToCenter: boolean;
  // NEW: Accessibility and performance options
  announceSnaps: boolean;
  debounceMs: number;
  showSnapPreview: boolean;
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapResult {
  snapped: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zone?: SnapZone;
  indicator?: SnapIndicator;
  preview?: SnapIndicator; // NEW: Snap preview indicator
}

export interface SnapIndicator {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'snap' | 'grid' | 'edge' | 'corner' | 'preview'; // NEW: Preview type
  opacity: number;
}

class WindowSnappingManager {
  private config: SnapConfig;
  private snapZones: SnapZone[] = [];
  private indicators: SnapIndicator[] = [];
  private isInitialized = false;
  
  // NEW: Performance and accessibility features
  private lastSnapZone: SnapZone | null = null;
  private debounceTimer: number | null = null;
  private lastWindowSize = { width: 0, height: 0 };

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): SnapConfig {
    if (typeof window === 'undefined') {
      return {
        enabled: true,
        snapDistance: 20,
        showIndicators: true,
        snapToGrid: true,
        gridSize: 20,
        snapToEdges: true,
        snapToCorners: true,
        snapToCenter: true,
        // NEW: Default accessibility and performance settings
        announceSnaps: true,
        debounceMs: 16, // ~60fps
        showSnapPreview: true
      };
    }

    const saved = localStorage.getItem('aibos-snap-config');
    if (saved) {
      try {
        return { ...JSON.parse(saved) };
      } catch {
        // Fallback to defaults
      }
    }

    return {
      enabled: true,
      snapDistance: 20,
      showIndicators: true,
      snapToGrid: true,
      gridSize: 20,
      snapToEdges: true,
      snapToCorners: true,
      snapToCenter: true,
      // NEW: Default accessibility and performance settings
      announceSnaps: true,
      debounceMs: 16,
      showSnapPreview: true
    };
  }

  private saveConfig(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aibos-snap-config', JSON.stringify(this.config));
    }
  }

  initialize(): void {
    if (this.isInitialized) return;

    this.updateSnapZones();
    this.isInitialized = true;
    console.log('Window snapping system initialized');
  }

  private updateSnapZones(): void {
    if (typeof window === 'undefined') return;

    // For now, use single monitor approach until we integrate monitorManager
    const screenWidth = globalThis.innerWidth;
    const screenHeight = globalThis.innerHeight;
    const margin = 20;

    this.snapZones = [
      // Left half
      {
        id: 'left',
        name: 'Left Half',
        x: margin,
        y: margin,
        width: (screenWidth - 3 * margin) / 2,
        height: screenHeight - 2 * margin,
        type: 'left' as const
      },
      // Right half
      {
        id: 'right',
        name: 'Right Half',
        x: screenWidth / 2 + margin / 2,
        y: margin,
        width: (screenWidth - 3 * margin) / 2,
        height: screenHeight - 2 * margin,
        type: 'right' as const
      },
      // Top half
      {
        id: 'top',
        name: 'Top Half',
        x: margin,
        y: margin,
        width: screenWidth - 2 * margin,
        height: (screenHeight - 3 * margin) / 2,
        type: 'top' as const
      },
      // Bottom half
      {
        id: 'bottom',
        name: 'Bottom Half',
        x: margin,
        y: screenHeight / 2 + margin / 2,
        width: screenWidth - 2 * margin,
        height: (screenHeight - 3 * margin) / 2,
        type: 'bottom' as const
      },
      // Center
      {
        id: 'center',
        name: 'Center',
        x: screenWidth / 4,
        y: screenHeight / 4,
        width: screenWidth / 2,
        height: screenHeight / 2,
        type: 'center' as const
      },
      // Fullscreen
      {
        id: 'fullscreen',
        name: 'Fullscreen',
        x: 0,
        y: 0,
        width: screenWidth,
        height: screenHeight,
        type: 'fullscreen' as const
      },
      // Corners
      {
        id: 'top-left',
        name: 'Top Left',
        x: margin,
        y: margin,
        width: screenWidth / 2 - margin,
        height: screenHeight / 2 - margin,
        type: 'corner'
      },
      {
        id: 'top-right',
        name: 'Top Right',
        x: screenWidth / 2,
        y: margin,
        width: screenWidth / 2 - margin,
        height: screenHeight / 2 - margin,
        type: 'corner'
      },
      {
        id: 'bottom-left',
        name: 'Bottom Left',
        x: margin,
        y: screenHeight / 2,
        width: screenWidth / 2 - margin,
        height: screenHeight / 2 - margin,
        type: 'corner'
      },
      {
        id: 'bottom-right',
        name: 'Bottom Right',
        x: screenWidth / 2,
        y: screenHeight / 2,
        width: screenWidth / 2 - margin,
        height: screenHeight / 2 - margin,
        type: 'corner'
      }
    ];
  }

  private isNearEdge(value: number, edgeValue: number): boolean {
    return Math.abs(value - edgeValue) <= this.config.snapDistance;
  }

  private snapToGrid(value: number): number {
    if (!this.config.snapToGrid) return value;
    return Math.round(value / this.config.gridSize) * this.config.gridSize;
  }

  private findSnapZone(windowBounds: WindowBounds): SnapZone | null {
    if (!this.config.enabled) return null;

    const windowCenter = {
      x: windowBounds.x + windowBounds.width / 2,
      y: windowBounds.y + windowBounds.height / 2
    };

    for (const zone of this.snapZones) {
      const zoneCenter = {
        x: zone.x + zone.width / 2,
        y: zone.y + zone.height / 2
      };

      const distance = Math.sqrt(
        Math.pow(windowCenter.x - zoneCenter.x, 2) + 
        Math.pow(windowCenter.y - zoneCenter.y, 2)
      );

      if (distance <= this.config.snapDistance * 2) {
        return zone;
      }
    }

    return null;
  }

  private createSnapIndicator(zone: SnapZone): SnapIndicator {
    return {
      x: zone.x,
      y: zone.y,
      width: zone.width,
      height: zone.height,
      type: 'snap',
      opacity: 0.3
    };
  }

  calculateSnap(windowBounds: WindowBounds, isDragging: boolean = false): SnapResult {
    if (!this.config.enabled) {
      return {
        snapped: false,
        position: { x: windowBounds.x, y: windowBounds.y },
        size: { width: windowBounds.width, height: windowBounds.height }
      };
    }

    // NEW: Performance optimization - only update zones when needed
    this.updateSnapZonesIfNeeded();

    let snapped = false;
    let newX = windowBounds.x;
    let newY = windowBounds.y;
    let newWidth = windowBounds.width;
    let newHeight = windowBounds.height;
    let snapZone: SnapZone | null = null;
    let indicator: SnapIndicator | undefined;
    let preview: SnapIndicator | undefined;

    // Snap to grid
    if (this.config.snapToGrid) {
      newX = this.snapToGrid(newX);
      newY = this.snapToGrid(newY);
      snapped = true;
    }

    // Snap to edges
    if (this.config.snapToEdges) {
      const screenWidth = globalThis.innerWidth;
      const screenHeight = globalThis.innerHeight;

      // Left edge
      if (this.isNearEdge(newX, 0)) {
        newX = 0;
        snapped = true;
      }

      // Right edge
      if (this.isNearEdge(newX + newWidth, screenWidth)) {
        newX = screenWidth - newWidth;
        snapped = true;
      }

      // Top edge
      if (this.isNearEdge(newY, 0)) {
        newY = 0;
        snapped = true;
      }

      // Bottom edge
      if (this.isNearEdge(newY + newHeight, screenHeight)) {
        newY = screenHeight - newHeight;
        snapped = true;
      }
    }

    // Snap to zones
    const zone = this.findSnapZone({ x: newX, y: newY, width: newWidth, height: newHeight });
    if (zone) {
      snapZone = zone;
      snapped = true;

      // NEW: Announce snap zone change
      if (zone !== this.lastSnapZone) {
        this.lastSnapZone = zone;
        this.announceSnap(zone);
      }

      // Apply zone snapping
      switch (zone.type) {
        case 'left':
          newX = zone.x;
          newWidth = zone.width;
          break;
        case 'right':
          newX = zone.x;
          newWidth = zone.width;
          break;
        case 'top':
          newY = zone.y;
          newHeight = zone.height;
          break;
        case 'bottom':
          newY = zone.y;
          newHeight = zone.height;
          break;
        case 'center':
          newX = zone.x;
          newY = zone.y;
          newWidth = zone.width;
          newHeight = zone.height;
          break;
        case 'fullscreen':
          newX = zone.x;
          newY = zone.y;
          newWidth = zone.width;
          newHeight = zone.height;
          break;
        case 'corner':
          newX = zone.x;
          newY = zone.y;
          newWidth = zone.width;
          newHeight = zone.height;
          break;
      }

      // Create indicator if dragging
      if (isDragging && this.config.showIndicators) {
        indicator = this.createSnapIndicator(zone);
      }

      // NEW: Create snap preview if enabled
      if (isDragging && this.config.showSnapPreview) {
        preview = {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
          type: 'preview',
          opacity: 0.2
        };
      }
    } else {
      // NEW: Clear last snap zone when not snapping
      this.lastSnapZone = null;
    }

    // Ensure window stays within bounds
    const screenWidth = globalThis.innerWidth;
    const screenHeight = globalThis.innerHeight;
    
    newX = Math.max(0, Math.min(newX, screenWidth - newWidth));
    newY = Math.max(0, Math.min(newY, screenHeight - newHeight));

    const result: SnapResult = {
      snapped,
      position: { x: newX, y: newY },
      size: { width: newWidth, height: newHeight }
    };

    if (snapZone) {
      result.zone = snapZone;
    }

    if (indicator) {
      result.indicator = indicator;
    }

    if (preview) {
      result.preview = preview;
    }

    return result;
  }

  // NEW: Debounced snap calculation for performance
  calculateSnapDebounced(windowBounds: WindowBounds, isDragging: boolean = false): Promise<SnapResult> {
    return new Promise((resolve) => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      
      this.debounceTimer = globalThis.setTimeout(() => {
        const result = this.calculateSnap(windowBounds, isDragging);
        resolve(result);
      }, this.config.debounceMs);
    });
  }

  // NEW: Accessibility announcement
  private announceSnap(zone: SnapZone): void {
    if (!this.config.announceSnaps || typeof window === 'undefined') return;
    
    // Create or get ARIA live region
    let liveRegion = document.getElementById('aibos-snap-announcement');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'aibos-snap-announcement';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      document.body.appendChild(liveRegion);
    }
    
    liveRegion.textContent = `Window snapped to ${zone.name}`;
  }

  // NEW: Performance-optimized snap zone updates
  private updateSnapZonesIfNeeded(): void {
    if (typeof window === 'undefined') return;
    
    const currentSize = { width: globalThis.innerWidth, height: globalThis.innerHeight };
    
    // Only update if window size actually changed
    if (currentSize.width === this.lastWindowSize.width && 
        currentSize.height === this.lastWindowSize.height) {
      return;
    }
    
    this.lastWindowSize = currentSize;
    this.updateSnapZones();
  }

  // Configuration methods
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.saveConfig();
  }

  setSnapDistance(distance: number): void {
    this.config.snapDistance = Math.max(5, Math.min(50, distance));
    this.saveConfig();
  }

  setShowIndicators(show: boolean): void {
    this.config.showIndicators = show;
    this.saveConfig();
  }

  setSnapToGrid(enabled: boolean): void {
    this.config.snapToGrid = enabled;
    this.saveConfig();
  }

  setGridSize(size: number): void {
    this.config.gridSize = Math.max(5, Math.min(100, size));
    this.saveConfig();
  }

  setSnapToEdges(enabled: boolean): void {
    this.config.snapToEdges = enabled;
    this.saveConfig();
  }

  setSnapToCorners(enabled: boolean): void {
    this.config.snapToCorners = enabled;
    this.saveConfig();
  }

  setSnapToCenter(enabled: boolean): void {
    this.config.snapToCenter = enabled;
    this.saveConfig();
  }

  // NEW: Configuration methods for enterprise features
  setAnnounceSnaps(enabled: boolean): void {
    this.config.announceSnaps = enabled;
    this.saveConfig();
  }

  setDebounceMs(ms: number): void {
    this.config.debounceMs = Math.max(0, Math.min(100, ms));
    this.saveConfig();
  }

  setShowSnapPreview(enabled: boolean): void {
    this.config.showSnapPreview = enabled;
    this.saveConfig();
  }

  getConfig(): SnapConfig {
    return { ...this.config };
  }

  getSnapZones(): SnapZone[] {
    return [...this.snapZones];
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  // Clear indicators
  clearIndicators(): void {
    this.indicators = [];
  }

  // Get current indicators
  getIndicators(): SnapIndicator[] {
    return [...this.indicators];
  }
}

// Export singleton instance
export const windowSnappingManager = new WindowSnappingManager();

// Initialize when module loads
if (typeof window !== 'undefined') {
  windowSnappingManager.initialize();
} 