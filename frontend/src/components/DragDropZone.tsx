import React, { useState, useRef, useCallback, useEffect } from 'react';
import { audioManager } from '../utils/audio.ts';
import { hapticManager } from '../utils/haptics.ts';

// Enhanced TypeScript types for File System Access API
interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
}

interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file';
  getFile(): Promise<File>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory';
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
}

interface DragDropZoneProps {
  onFilesDropped: (files: File[]) => void;
  onDirectoryDropped?: (entries: Array<{ name: string; kind: 'file' | 'directory'; handle: FileSystemHandle }>) => void;
  onError?: (error: Error, context?: string) => void;
  onProgress?: (completed: number, total: number, bytesLoaded?: number, totalBytes?: number) => void;
  acceptedTypes?: string[];
  multiple?: boolean;
  children: React.ReactNode;
  className?: string;
  showPreview?: boolean;
  enableFolderDrop?: boolean;
  maxFileSize?: number;
  enableDeduplication?: boolean;
  showErrorToast?: boolean;
}

interface ProcessedFile {
  file: File;
  metadata: {
    name: string;
    size: number;
    type: string;
    category: string;
    preview?: string;
  };
  bytesProcessed: number;
}

export const DragDropZone: React.FC<DragDropZoneProps> = ({
  onFilesDropped,
  onDirectoryDropped: _onDirectoryDropped,
  onError,
  onProgress,
  acceptedTypes = [],
  multiple = true,
  children,
  className = '',
  showPreview = true,
  enableFolderDrop = false,
  maxFileSize = 100 * 1024 * 1024, // 100MB default
  enableDeduplication = true,
  showErrorToast = true
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedFiles, setDraggedFiles] = useState<File[]>([]);
  const [processingFiles, setProcessingFiles] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [liveRegionText, setLiveRegionText] = useState('');
  const [fileSystemSupport, setFileSystemSupport] = useState({
    fileAccess: false,
    directoryAccess: false,
    webkitEntry: false
  });
  
  const dragCounter = useRef(0);
  const processedFileHashes = useRef(new Set<string>());
  const animationFrameRef = useRef<number>();

  // Feature detection on mount
  useEffect(() => {
    setFileSystemSupport({
      fileAccess: 'showOpenFilePicker' in window,
      directoryAccess: 'showDirectoryPicker' in window,
      webkitEntry: 'webkitGetAsEntry' in DataTransferItem.prototype
    });
  }, []);

  // Generate file hash for deduplication
  const generateFileHash = (file: File): string => {
    return `${file.name}-${file.size}-${file.lastModified}`;
  };

  // Enhanced error handling with user feedback
  const handleError = useCallback((error: Error, context?: string) => {
    console.error('DragDropZone error:', error, context);
    
    if (showErrorToast) {
      setError(`${context ? context + ': ' : ''}${error.message}`);
      setTimeout(() => setError(null), 5000);
    }
    
    onError?.(error, context);
  }, [onError, showErrorToast]);

  // Throttled preview updates for performance
  const updateDraggedFiles = useCallback((files: File[]) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      setDraggedFiles(files);
      setLiveRegionText(`${files.length} file${files.length !== 1 ? 's' : ''} ready to drop`);
    });
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
      audioManager.playDragStart();
      hapticManager.playDragStart();
      setLiveRegionText('Files detected, ready to drop');
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    
    if (dragCounter.current === 0) {
      setIsDragOver(false);
      setDraggedFiles([]);
      setLiveRegionText('');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Throttled preview updates
    if (showPreview && e.dataTransfer.files.length > 0) {
      updateDraggedFiles(Array.from(e.dataTransfer.files));
    }
  }, [showPreview, updateDraggedFiles]);

  // Enhanced directory processing with File System Access API fallback
  const _processDirectoryWithFileSystemAPI = async (dirHandle: FileSystemDirectoryHandle): Promise<File[]> => {
    const files: File[] = [];
    
    try {
      for await (const [_name, handle] of dirHandle.entries()) {
        if (handle.kind === 'file') {
          const file = await (handle as FileSystemFileHandle).getFile();
          files.push(file);
        } else if (handle.kind === 'directory') {
          const subFiles = await _processDirectoryWithFileSystemAPI(handle as FileSystemDirectoryHandle);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      handleError(error as Error, 'Directory processing with File System API');
    }
    
    return files;
  };

  // Legacy webkit directory processing
  const processDirectoryEntry = async (entry: unknown): Promise<File[]> => {
    const files: File[] = [];
    
    const readEntries = (dirEntry: unknown): Promise<unknown[]> => {
      return new Promise((resolve, reject) => {
        (dirEntry as { createReader(): { readEntries(resolve: (entries: unknown[]) => void, reject: (error: unknown) => void): void } }).createReader().readEntries(resolve, reject);
      });
    };
    
    const getFile = (fileEntry: unknown): Promise<File> => {
      return new Promise((resolve, reject) => {
        (fileEntry as { file(resolve: (file: File) => void, reject: (error: unknown) => void): void }).file(resolve, reject);
      });
    };
    
    try {
      const entries = await readEntries(entry);
      
      for (const subEntry of entries) {
        if ((subEntry as { isFile: boolean }).isFile) {
          const file = await getFile(subEntry);
          files.push(file);
        } else if ((subEntry as { isDirectory: boolean }).isDirectory) {
          const subFiles = await processDirectoryEntry(subEntry);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      handleError(error as Error, 'Legacy directory processing');
    }
    
    return files;
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragOver(false);
    setDraggedFiles([]);
    setProcessingFiles(true);
    setError(null);
    dragCounter.current = 0;
    
    try {
      const items = Array.from(e.dataTransfer.items);
      const files: File[] = [];
      let totalBytes = 0;
      let processedBytes = 0;
      
      // Show unsupported browser warning for folder drops
      if (enableFolderDrop && !fileSystemSupport.webkitEntry && !fileSystemSupport.directoryAccess) {
        handleError(new Error('Folder drops not supported in this browser'), 'Browser compatibility');
      }
      
      setLiveRegionText('Processing dropped files...');
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            // Validate file size
            if (file.size > maxFileSize) {
              handleError(new Error(`File ${file.name} exceeds maximum size limit of ${(maxFileSize / 1024 / 1024).toFixed(1)}MB`), 'File validation');
              continue;
            }
            
            // Filter by accepted types
            if (acceptedTypes.length > 0) {
              const extension = '.' + file.name.split('.').pop()?.toLowerCase();
              if (!acceptedTypes.includes(extension) && !acceptedTypes.includes(file.type)) {
                continue;
              }
            }
            
            // Deduplication check
            if (enableDeduplication) {
              const hash = generateFileHash(file);
              if (processedFileHashes.current.has(hash)) {
                console.log(`Skipping duplicate file: ${file.name}`);
                continue;
              }
              processedFileHashes.current.add(hash);
            }
            
            files.push(file);
            totalBytes += file.size;
          }
        } else if (enableFolderDrop && item.webkitGetAsEntry) {
          const entry = item.webkitGetAsEntry();
          if (entry?.isDirectory) {
            try {
              const dirFiles = await processDirectoryEntry(entry);
              files.push(...dirFiles);
              totalBytes += dirFiles.reduce((sum, f) => sum + f.size, 0);
            } catch (error) {
              handleError(error as Error, 'Directory processing');
            }
          }
        }
      }
      
      // Limit files if multiple not allowed
      const finalFiles = multiple ? files : files.slice(0, 1);
      
      if (finalFiles.length > 0) {
        const processedFiles: ProcessedFile[] = [];
        
        // Enhanced progress reporting with byte-level granularity
        for (let i = 0; i < finalFiles.length; i++) {
          const file = finalFiles[i];
          if (!file) continue;
          
          try {
            // Extract metadata with progress tracking
            const metadata = {
              name: file.name,
              size: file.size,
              type: file.type,
              category: 'unknown'
            };
            processedBytes += file.size;
            
            const processedFile: ProcessedFile = {
              file,
              metadata,
              bytesProcessed: file.size
            };
            
            processedFiles.push(processedFile);
            
            // TODO: Add to recent files when systemIntegration is properly implemented
            // await systemIntegration.addToRecentFiles(file.name, {
            //   name: file.name,
            //   size: file.size,
            //   type: file.type,
            //   category: metadata.category
            // });
            
            // Enhanced progress reporting
            onProgress?.(i + 1, finalFiles.length, processedBytes, totalBytes);
            setLiveRegionText(`Processing file ${i + 1} of ${finalFiles.length}: ${file.name}`);
            
          } catch (error) {
            handleError(error as Error, `Processing file ${file.name}`);
          }
        }
        
        setProcessedFiles(processedFiles);
        audioManager.playDragEnd();
        hapticManager.playDragEnd();
        setLiveRegionText(`Successfully processed ${finalFiles.length} file${finalFiles.length !== 1 ? 's' : ''}`);
        onFilesDropped(finalFiles);
      } else {
        setLiveRegionText('No valid files to process');
      }
    } catch (error) {
      handleError(error as Error, 'File drop processing');
      setLiveRegionText('Error processing dropped files');
    } finally {
      setProcessingFiles(false);
      // Clear live region after delay
      setTimeout(() => setLiveRegionText(''), 3000);
    }
  }, [acceptedTypes, multiple, onFilesDropped, enableFolderDrop, maxFileSize, onProgress, enableDeduplication, fileSystemSupport, handleError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`relative ${className} ${
        isDragOver ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : ''
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      role="region"
      aria-label="File drop zone"
    >
      {children}
      
      {/* WCAG Compliance: Screen reader live region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveRegionText}
      </div>
      
      {/* Enhanced drag overlay with ARIA support */}
      {isDragOver && (
        <div 
          className="absolute inset-0 bg-blue-100 bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Drop files here"
        >
          <div className="bg-white rounded-lg p-6 shadow-lg border-2 border-blue-300 border-dashed max-w-md">
            <div className="text-center">
              <div className="text-4xl mb-2" role="img" aria-label="File icon">
                {enableFolderDrop ? '📁' : '📄'}
              </div>
              <div className="text-lg font-medium text-blue-700">
                Drop {multiple ? 'files' : 'file'} {enableFolderDrop ? 'or folders' : ''} here
              </div>
              
              {/* Browser compatibility warning */}
              {enableFolderDrop && !fileSystemSupport.webkitEntry && (
                <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  ⚠️ Folder drops may not work in this browser
                </div>
              )}
              
              {draggedFiles.length > 0 && showPreview && (
                <div className="mt-3">
                  <div className="text-sm text-gray-600 mb-2">
                    {draggedFiles.length} file{draggedFiles.length > 1 ? 's' : ''} ready
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    {draggedFiles.slice(0, 5).map((file, index) => (
                      <div key={index} className="text-xs text-gray-500 truncate">
                        {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </div>
                    ))}
                    {draggedFiles.length > 5 && (
                      <div className="text-xs text-gray-400">
                        +{draggedFiles.length - 5} more files...
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {acceptedTypes.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  Accepted: {acceptedTypes.join(', ')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Enhanced processing overlay */}
      {processingFiles && (
        <div 
          className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Processing files"
        >
          <div className="bg-white rounded-lg p-6 shadow-lg max-w-md">
            <div className="text-center">
              <div className="text-2xl mb-2" role="img" aria-label="Processing">
                ⏳
              </div>
              <div className="text-lg font-medium">Processing files...</div>
              <div className="text-sm text-gray-600 mt-1">
                Extracting metadata and generating previews
              </div>
              
              {processedFiles.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-gray-500">
                    Processed: {processedFiles.length} files
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(processedFiles.reduce((sum, f) => sum + f.bytesProcessed, 0) / 
                                processedFiles.reduce((sum, f) => sum + f.file.size, 0)) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Error toast notification */}
      {error && showErrorToast && (
        <div 
          className="absolute top-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg z-50 max-w-sm"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start">
            <div className="text-red-500 mr-2" role="img" aria-label="Error">
              ⚠️
            </div>
            <div>
              <div className="text-sm font-medium text-red-800">Error</div>
              <div className="text-xs text-red-600 mt-1">{error}</div>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-2 text-red-400 hover:text-red-600"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};