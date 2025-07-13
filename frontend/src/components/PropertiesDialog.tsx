/** @jsxImportSource react */
import React, { memo, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getColor, getGradient } from '../utils/themeHelpers.ts';
import { blur, elevation, animation } from '../utils/designTokens.ts';
import { useUIState } from '../store/uiState.ts';

// Updated to match Files.tsx interface
interface BaseItem {
  id: string;
  name: string;
  icon: string;
}

interface FolderItem extends BaseItem {
  type: 'folder';
  modified: string;
  itemCount?: number;
}

interface FileEntry extends BaseItem {
  type: 'file';
  size: string;
  modified: string;
  extension?: string;
}

type FileItem = FolderItem | FileEntry;

export interface PropertiesDialogProps {
  isVisible: boolean;
  item: FileItem | null;
  onClose: () => void;
  onRename?: (newName: string) => void;
  onDelete?: () => void;
}

// Utility functions
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return isNaN(date.getTime())
    ? 'Unknown'
    : date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
};

const formatFileSize = (size: string): string => {
  // Convert size string to bytes and format nicely
  const sizeMap: Record<string, number> = {
    '1 KB': 1024,
    '1 MB': 1024 * 1024,
    '1 GB': 1024 * 1024 * 1024,
  };
  
  const bytes = sizeMap[size] || parseInt(size) || 0;
  
  if (bytes === 0) return size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const getFileExtension = (filename: string): string => {
  return filename.includes('.') 
    ? filename.split('.').pop()?.toUpperCase() || 'None'
    : 'None';
};

const getFileType = (item: FileItem): string => {
  if (item.type === 'folder') return 'File Folder';
  const extension = getFileExtension(item.name);
  return extension !== 'None' ? `${extension} File` : 'File';
};

const getMimeType = (item: FileItem): string => {
  if (item.type === 'folder') return 'inode/directory';
  const extension = item.name.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'txt': 'text/plain',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'mp3': 'audio/mpeg',
    'mp4': 'video/mp4',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
  };
  return mimeTypes[extension || ''] || 'application/octet-stream';
};

