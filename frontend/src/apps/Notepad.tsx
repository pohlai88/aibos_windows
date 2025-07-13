import { memo, useState, useEffect } from 'react';
import { useShortcutManager } from '../services/shortcutManager.ts';

interface Note {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  size: number;
}

interface QuotaInfo {
  notes: number;
  storage: number;
  limits: {
    maxNotes: number;
    maxNoteSize: number;
    maxTotalStorage: number;
  };
}

export const Notepad = memo(() => {
  const [content, setContent] = useState<string>("");
  const [title, setTitle] = useState<string>("Untitled Note");
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [notes, setNotes] = useState<Note[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [tenantId] = useState("550e8400-e29b-41d4-a716-446655440000"); // In production, get from auth context
  const [autoSaveTimer, setAutoSaveTimer] = useState<number | null>(null);
  const [lastSavedContent, setLastSavedContent] = useState<string>("");
  const [lastSavedTitle, setLastSavedTitle] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { registerAppShortcuts, unregisterAppShortcuts } = useShortcutManager();

  const apiUrl = import.meta.env.VITE_API_URL;

  // Load existing notes on component mount
  useEffect(() => {
    loadNotes();
    loadQuota();
    
    // Cleanup auto-save timer on unmount
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, []);

  // Register notepad-specific shortcuts
  useEffect(() => {
    const notepadShortcuts = [
      {
        id: 'notepad-save',
        key: 'Ctrl+S',
        description: 'Save current note',
        category: 'Notepad',
        icon: '💾',
        tags: ['save', 'file'],
        action: handleSave,
        preventDefault: true
      },
      {
        id: 'notepad-new',
        key: 'Ctrl+N',
        description: 'Create new note',
        category: 'Notepad',
        icon: '📄',
        tags: ['new', 'create'],
        action: handleNew,
        preventDefault: true
      }
    ];

    registerAppShortcuts('notepad', notepadShortcuts);

    // Cleanup on unmount
    return () => {
      unregisterAppShortcuts('notepad');
    };
  }, [content, title, currentNoteId, isSaving]);

  const loadNotes = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/notes?tenant=${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || []);
        setQuota(data.quota);
      }
    } catch (error) {
      console.error("Failed to load notes:", error);
    }
  };

  const loadQuota = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/quota?tenant=${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setQuota(data.quota);
      }
    } catch (error) {
      console.error("Failed to load quota:", error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    // Reset save status when user starts typing
    if (saveStatus !== "idle") {
      setSaveStatus("idle");
    }
    
    // Auto-save after 2 seconds of inactivity
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    
    const timer = setTimeout(() => {
      if (content.trim() && (content !== lastSavedContent || title !== lastSavedTitle)) {
        handleAutoSave();
      }
    }, 2000);
    
    setAutoSaveTimer(timer);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    
    // Auto-save after 2 seconds of inactivity
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    
    const timer = setTimeout(() => {
      if (content.trim() && (content !== lastSavedContent || title !== lastSavedTitle)) {
        handleAutoSave();
      }
    }, 2000);
    
    setAutoSaveTimer(timer);
  };

  const handleSave = async () => {
    if (!content.trim()) return;

    setIsSaving(true);
    setSaveStatus("idle");

    try {
      const url = currentNoteId 
        ? `${apiUrl}/api/notes/${currentNoteId}?tenant=${tenantId}`
        : `${apiUrl}/api/saveNote?tenant=${tenantId}`;
      
      const method = currentNoteId ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          content: content.trim(),
          title: title.trim() || "Untitled Note"
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSaveStatus("success");
        console.log("Note saved:", result);
        
        // Set current note ID if it's a new note
        if (!currentNoteId && result.noteId) {
          setCurrentNoteId(result.noteId);
        }
        
        // Reload notes list and quota
        await loadNotes();
        await loadQuota();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        const error = await response.json();
        console.error("Save failed:", error);
        setSaveStatus("error");
        
        // Show quota error if applicable
        if (response.status === 413 && error.quota) {
          setQuota(error.quota);
        }
      }
    } catch (error) {
      console.error("Save error:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoSave = async () => {
    if (!content.trim() || isSaving) return;
    
    try {
      const url = currentNoteId 
        ? `${apiUrl}/api/notes/${currentNoteId}?tenant=${tenantId}`
        : `${apiUrl}/api/saveNote?tenant=${tenantId}`;
      
      const method = currentNoteId ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          content: content.trim(),
          title: title.trim() || "Untitled Note"
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setLastSavedContent(content);
        setLastSavedTitle(title);
        
        // Set current note ID if it's a new note
        if (!currentNoteId && result.noteId) {
          setCurrentNoteId(result.noteId);
        }
        
        // Reload notes list and quota
        await loadNotes();
        await loadQuota();
      }
    } catch (error) {
      console.error("Auto-save error:", error);
    }
  };

  const handleNew = () => {
    setContent("");
    setTitle("Untitled Note");
    setCurrentNoteId(null);
    setSaveStatus("idle");
  };

  const loadNote = async (noteId: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/notes/${noteId}?tenant=${tenantId}`);
      if (response.ok) {
        const note: Note = await response.json();
        setContent(note.content);
        setTitle(note.title);
        setCurrentNoteId(note.id);
        setSaveStatus("idle");
      }
    } catch (error) {
      console.error("Failed to load note:", error);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    
    try {
      const response = await fetch(`${apiUrl}/api/notes/${noteId}?tenant=${tenantId}`, {
        method: "DELETE"
      });
      
      if (response.ok) {
        await loadNotes();
        await loadQuota();
        // Clear current note if it was deleted
        if (currentNoteId === noteId) {
          handleNew();
        }
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString() + " " + 
           new Date(dateString).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const getQuotaPercentage = (current: number, max: number): number => {
    return Math.round((current / max) * 100);
  };

  const getQuotaColor = (percentage: number): string => {
    if (percentage >= 90) return "text-red-500";
    if (percentage >= 75) return "text-yellow-500";
    return "text-green-500";
  };

  // Filter notes based on search query
  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 bg-white text-gray-800 h-full dark:bg-gray-800 dark:text-gray-200 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Notepad</h2>
        <div className="flex space-x-2">
          <button
            type="button"
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
            onClick={handleNew}
          >
            New
          </button>
          <button
            type="button"
            disabled={!content.trim() || isSaving}
            className={`px-3 py-1 rounded transition-colors text-sm ${
              !content.trim() || isSaving
                ? "bg-gray-300 cursor-not-allowed text-gray-500"
                : "bg-green-500 hover:bg-green-600 text-white"
            }`}
            onClick={handleSave}
          >
            {isSaving ? "Saving..." : currentNoteId ? "Update" : "Save"}
          </button>
        </div>
      </div>

      {/* Save Status */}
      {saveStatus === "success" && (
        <div className="mb-2 p-2 bg-green-100 text-green-700 rounded text-sm">
          ✓ Note saved successfully!
        </div>
      )}
      {saveStatus === "error" && (
        <div className="mb-2 p-2 bg-red-100 text-red-700 rounded text-sm">
          ✗ Failed to save note. Please try again.
        </div>
      )}
      {autoSaveTimer && content.trim() && (content !== lastSavedContent || title !== lastSavedTitle) && (
        <div className="mb-2 p-2 bg-blue-100 text-blue-700 rounded text-sm">
          ⏳ Auto-saving in 2 seconds...
        </div>
      )}

      {/* Quota Display */}
      {quota && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
          <div className="text-sm font-semibold mb-2">Storage Usage:</div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span>Notes:</span>
              <span className={getQuotaColor(getQuotaPercentage(quota.notes, quota.limits.maxNotes))}>
                {quota.notes} / {quota.limits.maxNotes}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Storage:</span>
              <span className={getQuotaColor(getQuotaPercentage(quota.storage, quota.limits.maxTotalStorage))}>
                {formatFileSize(quota.storage)} / {formatFileSize(quota.limits.maxTotalStorage)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Note Size Limit:</span>
              <span>{formatFileSize(quota.limits.maxNoteSize)} per note</span>
            </div>
          </div>
        </div>
      )}

      {/* Title Input */}
      <input
        type="text"
        value={title}
        onChange={handleTitleChange}
        placeholder="Note title..."
        className="mb-2 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
      />

      <textarea
        className="flex-1 w-full p-3 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
        placeholder="Start typing..."
        value={content}
        onChange={handleChange}
      />

      <div className="mt-2 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
        <span>{content.length} characters</span>
        <span>{content.split(/\s+/).filter(word => word.length > 0).length} words</span>
        {currentNoteId && <span className="text-blue-500">Editing: {currentNoteId.slice(0, 8)}...</span>}
        {quota && content.length > quota.limits.maxNoteSize && (
          <span className="text-red-500">⚠️ Exceeds note size limit</span>
        )}
        <span className="text-gray-400">Ctrl+S: Save | Ctrl+N: New</span>
      </div>

      {/* Notes List */}
      {notes.length > 0 && (
        <div className="mt-4 border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Saved Notes:</h3>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            />
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => loadNote(note.id)}
                >
                  <div className="text-sm font-medium truncate">{note.title}</div>
                  <div className="text-xs text-gray-500">
                    {formatDate(note.updated_at)} • {formatFileSize(note.size)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteNote(note.id)}
                  className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

Notepad.displayName = "Notepad";
