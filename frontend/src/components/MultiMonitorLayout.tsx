/** @jsxImportSource react */
import React, { useState, useEffect } from 'react';
import { monitorManager } from '../services/monitorManager.ts';
import { useUIState } from '../store/uiState.ts';
import { appRegistry } from '../services/appRegistry.ts';
import { getColor } from '../utils/themeHelpers.ts';

interface MonitorLayoutProps {
  isVisible: boolean;
  onClose: () => void;
}

export const MultiMonitorLayout: React.FC<MonitorLayoutProps> = ({ isVisible, onClose }) => {
  const [monitors, setMonitors] = useState<ReturnType<typeof monitorManager.getMonitors>>([]);
  const [selectedMonitor, setSelectedMonitor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renamingMonitor, setRenamingMonitor] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const { colorMode } = useUIState();
  const { openWindows } = useUIState();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Reset pan when zoom returns to 1
  useEffect(() => {
    if (zoom === 1 && (pan.x !== 0 || pan.y !== 0)) {
      setPan({ x: 0, y: 0 });
    }
  }, [zoom]);

  // Pan handlers
  const onPanStart = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (zoom <= 1) return;
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    e.preventDefault();
  };
  const onPanMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!dragging || !dragStart) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const onPanEnd = () => {
    setDragging(false);
    setDragStart(null);
  };

  // Async readiness and monitor subscription
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    monitorManager.ready().then(() => {
      if (!mounted) return;
      const current = monitorManager.getMonitors();
      setMonitors(current);
      setLoading(false);
      setError(current.length === 0 ? 'No monitors detected.' : null);
    });
    const handleMonitorsChanged = () => {
      const current = monitorManager.getMonitors();
      setMonitors(current);
      setError(current.length === 0 ? 'No monitors detected.' : null);
    };
    monitorManager.on('monitorsChanged', handleMonitorsChanged);
    return () => {
      mounted = false;
      monitorManager.off('monitorsChanged', handleMonitorsChanged);
    };
  }, []);

  if (!isVisible) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="text-white text-xl">Loading monitors...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-black/70 text-white rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-lg font-semibold mb-2">{error}</div>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-400"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const primaryMonitor = monitorManager.getPrimaryMonitor();
  const selectedMonitorInfo = selectedMonitor ? monitorManager.getMonitor(selectedMonitor) : null;

  // Clamp helper
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  // Real window reposition logic (stub if not present)
  const _moveWindowToMonitor = (windowId: string, monitorId: string) => {
    const monitor = monitorManager.getMonitor(monitorId);
    if (!monitor) {
      console.warn(`Monitor ${monitorId} no longer exists`);
      return;
    }
    // TODO: Integrate with real window manager
    // windowManager.moveWindow(windowId, monitor.bounds.x + 50, monitor.bounds.y + 50);
    monitorManager.assignWindowToMonitor(windowId, monitorId);
  };

  const distributeWindows = (monitorId: string) => {
    const monitor = monitorManager.getMonitor(monitorId);
    if (!monitor) {
      console.warn(`Monitor ${monitorId} no longer exists`);
      return;
    }
    openWindows.forEach((window: { id: string; component: string; position: { x: number; y: number } }) => {
      // TODO: Integrate with real window manager
      // windowManager.moveWindow(window.id, monitor.bounds.x + 50 + (index * 50), monitor.bounds.y + 50 + (index * 30));
      monitorManager.assignWindowToMonitor(window.id, monitorId);
    });
  };

  // Get windows assigned to a monitor
  const getWindowsForMonitor = (monitorId: string) => {
    return openWindows.filter((win: { id: string; component: string }) => {
      const assigned = monitorManager.getMonitorForWindow(win.id, false);
      return assigned && assigned.id === monitorId;
    });
  };

  // Handle rename (UI only, stub)
  const handleRename = (monitorId: string) => {
    setRenamingMonitor(monitorId);
    setRenameValue(monitorManager.getMonitorName(monitorId) || monitors.find(m => m.id === monitorId)?.name || '');
  };
  const handleRenameSubmit = (monitorId: string) => {
    monitorManager.setMonitorName(monitorId, renameValue);
    setRenamingMonitor(null);
    // Force UI update
    setMonitors(monitorManager.getMonitors());
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        className="w-4/5 h-4/5 max-w-6xl max-h-[800px] rounded-2xl p-6 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${getColor('glass.dark.40', colorMode)}, ${getColor('glass.dark.30', colorMode)})`,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${getColor('glass.dark.50', colorMode)}`,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Multi-Monitor Layout</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors focus:outline-none focus:ring focus:ring-blue-400"
            aria-label="Close monitor layout"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-6 h-full">
          {/* Monitor List */}
          <div className="w-1/3 space-y-4 overflow-y-auto pr-2">
            <h3 className="text-lg font-semibold text-white mb-4">Monitors</h3>
            {monitors.map((monitor) => {
              const windows = getWindowsForMonitor(monitor.id);
              return (
                <div key={monitor.id} className="mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      type="button"
                      className={`flex-1 text-left p-4 rounded-lg cursor-pointer transition-all focus:outline-none focus:ring focus:ring-blue-400 ${
                        selectedMonitor === monitor.id
                          ? 'bg-white/20 border border-white/30 ring-2 ring-blue-400'
                          : 'bg-white/10 hover:bg-white/15'
                      }`}
                      onClick={() => setSelectedMonitor(monitor.id)}
                      tabIndex={0}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-white">
                          {monitor.isPrimary ? '🖥️ Primary' : '🖥️ Monitor'} {monitor.id}
                        </span>
                        {monitor.isPrimary && (
                          <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-white/70 space-y-1">
                        <div>Resolution: {monitor.bounds.width} × {monitor.bounds.height}</div>
                        <div>Position: ({monitor.bounds.x}, {monitor.bounds.y})</div>
                        <div>Scale: {monitor.scaleFactor}x</div>
                        <div>Orientation: {monitor.orientation}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-white/60">{monitor.name || 'Unnamed'}</span>
                          <button
                            type="button"
                            className="text-xs text-blue-300 underline hover:text-blue-400 focus:outline-none"
                            onClick={e => { e.stopPropagation(); handleRename(monitor.id); }}
                          >Rename</button>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => monitorManager.setPrimaryMonitor(monitor.id)}
                      disabled={monitor.isPrimary}
                      className={`ml-2 px-2 py-1 rounded text-xs focus:outline-none focus:ring focus:ring-yellow-400 ${
                        monitor.isPrimary
                          ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                          : 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
                      }`}
                    >
                      {monitor.isPrimary ? 'Primary' : 'Set as Primary'}
                    </button>
                  </div>
                  {/* Rename input */}
                  {renamingMonitor === monitor.id && (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        className="px-2 py-1 rounded bg-white/10 text-white border border-white/20 focus:outline-none focus:ring focus:ring-blue-400"
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                      />
                      <button
                        type="button"
                        className="px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 focus:outline-none"
                        onClick={() => handleRenameSubmit(monitor.id)}
                      >Save</button>
                      <button
                        type="button"
                        className="px-2 py-1 text-xs bg-gray-500/20 text-gray-300 rounded hover:bg-gray-500/30 focus:outline-none"
                        onClick={() => setRenamingMonitor(null)}
                      >Cancel</button>
                    </div>
                  )}
                  {/* Window thumbnails */}
                  {windows.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {windows.map((win: { id: string; component: string; position: { x: number; y: number } }) => {
                        const app = appRegistry.get(win.component);
                        return (
                          <div key={win.id} className="flex items-center gap-2 bg-white/10 rounded px-2 py-1 text-xs text-white/80">
                            <span>{app?.icon || '🪟'}</span>
                            <span className="truncate" title={app?.title || win.id}>{app?.title || win.id}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      distributeWindows(monitor.id);
                    }}
                    className="mt-3 w-full px-3 py-1 text-sm bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 transition-colors focus:outline-none focus:ring focus:ring-blue-400"
                  >
                    Distribute Windows
                  </button>
                </div>
              );
            })}
          </div>

          {/* Monitor Details */}
          <div className="flex-1">
            {selectedMonitorInfo ? (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">
                  Monitor Details: {selectedMonitorInfo.id}
                </h3>
                {/* Zoom slider */}
                <div className="flex items-center gap-4 mb-2">
                  <label htmlFor="zoom-slider" className="text-white/70 text-sm">Zoom:</label>
                  <input
                    id="zoom-slider"
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.05}
                    value={zoom}
                    onChange={e => setZoom(Number(e.target.value))}
                    className="w-40 accent-blue-400"
                  />
                  <span className="text-white/70 text-xs">{Math.round(zoom * 100)}%</span>
                </div>
                {/* Monitor Visualization with pan/zoom */}
                <div className="bg-black/20 rounded-lg p-4 flex flex-col items-center justify-center select-none">
                  <div className="text-white/70 text-sm mb-2">Monitor Layout</div>
                  <div
                    className={`relative border-2 border-white/30 rounded origin-top-left ${zoom > 1 ? 'cursor-grab' : ''} ${dragging ? 'cursor-grabbing' : ''}`}
                    style={{
                      width: '100%',
                      height: '200px',
                      background: 'linear-gradient(45deg, #1a1a1a 25%, transparent 25%), linear-gradient(-45deg, #1a1a1a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a1a 75%), linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)',
                      backgroundSize: '20px 20px',
                      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transition: dragging ? 'none' : 'transform 0.2s',
                      margin: '0 auto',
                    }}
                    onMouseDown={onPanStart}
                    onMouseMove={onPanMove}
                    onMouseUp={onPanEnd}
                    onMouseLeave={onPanEnd}
                  >
                    {/* Show monitor bounds relative to primary, clamped */}
                    <div
                      className="absolute border-2 border-blue-400 bg-blue-500/20"
                      style={{
                        left: `${clamp(((selectedMonitorInfo.bounds.x - primaryMonitor.bounds.x) / primaryMonitor.bounds.width) * 100, 0, 100)}%`,
                        top: `${clamp(((selectedMonitorInfo.bounds.y - primaryMonitor.bounds.y) / primaryMonitor.bounds.height) * 100, 0, 100)}%`,
                        width: `${clamp((selectedMonitorInfo.bounds.width / primaryMonitor.bounds.width) * 100, 5, 100)}%`,
                        height: `${clamp((selectedMonitorInfo.bounds.height / primaryMonitor.bounds.height) * 100, 5, 100)}%`,
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center text-blue-300 text-xs font-medium">
                        {selectedMonitorInfo.id}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Window thumbnails for selected monitor */}
                {getWindowsForMonitor(selectedMonitorInfo.id).length > 0 && (
                  <div className="bg-black/20 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Windows on this Monitor</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {getWindowsForMonitor(selectedMonitorInfo.id).map((win: { id: string; component: string; position: { x: number; y: number } }) => {
                        const app = appRegistry.get(win.component);
                        return (
                          <div key={win.id} className="flex items-center gap-2 bg-white/10 rounded px-2 py-1 text-xs text-white/80">
                            <span>{app?.icon || '🪟'}</span>
                            <span className="truncate" title={app?.title || win.id}>{app?.title || win.id}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Window Management */}
                <div className="bg-black/20 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Window Management</h4>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        openWindows.forEach((window: { id: string; position: { x: number; y: number } }) => {
                          const windowElement = document.getElementById(`window-${window.id}`);
                          if (windowElement) {
                            windowElement.style.transform = `translate(${window.position.x}px, ${window.position.y}px)`;
                          }
                        });
                      }}
                      className="w-full px-4 py-2 bg-green-500/20 text-green-300 rounded hover:bg-green-500/30 transition-colors focus:outline-none focus:ring focus:ring-green-400"
                    >
                      Move All Windows Here
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // This would open a new window on the selected monitor
                        // TODO: Integrate with appRegistry or windowManager
                        console.log(`Opening new window on monitor ${selectedMonitorInfo.id}`);
                      }}
                      className="w-full px-4 py-2 bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 transition-colors focus:outline-none focus:ring focus:ring-blue-400"
                    >
                      Open New Window Here
                    </button>
                  </div>
                </div>
                {/* Monitor Settings */}
                <div className="bg-black/20 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Monitor Settings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">Primary Monitor</span>
                      <button
                        type="button"
                        onClick={() => monitorManager.setPrimaryMonitor(selectedMonitorInfo.id)}
                        disabled={selectedMonitorInfo.isPrimary}
                        className={`px-3 py-1 rounded text-sm focus:outline-none focus:ring focus:ring-yellow-400 ${
                          selectedMonitorInfo.isPrimary
                            ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                            : 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
                        }`}
                      >
                        {selectedMonitorInfo.isPrimary ? 'Current Primary' : 'Set as Primary'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">Scale Factor</span>
                      <span className="text-white">{selectedMonitorInfo.scaleFactor}x</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">Orientation</span>
                      <span className="text-white">{selectedMonitorInfo.orientation}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-white/50 text-center">
                  <div className="text-4xl mb-4">🖥️</div>
                  <div>Select a monitor to view details</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiMonitorLayout; 