export const PropertiesDialog: React.FC<PropertiesDialogProps> = memo(({ 
  isVisible, 
  item, 
  onClose,
  onRename,
  onDelete
}) => {
  const { colorMode } = useUIState();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'details'>('general');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Performance: Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => 
    typeof window !== 'undefined' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches, 
    []
  );

  // Performance: Memoized theme-aware styles
  const dialogStyles = useMemo(() => ({
    backdrop: {
      backgroundColor: getColor('glass.dark.50', colorMode),
      backdropFilter: `blur(${blur.sm})`,
    },
    container: {
      backgroundColor: getColor('glass.light.90', colorMode),
      border: `1px solid ${getColor('glass.light.60', colorMode)}`,
      boxShadow: elevation['2xl'],
    },
    header: {
      background: getGradient('professional.slate', colorMode),
      borderBottom: `1px solid ${getColor('glass.light.40', colorMode)}`,
    },
    tab: (isActive: boolean) => ({
      color: isActive 
        ? getColor('primary.600', colorMode) 
        : getColor('gray.600', colorMode),
      borderBottom: isActive 
        ? `2px solid ${getColor('primary.600', colorMode)}` 
        : '2px solid transparent',
      transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
    }),
    content: {
      backgroundColor: getColor('glass.light.90', colorMode),
    },
    footer: {
      backgroundColor: getColor('gray.50', colorMode),
      borderTop: `1px solid ${getColor('gray.200', colorMode)}`,
    },
    input: {
      backgroundColor: 'transparent',
      borderBottom: `2px solid ${getColor('primary.500', colorMode)}`,
      color: getColor('gray.900', colorMode),
      outline: 'none',
    },
    button: {
      primary: {
        backgroundColor: getColor('primary.500', colorMode),
        color: getColor('white', colorMode),
        transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
      },
      secondary: {
        backgroundColor: getColor('gray.500', colorMode),
        color: getColor('white', colorMode),
        transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
      },
      danger: {
        backgroundColor: getColor('error.500', colorMode),
        color: getColor('white', colorMode),
        transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
      },
    },
    transition: prefersReducedMotion 
      ? { duration: 0 }
      : { type: "spring", stiffness: 300, damping: 30 },
  }), [colorMode, prefersReducedMotion]);

  // Memoized computed values
  const fileExtension = useMemo(() => 
    item ? getFileExtension(item.name) : 'None', 
    [item]
  );

  const fileType = useMemo(() => 
    item ? getFileType(item) : '', 
    [item]
  );

  const mimeType = useMemo(() => 
    item ? getMimeType(item) : '', 
    [item]
  );

  useEffect(() => {
    if (item) {
      setEditName(item.name);
    }
  }, [item]);

  // Focus trap for accessibility
  useEffect(() => {
    if (!isVisible || !dialogRef.current) return;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll(
          'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isVisible]);

  const handleRename = useCallback(() => {
    if (editName.trim() && editName !== item?.name && onRename) {
      onRename(editName.trim());
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
    setIsEditing(false);
  }, [editName, item, onRename]);

  const handleDelete = useCallback(async () => {
    if (onDelete) {
      setIsDeleting(true);
      try {
        await onDelete();
        onClose();
      } catch (error) {
        console.error('Failed to delete item:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  }, [onDelete, onClose]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleRename();
    } else if (event.key === 'Escape') {
      setIsEditing(false);
      setEditName(item?.name || '');
    }
  }, [handleRename, item]);

  const handleTabChange = useCallback((tab: 'general' | 'security' | 'details') => {
    setActiveTab(tab);
  }, []);

  if (!isVisible || !item) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={dialogStyles.transition}
        style={dialogStyles.backdrop}
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        <motion.div
          ref={dialogRef}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={dialogStyles.transition}
          style={dialogStyles.container}
          className="rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div 
            style={dialogStyles.header}
            className="flex items-center justify-between p-6"
          >
            <div className="flex items-center space-x-4">
              <span className="text-5xl" aria-hidden="true">{item.icon}</span>
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleRename}
                    style={dialogStyles.input}
                    className="text-xl font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                    aria-label="Edit file name"
                  />
                ) : (
                  <h3 
                    id="dialog-title"
                    className="text-xl font-semibold"
                    style={{ color: getColor('gray.900', colorMode) }}
                  >
                    {item.name}
                  </h3>
                )}
                <p 
                  className="text-sm mt-1"
                  style={{ color: getColor('gray.600', colorMode) }}
                >
                  {fileType}
                </p>
                {showSuccess && (
                  <p 
                    className="text-sm mt-1"
                    style={{ color: getColor('success.600', colorMode) }}
                  >
                    ✓ Renamed successfully
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-2 transition-colors rounded-lg hover:bg-opacity-20"
                style={{ 
                  color: getColor('gray.500', colorMode),
                  backgroundColor: getColor('glass.light.10', colorMode),
                }}
                aria-label="Rename file"
                title="Rename"
              >
                ✏️
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 transition-colors rounded-lg hover:bg-opacity-20"
                style={{ 
                  color: getColor('gray.500', colorMode),
                  backgroundColor: getColor('glass.light.10', colorMode),
                }}
                aria-label="Close dialog"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b" style={{ borderColor: getColor('gray.200', colorMode) }}>
            {(['general', 'security', 'details'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabChange(tab)}
                style={dialogStyles.tab(activeTab === tab)}
                className="flex-1 px-4 py-3 text-sm font-medium hover:bg-opacity-10"
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Content */}
          <div 
            style={dialogStyles.content}
            className="p-6 max-h-96 overflow-y-auto"
            id="dialog-description"
          >
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b" style={{ borderColor: getColor('gray.100', colorMode) }}>
                      <span style={{ color: getColor('gray.600', colorMode) }}>Type:</span>
                      <span style={{ color: getColor('gray.900', colorMode) }} className="font-medium">{fileType}</span>
                    </div>

                    {item.type === 'file' && item.size && (
                      <div className="flex justify-between py-2 border-b" style={{ borderColor: getColor('gray.100', colorMode) }}>
                        <span style={{ color: getColor('gray.600', colorMode) }}>Size:</span>
                        <span style={{ color: getColor('gray.900', colorMode) }} className="font-medium">{formatFileSize(item.size)}</span>
                      </div>
                    )}

                    {item.type === 'folder' && item.itemCount !== undefined && (
                      <div className="flex justify-between py-2 border-b" style={{ borderColor: getColor('gray.100', colorMode) }}>
                        <span style={{ color: getColor('gray.600', colorMode) }}>Items:</span>
                        <span style={{ color: getColor('gray.900', colorMode) }} className="font-medium">{item.itemCount} items</span>
                      </div>
                    )}

                    <div className="flex justify-between py-2 border-b" style={{ borderColor: getColor('gray.100', colorMode) }}>
                      <span style={{ color: getColor('gray.600', colorMode) }}>Modified:</span>
                      <span style={{ color: getColor('gray.900', colorMode) }} className="font-medium">{formatDate(item.modified)}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b" style={{ borderColor: getColor('gray.100', colorMode) }}>
                      <span style={{ color: getColor('gray.600', colorMode) }}>Location:</span>
                      <span style={{ color: getColor('gray.900', colorMode) }} className="font-medium">/Program Files</span>
                    </div>

                    <div className="flex justify-between py-2 border-b" style={{ borderColor: getColor('gray.100', colorMode) }}>
                      <span style={{ color: getColor('gray.600', colorMode) }}>Attributes:</span>
                      <span style={{ color: getColor('gray.900', colorMode) }} className="font-medium">
                        {item.type === 'folder' ? 'Directory' : 'Archive'}
                      </span>
                    </div>

                    {item.type === 'file' && (
                      <div className="flex justify-between py-2 border-b" style={{ borderColor: getColor('gray.100', colorMode) }}>
                        <span style={{ color: getColor('gray.600', colorMode) }}>Extension:</span>
                        <span style={{ color: getColor('gray.900', colorMode) }} className="font-medium">
                          {fileExtension}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between py-2 border-b" style={{ borderColor: getColor('gray.100', colorMode) }}>
                      <span style={{ color: getColor('gray.600', colorMode) }}>Status:</span>
                      <span style={{ color: getColor('success.600', colorMode) }} className="font-medium">✓ Available</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-4">
                <div 
                  className="rounded-lg p-4"
                  style={{ backgroundColor: getColor('info.50', colorMode) }}
                >
                  <h4 className="font-medium mb-2" style={{ color: getColor('info.900', colorMode) }}>Permissions</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span style={{ color: getColor('info.700', colorMode) }}>Owner:</span>
                      <span style={{ color: getColor('info.900', colorMode) }} className="font-medium">Administrator</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: getColor('info.700', colorMode) }}>Group:</span>
                      <span style={{ color: getColor('info.900', colorMode) }} className="font-medium">Users</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: getColor('info.700', colorMode) }}>Permissions:</span>
                      <span style={{ color: getColor('info.900', colorMode) }} className="font-medium">Read & Write</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium" style={{ color: getColor('gray.900', colorMode) }}>Access Control</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm" style={{ color: getColor('gray.700', colorMode) }}>Read</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm" style={{ color: getColor('gray.700', colorMode) }}>Write</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm" style={{ color: getColor('gray.700', colorMode) }}>Execute</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b" style={{ borderColor: getColor('gray.100', colorMode) }}>
                    <span style={{ color: getColor('gray.600', colorMode) }}>MIME Type:</span>
                    <span style={{ color: getColor('gray.900', colorMode) }} className="font-medium font-mono text-sm">{mimeType}</span>
                  </div>

                  <div className="flex justify-between py-2 border-b" style={{ borderColor: getColor('gray.100', colorMode) }}>
                    <span style={{ color: getColor('gray.600', colorMode) }}>File ID:</span>
                    <span style={{ color: getColor('gray.900', colorMode) }} className="font-medium font-mono text-sm">{item.id}</span>
                  </div>

                  <div className="flex justify-between py-2 border-b" style={{ borderColor: getColor('gray.100', colorMode) }}>
                    <span style={{ color: getColor('gray.600', colorMode) }}>Encoding:</span>
                    <span style={{ color: getColor('gray.900', colorMode) }} className="font-medium">UTF-8</span>
                  </div>

                  <div className="flex justify-between py-2 border-b" style={{ borderColor: getColor('gray.100', colorMode) }}>
                    <span style={{ color: getColor('gray.600', colorMode) }}>Compression:</span>
                    <span style={{ color: getColor('gray.900', colorMode) }} className="font-medium">None</span>
                  </div>
                </div>

                <div 
                  className="rounded-lg p-4"
                  style={{ backgroundColor: getColor('gray.50', colorMode) }}
                >
                  <h4 className="font-medium mb-2" style={{ color: getColor('gray.900', colorMode) }}>File Hash</h4>
                  <div className="font-mono text-xs break-all" style={{ color: getColor('gray.600', colorMode) }}>
                    SHA256: a1b2c3d4e5f6...
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div 
            style={dialogStyles.footer}
            className="flex justify-between items-center p-6"
          >
            <div className="flex space-x-2">
              {onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  style={dialogStyles.button.danger}
                  className="px-4 py-2 rounded-lg hover:bg-opacity-80 disabled:opacity-50 flex items-center space-x-2"
                >
                  {isDeleting ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <span aria-hidden="true">🗑️</span>
                      <span>Delete</span>
                    </>
                  )}
                </button>
              )}
            </div>
            
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                style={dialogStyles.button.secondary}
                className="px-6 py-2 rounded-lg hover:bg-opacity-80"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

PropertiesDialog.displayName = 'PropertiesDialog'; 