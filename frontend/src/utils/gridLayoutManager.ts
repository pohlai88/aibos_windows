// Advanced Grid Layout Manager for AI-BOS
// Provides flexible grid layouts, workspace templates, and layout presets

export interface GridCell {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  windowId?: string;
  isOccupied: boolean;
  isResizable: boolean;
}

export interface GridLayout {
  id: string;
  name: string;
  description: string;
  columns: number;
  rows: number;
  cells: GridCell[];
  category: 'productivity' | 'development' | 'design' | 'entertainment' | 'custom';
  isDefault?: boolean;
}

export interface LayoutPreset {
  id: string;
  name: string;
  layouts: GridLayout[];
  description: string;
  tags: string[];
}

export interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  layout: GridLayout;
  defaultApps: string[];
  autoArrange: boolean;
}

class GridLayoutManager {
  private layouts: Map<string, GridLayout> = new Map();
  private presets: Map<string, LayoutPreset> = new Map();
  private templates: Map<string, WorkspaceTemplate> = new Map();
  private activeLayout?: GridLayout;
  private isInitialized = false;

  constructor() {
    this.initializeDefaultLayouts();
  }

  private initializeDefaultLayouts(): void {
    // 2x2 Grid
    const grid2x2: GridLayout = {
      id: 'grid-2x2',
      name: '2x2 Grid',
      description: 'Four equal quadrants',
      columns: 2,
      rows: 2,
      cells: [
        { id: 'cell-0-0', x: 0, y: 0, width: 1, height: 1, isOccupied: false, isResizable: true },
        { id: 'cell-0-1', x: 1, y: 0, width: 1, height: 1, isOccupied: false, isResizable: true },
        { id: 'cell-1-0', x: 0, y: 1, width: 1, height: 1, isOccupied: false, isResizable: true },
        { id: 'cell-1-1', x: 1, y: 1, width: 1, height: 1, isOccupied: false, isResizable: true },
      ],
      category: 'productivity',
      isDefault: true
    };

    // 3x3 Grid
    const grid3x3: GridLayout = {
      id: 'grid-3x3',
      name: '3x3 Grid',
      description: 'Nine equal cells',
      columns: 3,
      rows: 3,
      cells: Array.from({ length: 9 }, (_, i) => ({
        id: `cell-${Math.floor(i / 3)}-${i % 3}`,
        x: i % 3,
        y: Math.floor(i / 3),
        width: 1,
        height: 1,
        isOccupied: false,
        isResizable: true
      })),
      category: 'productivity'
    };

    // Development Layout (Code + Terminal + Browser)
    const devLayout: GridLayout = {
      id: 'dev-layout',
      name: 'Development',
      description: 'Code editor, terminal, and browser',
      columns: 3,
      rows: 2,
      cells: [
        { id: 'code', x: 0, y: 0, width: 2, height: 2, isOccupied: false, isResizable: true },
        { id: 'terminal', x: 2, y: 0, width: 1, height: 1, isOccupied: false, isResizable: true },
        { id: 'browser', x: 2, y: 1, width: 1, height: 1, isOccupied: false, isResizable: true },
      ],
      category: 'development'
    };

    // Design Layout (Canvas + Tools + Preview)
    const designLayout: GridLayout = {
      id: 'design-layout',
      name: 'Design',
      description: 'Canvas, tools, and preview',
      columns: 4,
      rows: 3,
      cells: [
        { id: 'canvas', x: 0, y: 0, width: 3, height: 3, isOccupied: false, isResizable: true },
        { id: 'tools', x: 3, y: 0, width: 1, height: 2, isOccupied: false, isResizable: true },
        { id: 'preview', x: 3, y: 2, width: 1, height: 1, isOccupied: false, isResizable: true },
      ],
      category: 'design'
    };

    // Entertainment Layout (Media + Chat + Controls)
    const entertainmentLayout: GridLayout = {
      id: 'entertainment-layout',
      name: 'Entertainment',
      description: 'Media player, chat, and controls',
      columns: 3,
      rows: 2,
      cells: [
        { id: 'media', x: 0, y: 0, width: 2, height: 2, isOccupied: false, isResizable: true },
        { id: 'chat', x: 2, y: 0, width: 1, height: 1, isOccupied: false, isResizable: true },
        { id: 'controls', x: 2, y: 1, width: 1, height: 1, isOccupied: false, isResizable: true },
      ],
      category: 'entertainment'
    };

    // Add layouts
    this.layouts.set(grid2x2.id, grid2x2);
    this.layouts.set(grid3x3.id, grid3x3);
    this.layouts.set(devLayout.id, devLayout);
    this.layouts.set(designLayout.id, designLayout);
    this.layouts.set(entertainmentLayout.id, entertainmentLayout);

    // Set default
    this.activeLayout = grid2x2;
  }

