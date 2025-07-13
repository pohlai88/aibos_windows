import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { contextMenuService as _contextMenuService } from '../services/contextMenuService.ts';

// Enhanced type definitions
interface BaseItem {
  id: string;
  name: string;
  icon: string;
  path: string;
}

interface FolderItem extends BaseItem {
  type: 'folder';
  modified: string;
  isDirectory: true;
}

interface FileEntry extends BaseItem {
  type: 'file';
  size: string;
  modified: string;
  isDirectory: false;
  extension: string;
}

type FileItem = FolderItem | FileEntry;

interface ContextMenuProps {
  x: number;
  y: number;
  item: FileItem;
  onClose: () => void;
  onAction: (action: string, item: FileItem) => void;
}

// Enhanced Context Menu Component
const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, item, onClose, onAction }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const menuItems = [
    { id: 'open', label: 'Open', icon: '▶️', shortcut: 'Enter' },
    { id: 'openWith', label: 'Open with...', icon: '🔧', submenu: true },
    { id: 'separator1', type: 'separator' },
    { id: 'cut', label: 'Cut', icon: '✂️', shortcut: 'Ctrl+X' },
    { id: 'copy', label: 'Copy', icon: '📋', shortcut: 'Ctrl+C' },
    { id: 'paste', label: 'Paste', icon: '📄', shortcut: 'Ctrl+V' },
    { id: 'separator2', type: 'separator' },
    { id: 'rename', label: 'Rename', icon: '✏️', shortcut: 'F2' },
    { id: 'delete', label: 'Delete', icon: '🗑️', shortcut: 'Del', danger: true },
    { id: 'separator3', type: 'separator' },
    { id: 'properties', label: 'Properties', icon: 'ℹ️', shortcut: 'Alt+Enter' }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex(prev => {
            const nextIndex = prev + 1;
            const nextItem = menuItems[nextIndex];
            return nextItem?.type === 'separator' ? nextIndex + 1 : nextIndex;
          });
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex(prev => {
            const prevIndex = prev - 1;
            const prevItem = menuItems[prevIndex];
            return prevItem?.type === 'separator' ? prevIndex - 1 : prevIndex;
          });
          break;
        case 'Enter': {
          event.preventDefault();
          const selectedItem = menuItems[focusedIndex];
          if (selectedItem && selectedItem.type !== 'separator') {
            handleAction(selectedItem.id);
          }
          break;
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    
    // Focus the menu for keyboard navigation
    menuRef.current?.focus();
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, focusedIndex]);

  const handleAction = (action: string) => {
    onAction(action, item);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-2 min-w-56 focus:outline-none"
      style={{ left: x, top: y }}
      tabIndex={-1}
      role="menu"
      aria-label="File context menu"
    >
      {menuItems.map((menuItem, index) => {
        if (menuItem.type === 'separator') {
          return (
            <hr key={menuItem.id} className="my-1 border-gray-200 dark:border-gray-700" />
          );
        }

        const isFocused = index === focusedIndex;
        const isDanger = menuItem.danger;

        return (
          <button
            key={menuItem.id}
            type="button"
            className={`
              w-full text-left px-4 py-2 transition-all duration-150 flex items-center justify-between
              file-item-focus-enhanced
              ${isFocused 
                ? 'bg-blue-500/10 ring-2 ring-blue-500/50 dark:bg-blue-400/10' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }
              ${isDanger 
                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' 
                : 'text-gray-700 dark:text-gray-200'
              }
            `}
            onClick={() => handleAction(menuItem.id)}
            role="menuitem"
            aria-label={`${menuItem.label} ${menuItem.shortcut ? `(${menuItem.shortcut})` : ''}`}
          >
            <div className="flex items-center">
              <span className="mr-3 text-base">{menuItem.icon}</span>
              <span className="font-medium">{menuItem.label}</span>
              {menuItem.submenu && <span className="ml-2 text-xs">▶</span>}
            </div>
            {menuItem.shortcut && (
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-4">
                {menuItem.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export const Files: React.FC = memo(() => {
  // Enhanced state management
  const [pathParts, setPathParts] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: FileItem;
  } | null>(null);
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkOperationProgress, _setBulkOperationProgress] = useState<{
    isActive: boolean;
    completed: number;
    total: number;
    operation: string;
  }>({ isActive: false, completed: 0, total: 0, operation: '' });

  const containerRef = useRef<HTMLDivElement>(null);
  const apiUrl = import.meta.env.VITE_API_URL;

  // Enhanced file fetching with error handling
  const fetchFiles = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${apiUrl}/api/files?path=${encodeURIComponent(path)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const enhancedFiles = data.files?.map((file: unknown) => {
        if (typeof file === 'object' && file !== null && 'name' in file && 'type' in file) {
          const fileObj = file as { name: string; type: string };
          return {
            ...fileObj,
            path: `${path}/${fileObj.name}`.replace(/\/+/g, '/'),
            isDirectory: fileObj.type === 'folder'
          };
        }
        return null;
      }).filter(Boolean) || [];
      
      setFileItems(enhancedFiles);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch files');
      setFileItems(getStaticFileItems());
    } finally {
      setLoading(false);
    }
  }, []);

  // Static fallback data
  const getStaticFileItems = (): FileItem[] => {
    if (pathParts.length === 0) {
      return [
        { 
          id: '1', 
          name: 'Documents', 
          type: 'folder', 
          modified: '2024-01-15', 
          icon: '📁', 
          path: '/Documents',
          isDirectory: true 
        },
        { 
          id: '2', 
          name: 'Pictures', 
          type: 'folder', 
          modified: '2024-01-14', 
          icon: '📁', 
          path: '/Pictures',
          isDirectory: true 
        },
        { 
          id: '3', 
          name: 'sample.aibos', 
          type: 'file', 
          size: '2.3 KB', 
          modified: '2024-01-10', 
          icon: '🤖', 
          path: '/sample.aibos',
          isDirectory: false,
          extension: '.aibos'
        },
        { 
          id: '4', 
          name: 'workspace.aiws', 
          type: 'file', 
          size: '1.1 KB', 
          modified: '2024-01-09', 
          icon: '🏢', 
          path: '/workspace.aiws',
          isDirectory: false,
          extension: '.aiws'
        }
      ];
    }
    return [];
  };

  // Enhanced keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (fileItems.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < fileItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : fileItems.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < fileItems.length) {
          const item = fileItems[focusedIndex];
          if (item) {
            handleItemDoubleClick(item);
          }
        }
        break;
      case 'Delete':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < fileItems.length) {
          const item = fileItems[focusedIndex];
          if (item) {
            handleContextMenuAction('delete', item);
          }
        }
        break;
      case 'F2':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < fileItems.length) {
          const item = fileItems[focusedIndex];
          if (item) {
            handleContextMenuAction('rename', item);
          }
        }
        break;
      case 'Escape':
        setContextMenu(null);
        setSelectedItems(new Set());
        break;
      case 'a':
        if (e.ctrlKey) {
          e.preventDefault();
          setSelectedItems(new Set(fileItems.map(item => item.id)));
        }
        break;
    }
  }, [fileItems, focusedIndex]);

  // Enhanced item interaction handlers
  const handleItemClick = useCallback((_item: FileItem, index: number) => {
    setFocusedIndex(index);
  }, []);

  const handleItemDoubleClick = useCallback((item: FileItem) => {
    if (item.type === 'folder') {
      setPathParts([...pathParts, item.name]);
    } else {
      // Use system integration for file opening
      if (item.type === 'file') {
        // TODO: Implement file opening with system integration
        console.log('Opening file:', item.path);
      }
    }
  }, [pathParts]);

  const handleContextMenu = useCallback((e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  }, []);

  // Enhanced context menu actions with system integration
  const handleContextMenuAction = useCallback((action: string, item: FileItem) => {
    try {
      switch (action) {
        case 'open':
          handleItemDoubleClick(item);
          break;
        case 'openWith': {
          // TODO: Implement open with functionality
          console.log('Open with for:', item.path);
          break;
        }
        case 'cut': {
          // TODO: Implement cut functionality
          console.log('Cut:', item.path);
          break;
        }
        case 'copy': {
          // TODO: Implement copy functionality
          console.log('Copy:', item.path);
          break;
        }
        case 'paste': {
          // TODO: Implement paste functionality
          console.log('Paste to:', pathParts.join('/'));
          fetchFiles(pathParts.join('/'));
          break;
        }
        case 'rename': {
          const newName = prompt('Enter new name:', item.name);
          if (newName && newName.trim() && newName !== item.name) {
            // TODO: Implement rename functionality
            console.log('Rename:', item.path, 'to', newName);
            fetchFiles(pathParts.join('/'));
          }
          break;
        }
        case 'delete': {
          if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
            // TODO: Implement delete functionality
            console.log('Delete:', item.path);
            fetchFiles(pathParts.join('/'));
          }
          break;
        }
        case 'properties': {
          // TODO: Implement properties functionality
          console.log('Show properties for:', item.path);
          break;
        }
      }
    } catch (err) {
      console.error(`Error in ${action}:`, err);
      alert(`Failed to ${action} "${item.name}". Please try again.`);
    }
  }, [pathParts, fetchFiles]);

  // Load files when path changes
  useEffect(() => {
    const currentPath = pathParts.join('/');
    fetchFiles(currentPath);
  }, [pathParts, fetchFiles]);

  // Reset focus when path changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [pathParts]);

  const goBack = useCallback(() => {
    if (pathParts.length > 0) {
      setPathParts(pathParts.slice(0, -1));
    }
  }, [pathParts]);

  const navigateToPath = useCallback((index: number) => {
    setPathParts(pathParts.slice(0, index + 1));
  }, [pathParts]);

  return (
    <div 
      ref={containerRef}
      className="p-4 bg-white text-gray-800 h-full dark:bg-gray-800 dark:text-gray-200 flex flex-col focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="application"
      aria-label="File Explorer"
    >
      {/* Enhanced Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center">
          <span className="mr-2">📁</span>
          AI-BOS File Explorer
        </h2>
        <div className="flex space-x-2">
          <button
            type="button"
            className="file-item-focus-enhanced px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-all duration-200 text-sm"
            onClick={() => {
              const folderName = prompt('Enter folder name:');
              if (folderName && folderName.trim()) {
                try {
                  // TODO: Implement create folder functionality
                  console.log('Create folder:', folderName, 'in', pathParts.join('/'));
                  fetchFiles(pathParts.join('/'));
                } catch (err) {
                  console.error('Error creating folder:', err);
                  alert('Failed to create folder. Please try again.');
                }
              }
            }}
          >
            New Folder
          </button>
        </div>
      </div>

      {/* Enhanced Breadcrumb */}
      <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">
        <div className="flex items-center">
          <button
            type="button"
            className={`file-item-focus-enhanced text-blue-500 hover:text-blue-700 dark:text-blue-400 transition-colors mr-3 ${
              pathParts.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:underline'
            }`}
            onClick={goBack}
            disabled={pathParts.length === 0}
            aria-label="Go back"
          >
            ← Back
          </button>
          <span className="text-gray-600 dark:text-gray-300">
            🏠 Home
            {pathParts.map((part, idx) => (
              <span key={idx}>
                <span className="mx-1">/</span>
                <button
                  type="button"
                  onClick={() => navigateToPath(idx)}
                  className="file-item-focus-enhanced text-blue-500 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
                >
                  {part}
                </button>
              </span>
            ))}
          </span>
        </div>
      </div>

      {/* Enhanced File List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-4 animate-spin">⏳</div>
            <div className="text-lg font-medium mb-2">Loading...</div>
            <div className="text-sm">Fetching files from server</div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-red-500 dark:text-red-400">
            <div className="text-4xl mb-4">⚠️</div>
            <div className="text-lg font-medium mb-2">Error Loading Files</div>
            <div className="text-sm text-center max-w-md">{error}</div>
            <button
              type="button"
              className="file-item-focus-enhanced mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              onClick={() => fetchFiles(pathParts.join('/'))}
            >
              Retry
            </button>
          </div>
        ) : fileItems.length > 0 ? (
          <div className="space-y-1" role="grid" aria-label="File list">
            {fileItems.map((item, index) => (
              <div
                key={item.id}
                className={`
                  file-item-focus-enhanced
                  flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200
                  hover:bg-white/10 dark:hover:bg-gray-700/50
                  ${selectedItems.has(item.id) ? 'bg-blue-500/20 ring-2 ring-blue-500/50' : ''}
                  ${focusedIndex === index ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}
                `}
                data-file-item
                data-file-path={item.path}
                data-file-name={item.name}
                data-is-directory={item.isDirectory}
                tabIndex={0}
                onClick={() => handleItemClick(item, index)}
                onDoubleClick={() => handleItemDoubleClick(item)}
                onContextMenu={(e) => handleContextMenu(e, item)}
                onFocus={() => setFocusedIndex(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleItemDoubleClick(item);
                  }
                }}
                role="gridcell"
                aria-label={`${item.type === 'folder' ? 'Folder' : 'File'}: ${item.name}`}
                aria-selected={selectedItems.has(item.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    const newSelected = new Set(selectedItems);
                    if (newSelected.has(item.id)) {
                      newSelected.delete(item.id);
                    } else {
                      newSelected.add(item.id);
                    }
                    setSelectedItems(newSelected);
                  }}
                  className="mr-3 file-item-focus-enhanced"
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select ${item.name}`}
                />
                <span className="text-2xl mr-3">{item.icon}</span>
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {item.type === 'file' && `${item.size} • `}
                    {item.modified}
                  </div>
                </div>
                {item.type === 'file' && item.extension && (
                  <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                    {item.extension}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-6xl mb-4">📁</div>
            <div className="text-lg font-medium mb-2">This folder is empty</div>
            <div className="text-sm">No files or folders found in this location</div>
          </div>
        )}
      </div>

      {/* Enhanced Status Bar */}
      <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300">
        <div className="flex justify-between items-center">
          <div>
            {loading ? (
              <span className="text-blue-600 dark:text-blue-400">⏳ Loading files...</span>
            ) : error ? (
              <span className="text-red-600 dark:text-red-400">⚠️ {error}</span>
            ) : (
              <>
                {selectedItems.size > 0 
                  ? `${selectedItems.size} item(s) selected`
                  : `${fileItems.length} item${fileItems.length !== 1 ? 's' : ''}`
                }
              </>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {focusedIndex >= 0 && (
              <span>Press Enter to open • F2 to rename • Del to delete</span>
            )}
          </div>
        </div>
        {bulkOperationProgress.isActive && (
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1">
              <span>{bulkOperationProgress.operation}</span>
              <span>{bulkOperationProgress.completed}/{bulkOperationProgress.total}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(bulkOperationProgress.completed / bulkOperationProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          onClose={() => setContextMenu(null)}
          onAction={handleContextMenuAction}
        />
      )}
    </div>
  );
});

Files.displayName = 'Files';