  // Layout Management
  getLayout(id: string): GridLayout | undefined {
    return this.layouts.get(id);
  }

  getAllLayouts(): GridLayout[] {
    return Array.from(this.layouts.values());
  }

  getLayoutsByCategory(category: string): GridLayout[] {
    return this.getAllLayouts().filter(layout => layout.category === category);
  }

  createCustomLayout(name: string, columns: number, rows: number, cells: GridCell[]): GridLayout {
    const id = `custom-${Date.now()}`;
    const layout: GridLayout = {
      id,
      name,
      description: `Custom ${columns}x${rows} layout`,
      columns,
      rows,
      cells,
      category: 'custom'
    };
    
    this.layouts.set(id, layout);
    return layout;
  }

  setActiveLayout(id: string): boolean {
    const layout = this.layouts.get(id);
    if (layout) {
      this.activeLayout = layout;
      return true;
    }
    return false;
  }

  getActiveLayout(): GridLayout | undefined {
    return this.activeLayout;
  }

  // Cell Management
  getAvailableCells(): GridCell[] {
    if (!this.activeLayout) return [];
    return this.activeLayout.cells.filter(cell => !cell.isOccupied);
  }

  assignWindowToCell(windowId: string, cellId: string): boolean {
    if (!this.activeLayout) return false;
    
    const cell = this.activeLayout.cells.find(c => c.id === cellId);
    if (cell && !cell.isOccupied) {
      cell.windowId = windowId;
      cell.isOccupied = true;
      return true;
    }
    return false;
  }

  removeWindowFromCell(windowId: string): boolean {
    if (!this.activeLayout) return false;
    
    const cell = this.activeLayout.cells.find(c => c.windowId === windowId);
    if (cell) {
      delete cell.windowId;
      cell.isOccupied = false;
      return true;
    }
    return false;
  }

  // Workspace Templates
  createWorkspaceTemplate(name: string, layoutId: string, defaultApps: string[]): WorkspaceTemplate {
    const layout = this.layouts.get(layoutId);
    if (!layout) throw new Error(`Layout ${layoutId} not found`);

    const template: WorkspaceTemplate = {
      id: `template-${Date.now()}`,
      name,
      description: `Workspace template for ${name}`,
      layout,
      defaultApps,
      autoArrange: true
    };

    this.templates.set(template.id, template);
    return template;
  }

  getWorkspaceTemplates(): WorkspaceTemplate[] {
    return Array.from(this.templates.values());
  }

  // Auto-arrangement
  autoArrangeWindows(windowIds: string[]): Map<string, GridCell> {
    const assignments = new Map<string, GridCell>();
    const availableCells = this.getAvailableCells();
    
    windowIds.forEach((windowId, index) => {
      if (index < availableCells.length) {
        const cell = availableCells[index];
        if (cell) {
          this.assignWindowToCell(windowId, cell.id);
          assignments.set(windowId, cell);
        }
      }
    });

    return assignments;
  }

  // Layout Presets
  createLayoutPreset(name: string, layouts: GridLayout[], description: string, tags: string[]): LayoutPreset {
    const preset: LayoutPreset = {
      id: `preset-${Date.now()}`,
      name,
      layouts,
      description,
      tags
    };

    this.presets.set(preset.id, preset);
    return preset;
  }

  getLayoutPresets(): LayoutPreset[] {
    return Array.from(this.presets.values());
  }

  // Utility Methods
  calculateCellBounds(cell: GridCell, containerWidth: number, containerHeight: number) {
    const cellWidth = (containerWidth / this.activeLayout!.columns) * cell.width;
    const cellHeight = (containerHeight / this.activeLayout!.rows) * cell.height;
    const cellX = (containerWidth / this.activeLayout!.columns) * cell.x;
    const cellY = (containerHeight / this.activeLayout!.rows) * cell.y;

    return {
      x: cellX,
      y: cellY,
      width: cellWidth,
      height: cellHeight
    };
  }

  // Performance
  initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
    console.log('Grid Layout Manager initialized');
  }

  // Persistence
  saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    const data = {
      layouts: Array.from(this.layouts.entries()),
      presets: Array.from(this.presets.entries()),
      templates: Array.from(this.templates.entries()),
      activeLayoutId: this.activeLayout?.id
    };
    
    localStorage.setItem('aibos-grid-layouts', JSON.stringify(data));
  }

  loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    const saved = localStorage.getItem('aibos-grid-layouts');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        // Restore data (simplified for now)
        if (data.activeLayoutId) {
          this.setActiveLayout(data.activeLayoutId);
        }
      } catch (error) {
        console.warn('Failed to load grid layouts from storage:', error);
      }
    }
  }
}

export const gridLayoutManager = new GridLayoutManager(); 