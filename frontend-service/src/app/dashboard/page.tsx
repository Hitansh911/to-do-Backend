"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { fetchApi, Note, Todo } from "@/lib/api";
import { 
  ChevronDown, 
  FileText, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  Cloud, 
  Users, 
  Folder,
  Plus,
  MoreHorizontal,
  LayoutGrid,
  List as ListIcon,
  Crown,
  MessageSquare,
  Type,
  CreditCard,
  Paperclip,
  Image as ImageIcon,
  Camera,
  Code,
  Calculator,
  GitBranch,
  PenTool,
  Smile,
  Check,
  X,
  Flag,
  Circle,
  Trash2
} from "lucide-react";

const SidebarButton = ({ icon, label }: { icon: React.ReactNode, label: string }) => (
  <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-[#2c2c2e] hover:border-[#48484a] bg-[#1c1c1e] hover:bg-[#252528] transition-colors group">
    <div className="flex items-center space-x-3 text-gray-300 group-hover:text-white">
      {icon}
      <span className="font-medium">{label}</span>
    </div>
    {/* Drag handle icon (6 dots) */}
    <div className="grid grid-cols-2 gap-[2px] opacity-20 group-hover:opacity-100 transition-opacity">
      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
    </div>
  </button>
);

export default function DashboardPage() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("all_docs");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  // Editor State - for new notes
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // State for opening existing note
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  // Tasks state
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(false);
  // Calendar state
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showNewTaskInput, setShowNewTaskInput] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [savingTask, setSavingTask] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskNotes, setEditTaskNotes] = useState("");

  // Auth guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Load notes when switching to all_docs tab
  useEffect(() => {
    if (isAuthenticated && activeTab === "all_docs") {
      loadNotes();
    }
  }, [isAuthenticated, activeTab]);

  // Load todos when switching to tasks tab
  useEffect(() => {
    if (isAuthenticated && activeTab === "tasks") {
      loadTodos();
    }
  }, [isAuthenticated, activeTab]);

  const loadNotes = async () => {
    // Guard: don't try to load if no token available
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;
    
    setLoadingNotes(true);
    try {
      const res = await fetchApi("/api/notes?sort_by=updated_at");
      if (!res.ok) {
        console.error("loadNotes failed with status:", res.status);
        setLoadingNotes(false);
        return;
      }
      const json = await res.json();
      if (json.status === "success") {
        setNotes(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNotes(false);
    }
  };


  const handleSaveNote = async () => {
    if (!newNoteTitle.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetchApi("/api/notes", {
        method: "POST",
        body: JSON.stringify({
          title: newNoteTitle,
          content: newNoteContent,
          folder: "Unsorted",
          emoji: "📄"
        })
      });
      const json = await res.json();
      if (json.status === "success") {
        const newNote: Note = json.data;
        // Immediately add the new note to state - no separate GET needed
        setNotes(prev => [newNote, ...prev]);
        setNewNoteTitle("");
        setNewNoteContent("");
        setActiveTab("all_docs");
      } else {
        console.error("Save failed:", json);
      }
    } catch (err) {
      console.error("Failed to save note", err);
    } finally {
      setSavingNote(false);
    }
  };

  const openNote = (note: Note) => {
    setSelectedNote(note);
    setEditTitle(note.title);
    setEditContent(note.content || "");
    setActiveTab("edit_doc");
  };

  const handleUpdateNote = async () => {
    if (!selectedNote || !editTitle.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetchApi(`/api/notes/${selectedNote.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
          folder: selectedNote.folder,
          emoji: selectedNote.emoji
        })
      });
      const json = await res.json();
      if (json.status === "success") {
        // Update note in-place in the list
        setNotes(prev => prev.map(n =>
          n.id === selectedNote.id
            ? { ...n, title: editTitle, content: editContent, updated_at: new Date().toISOString() }
            : n
        ));
        setSelectedNote(null);
        setActiveTab("all_docs");
      } else {
        console.error("Update failed:", json);
      }
    } catch (err) {
      console.error("Failed to update note", err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (id?: number) => {
    const targetId = id || selectedNote?.id;
    if (!targetId) return;
    try {
      const res = await fetchApi(`/api/notes/${targetId}`, {
        method: "DELETE"
      });
      const json = await res.json();
      if (json.status === "success") {
        setNotes(prev => prev.filter(n => n.id !== targetId));
        if (selectedNote?.id === targetId) {
          setSelectedNote(null);
          setActiveTab("all_docs");
        }
      } else {
        console.error("Delete failed:", json);
      }
    } catch (err) {
      console.error("Failed to delete note", err);
    }
  };

  const toggleDropdown = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setOpenDropdownId(prev => prev === id ? null : id);
  };

  // ─── TODO HANDLERS ───────────────────────────────────────────────
  const loadTodos = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;
    setLoadingTodos(true);
    try {
      const res = await fetchApi("/api/todos");
      if (!res.ok) { setLoadingTodos(false); return; }
      const json = await res.json();
      if (json.status === "success") setTodos(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTodos(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    setSavingTask(true);
    try {
      const res = await fetchApi("/api/todos", {
        method: "POST",
        body: JSON.stringify({
          title: newTaskTitle,
          priority: "low",
          notes: "",
          due_date: selectedDate || null
        })
      });
      const json = await res.json();
      if (json.status === "success") {
        setTodos(prev => [json.data as Todo, ...prev]);
        setNewTaskTitle("");
        setShowNewTaskInput(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingTask(false);
    }
  };

  const openTodo = (todo: Todo) => {
    setSelectedTodo(todo);
    setEditTaskTitle(todo.title);
    setEditTaskNotes(todo.notes || "");
    setActiveTab("edit_task");
  };

  const handleUpdateTodo = async () => {
    if (!selectedTodo || !editTaskTitle.trim()) return;
    setSavingTask(true);
    try {
      const res = await fetchApi(`/api/todos/${selectedTodo.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: editTaskTitle, notes: editTaskNotes })
      });
      const json = await res.json();
      if (json.status === "success") {
        setTodos(prev => prev.map(t =>
          t.id === selectedTodo.id ? { ...t, title: editTaskTitle, notes: editTaskNotes } : t
        ));
        setSelectedTodo(null);
        setActiveTab("tasks");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingTask(false);
    }
  };

  const toggleComplete = async (todo: Todo) => {
    try {
      const res = await fetchApi(`/api/todos/${todo.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !todo.completed })
      });
      const json = await res.json();
      if (json.status === "success") {
        setTodos(prev => prev.map(t =>
          t.id === todo.id ? { ...t, completed: !t.completed } : t
        ));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1c1c1e]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#1c1c1e] text-[#e0e0e0] font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#252528] flex flex-col border-r border-[#3a3a3c] flex-shrink-0">
        
        {/* Workspace Dropdown */}
        <div className="p-4 flex items-center space-x-2 hover:bg-[#3a3a3c] cursor-pointer rounded-lg mx-2 mt-2 transition-colors">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-pink-500"></div>
          <span className="font-semibold text-sm">My Space</span>
          <ChevronDown size={14} className="text-gray-400" />
        </div>

        {/* New Document Button */}
        <div className="px-4 mt-2 mb-6">
          <button 
            onClick={() => setActiveTab('new_doc')}
            className={`flex items-center space-x-2 text-sm transition-colors w-full p-2 rounded-lg ${activeTab === 'new_doc' ? 'bg-[#3a3a3c] text-white' : 'text-gray-300 hover:text-white hover:bg-[#3a3a3c]'}`}
          >
            <FileText size={16} />
            <span>New Document</span>
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 space-y-1">
          <div 
            onClick={() => setActiveTab('all_docs')}
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${activeTab === 'all_docs' ? 'bg-[#3a3a3c] text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-[#2c2c2e]'}`}
          >
            <FileText size={18} />
            <span className="text-sm font-medium">All Docs</span>
          </div>
          
          <div 
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${activeTab === 'tasks' ? 'bg-[#3a3a3c] text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-[#2c2c2e]'}`}
          >
            <CheckSquare size={18} />
            <span className="text-sm font-medium">Tasks</span>
          </div>

          <div 
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${activeTab === 'calendar' ? 'bg-[#3a3a3c] text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-[#2c2c2e]'}`}
          >
            <CalendarIcon size={18} />
            <span className="text-sm font-medium">Calendar</span>
          </div>

          <div className="flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer text-gray-400 hover:text-gray-200 hover:bg-[#2c2c2e] transition-colors">
            <Cloud size={18} />
            <span className="text-sm font-medium">Imagine</span>
          </div>

          <div className="flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer text-gray-400 hover:text-gray-200 hover:bg-[#2c2c2e] transition-colors mb-6">
            <Users size={18} />
            <span className="text-sm font-medium">Shared with Me</span>
          </div>

          {/* Starred */}
          <div className="mt-8 mb-2 px-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Starred</h3>
          </div>
          <div className="px-3">
            <p className="text-xs text-gray-500 italic">Star Docs to keep them close</p>
          </div>

          {/* Folders */}
          <div className="mt-8 mb-2 px-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Folders</h3>
          </div>
          <div className="flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer text-gray-300 hover:text-white hover:bg-[#2c2c2e] transition-colors">
            <span>👋</span>
            <span className="text-sm font-medium truncate">How to use Craft</span>
          </div>
          <div className="flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer text-gray-300 hover:text-white hover:bg-[#2c2c2e] transition-colors">
            <Folder size={18} className="text-gray-400" />
            <span className="text-sm font-medium truncate">Unsorted</span>
          </div>

        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#3a3a3c] mt-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 cursor-pointer hover:text-white text-gray-400 transition-colors">
              <div className="w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-pink-500"></div>
              </div>
              <span className="text-sm font-medium">Assistant</span>
            </div>
            <button onClick={logout} className="text-xs text-red-400 hover:text-red-300">Log out</button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col bg-[#1c1c1e] min-w-0">
        
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-[#2c2c2e]">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setActiveTab('new_doc')}
              className="w-6 h-6 rounded bg-white text-black flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <Plus size={16} strokeWidth={3} />
            </button>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {activeTab === 'new_doc' ? 'New Document' : activeTab === 'edit_doc' ? (selectedNote?.title || 'Edit Document') : 'All Docs'}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-1 text-sm font-medium text-gray-300 hover:text-white transition-colors">
              <Crown size={16} />
              <span>Get Craft Plus</span>
            </button>
            
            <div className="flex items-center bg-[#2c2c2e] rounded-md p-1">
              <button className="p-1 rounded bg-[#48484a] text-white shadow-sm">
                <LayoutGrid size={16} />
              </button>
              <button className="p-1 rounded text-gray-400 hover:text-white transition-colors">
                <ListIcon size={16} />
              </button>
            </div>

            <button className="p-1.5 rounded-md border border-[#3a3a3c] text-gray-400 hover:text-white hover:bg-[#2c2c2e] transition-colors">
              <MoreHorizontal size={18} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex">
          {activeTab === 'new_doc' ? (
            <div className="flex h-full w-full">
              {/* Editor Main Content */}
              <div className="flex-1 flex flex-col p-12 overflow-y-auto">
                <div className="max-w-3xl w-full mx-auto">
                  <div className="flex items-center justify-between mb-8 group border-b border-transparent hover:border-[#3a3a3c] transition-colors pb-2">
                    <input 
                      type="text" 
                      placeholder="Page Title" 
                      className="text-4xl font-bold bg-transparent text-white placeholder-[#48484a] outline-none w-full"
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                    />
                    <div className="flex items-center space-x-3 text-gray-500 opacity-50 hover:opacity-100 transition-opacity">
                      <button className="hover:text-white"><Smile size={20} /></button>
                      <button className="hover:text-white"><MessageSquare size={20} /></button>
                    </div>
                  </div>
                  <textarea 
                    placeholder="Write something..."
                    className="w-full h-[500px] bg-transparent text-gray-300 placeholder-[#48484a] outline-none resize-none leading-relaxed text-lg"
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                  />
                  <div className="flex justify-end mt-4">
                     <button 
                       onClick={handleSaveNote}
                       disabled={savingNote || !newNoteTitle.trim()}
                       className="bg-[#2c2c2e] hover:bg-[#3a3a3c] disabled:opacity-50 text-white px-4 py-2 rounded-md font-medium flex items-center space-x-2 transition-colors border border-[#3a3a3c]"
                     >
                       {savingNote ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div> : <Check size={16} />}
                       <span>Save Document</span>
                     </button>
                  </div>
                </div>
              </div>
              
              {/* Right Sidebar - Insert Menu */}
              <div className="w-80 border-l border-[#2c2c2e] flex flex-col bg-[#1c1c1e] text-sm flex-shrink-0">
                {/* Tabs */}
                <div className="flex items-center space-x-5 px-6 py-4 text-gray-400 font-medium">
                  <button className="text-white">Insert</button>
                  <button className="hover:text-white transition-colors">Format</button>
                  <button className="hover:text-white transition-colors">Style</button>
                  <button className="hover:text-white transition-colors">Info</button>
                </div>
                
                <div className="px-6 py-2 overflow-y-auto flex-1">
                  <p className="text-xs text-[#6e6e73] mb-4">Drag and drop any item to the document</p>
                  
                  <div className="space-y-2">
                    <SidebarButton icon={<Type size={16} />} label="Text" />
                    <SidebarButton icon={<FileText size={16} />} label="Page" />
                    <SidebarButton icon={<CreditCard size={16} />} label="Card" />
                    <SidebarButton icon={<Paperclip size={16} />} label="File Attachment" />
                    <SidebarButton icon={<ImageIcon size={16} />} label="Image" />
                    <SidebarButton icon={<Camera size={16} />} label="Image from Unsplash" />
                    <SidebarButton icon={<Code size={16} />} label="Code Block" />
                    <SidebarButton icon={<Calculator size={16} />} label="TeX Formula" />
                    <SidebarButton icon={<GitBranch size={16} />} label="Mermaid Diagram" />
                    <SidebarButton icon={<PenTool size={16} />} label="Whiteboard" />
                  </div>
                </div>
                
                {/* Right Sidebar Footer */}
                <div className="mt-auto p-4 flex justify-end">
                  <button className="flex items-center space-x-2 bg-[#2c2c2e] hover:bg-[#3a3a3c] rounded-full px-4 py-2 transition-colors">
                    <div className="w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-pink-500"></div>
                    </div>
                    <span className="font-semibold text-white text-xs">Assistant</span>
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === 'edit_doc' && selectedNote ? (
            <div className="flex h-full w-full">
              {/* Editor Main Content */}
              <div className="flex-1 flex flex-col p-12 overflow-y-auto">
                <div className="max-w-3xl w-full mx-auto">
                  <button
                    onClick={() => { setSelectedNote(null); setActiveTab('all_docs'); }}
                    className="mb-6 flex items-center space-x-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    <span>←</span><span>Back to All Docs</span>
                  </button>
                  <div className="flex items-center justify-between mb-8 group border-b border-transparent hover:border-[#3a3a3c] transition-colors pb-2">
                    <input
                      type="text"
                      placeholder="Page Title"
                      className="text-4xl font-bold bg-transparent text-white placeholder-[#48484a] outline-none w-full"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                    <div className="flex items-center space-x-3 text-gray-500 opacity-50 hover:opacity-100 transition-opacity">
                      <button className="hover:text-white"><Smile size={20} /></button>
                      <button className="hover:text-white"><MessageSquare size={20} /></button>
                    </div>
                  </div>
                  <textarea
                    placeholder="Write something..."
                    className="w-full h-[500px] bg-transparent text-gray-300 placeholder-[#48484a] outline-none resize-none leading-relaxed text-lg"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                  <div className="flex justify-between mt-4">
                    <div>
                      <button
                        onClick={handleDeleteNote}
                        className="bg-transparent hover:bg-red-900/30 text-red-400 px-4 py-2 rounded-md font-medium flex items-center space-x-2 transition-colors border border-red-900/50 hover:border-red-500/50"
                      >
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </button>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => { setSelectedNote(null); setActiveTab('all_docs'); }}
                        className="bg-transparent hover:bg-[#2c2c2e] text-gray-400 hover:text-white px-4 py-2 rounded-md font-medium transition-colors border border-[#3a3a3c]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdateNote}
                        disabled={savingNote || !editTitle.trim()}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-md font-medium flex items-center space-x-2 transition-colors"
                      >
                        {savingNote ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div> : <Check size={16} />}
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Sidebar - Insert Menu */}
              <div className="w-80 border-l border-[#2c2c2e] flex flex-col bg-[#1c1c1e] text-sm flex-shrink-0">
                <div className="flex items-center space-x-5 px-6 py-4 text-gray-400 font-medium">
                  <button className="text-white">Insert</button>
                  <button className="hover:text-white transition-colors">Format</button>
                  <button className="hover:text-white transition-colors">Style</button>
                  <button className="hover:text-white transition-colors">Info</button>
                </div>
                <div className="px-6 py-2 overflow-y-auto flex-1">
                  <p className="text-xs text-[#6e6e73] mb-4">Drag and drop any item to the document</p>
                  <div className="space-y-2">
                    <SidebarButton icon={<Type size={16} />} label="Text" />
                    <SidebarButton icon={<FileText size={16} />} label="Page" />
                    <SidebarButton icon={<CreditCard size={16} />} label="Card" />
                    <SidebarButton icon={<Paperclip size={16} />} label="File Attachment" />
                    <SidebarButton icon={<ImageIcon size={16} />} label="Image" />
                    <SidebarButton icon={<Camera size={16} />} label="Image from Unsplash" />
                    <SidebarButton icon={<Code size={16} />} label="Code Block" />
                    <SidebarButton icon={<Calculator size={16} />} label="TeX Formula" />
                    <SidebarButton icon={<GitBranch size={16} />} label="Mermaid Diagram" />
                    <SidebarButton icon={<PenTool size={16} />} label="Whiteboard" />
                  </div>
                </div>
                <div className="mt-auto p-4 flex justify-end">
                  <button className="flex items-center space-x-2 bg-[#2c2c2e] hover:bg-[#3a3a3c] rounded-full px-4 py-2 transition-colors">
                    <div className="w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-pink-500"></div>
                    </div>
                    <span className="font-semibold text-white text-xs">Assistant</span>
                  </button>
                </div>
              </div>
            </div>
          ) : loadingNotes ? (
            <div className="flex items-center justify-center h-full w-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-500"></div>
            </div>
          ) : activeTab === 'all_docs' ? (
            <div className="p-8 w-full h-full overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {notes.map((note) => (
                  <div key={note.id} onClick={() => openNote(note)} className="group cursor-pointer flex flex-col relative">
                    {/* Card Title Area */}
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                          <span>{note.title}</span>
                          {note.emoji && <span>{note.emoji}</span>}
                        </h2>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                          <Folder size={12} />
                          <span>{note.folder || 'Unsorted'}</span>
                          <span>•</span>
                          <span>Updated {new Date(note.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Three Dots Button */}
                      <button 
                        onClick={(e) => toggleDropdown(e, note.id)}
                        className="p-1 rounded-md hover:bg-[#2c2c2e] text-gray-400 hover:text-white transition-colors"
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {/* Dropdown Menu */}
                      {openDropdownId === note.id && (
                        <div 
                          className="absolute right-0 top-8 w-48 bg-[#252528] border border-[#3a3a3c] rounded-lg shadow-xl overflow-hidden z-20 py-1"
                          onClick={(e) => e.stopPropagation()}
                          onMouseLeave={() => setOpenDropdownId(null)}
                        >
                          <button className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2c2c2e] hover:text-white transition-colors">Open in New Tab</button>
                          <button className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2c2c2e] hover:text-white transition-colors">Star</button>
                          <button className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2c2c2e] hover:text-white transition-colors">Duplicate</button>
                          <button className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2c2c2e] hover:text-white transition-colors border-b border-[#3a3a3c]">Move to</button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); setOpenDropdownId(null); }}
                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Document Preview Card */}
                    <div className="bg-[#e4e4e7] rounded-xl overflow-hidden shadow-sm aspect-[4/3] flex flex-col transition-transform duration-200 ease-out group-hover:scale-[1.02] group-hover:shadow-lg border border-[#3a3a3c]">
                      {/* Fake page header */}
                      <div className="h-6 bg-[#f4f4f5] border-b border-[#d4d4d8] flex items-center px-3 space-x-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#ef4444]"></div>
                        <div className="w-2 h-2 rounded-full bg-[#f59e0b]"></div>
                        <div className="w-2 h-2 rounded-full bg-[#10b981]"></div>
                      </div>
                      {/* Page Content Preview */}
                      <div className="p-4 flex-1 text-black overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#e4e4e7]/90 z-10"></div>
                        <p className="text-[10px] sm:text-xs leading-relaxed font-serif text-gray-800">
                          {note.content ? note.content.substring(0, 200) + '...' : 'Empty document...'}
                        </p>
                        
                        {note.preview_image_url && (
                          <div className="mt-3 rounded border border-gray-300 overflow-hidden h-24">
                            <img src={note.preview_image_url} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                        
                        {!note.preview_image_url && (
                          <div className="mt-4 flex space-x-2">
                             <div className="w-full h-16 bg-white rounded shadow-sm flex flex-col justify-between p-2">
                                <div className="w-3/4 h-2 bg-gray-200 rounded"></div>
                                <div className="w-full h-2 bg-gray-200 rounded"></div>
                                <div className="w-5/6 h-2 bg-gray-200 rounded"></div>
                             </div>
                             <div className="w-full h-16 bg-white rounded shadow-sm flex flex-col justify-between p-2">
                                <div className="w-3/4 h-2 bg-gray-200 rounded"></div>
                                <div className="w-full h-2 bg-gray-200 rounded"></div>
                                <div className="w-5/6 h-2 bg-gray-200 rounded"></div>
                             </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'tasks' ? (
            <div className="w-full h-full overflow-y-auto p-8">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Tasks</h2>
                  <button onClick={() => { setShowNewTaskInput(true); setNewTaskTitle(""); }} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    <Plus size={16} /><span>New Task</span>
                  </button>
                </div>
                {showNewTaskInput && (
                  <div className="mb-6 bg-[#2c2c2e] border border-[#48484a] rounded-xl p-4 shadow-lg">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-5 h-5 rounded-full border-2 border-[#6e6e73] flex-shrink-0" />
                      <input autoFocus type="text" placeholder="New Task" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTask(); if (e.key === 'Escape') setShowNewTaskInput(false); }} className="flex-1 bg-transparent text-white text-base outline-none placeholder-[#6e6e73]" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 text-[#6e6e73]">
                        <button className="hover:text-white transition-colors flex items-center space-x-1 text-sm"><CalendarIcon size={14} /><span>Schedule</span></button>
                        <button className="hover:text-white transition-colors"><Flag size={14} /></button>
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={() => setShowNewTaskInput(false)} className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                        <button onClick={handleCreateTask} disabled={savingTask || !newTaskTitle.trim()} className="px-4 py-1.5 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium transition-colors">{savingTask ? "Creating..." : "Create"}</button>
                      </div>
                    </div>
                  </div>
                )}
                {loadingTodos ? (
                  <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-500" /></div>
                ) : todos.length === 0 ? (
                  <div className="text-center py-20"><CheckSquare size={48} className="mx-auto text-gray-600 mb-4" /><p className="text-gray-500">No tasks yet. Create your first task!</p></div>
                ) : (
                  <div className="space-y-1">
                    {todos.filter(t => !t.completed).map(todo => (
                      <div key={todo.id} className="group flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-[#2c2c2e] transition-colors cursor-pointer">
                        <button onClick={(e) => { e.stopPropagation(); toggleComplete(todo); }} className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-[#6e6e73] hover:border-blue-400 transition-colors flex items-center justify-center" />
                        <div className="flex-1 min-w-0" onClick={() => openTodo(todo)}>
                          <p className="text-white text-sm font-medium truncate">{todo.title}</p>
                          {todo.notes && <p className="text-gray-500 text-xs truncate mt-0.5">{todo.notes}</p>}
                        </div>
                        <span className={`opacity-0 group-hover:opacity-100 text-xs px-2 py-0.5 rounded-full transition-opacity ${todo.priority === 'high' ? 'bg-red-900/50 text-red-400' : todo.priority === 'medium' ? 'bg-yellow-900/50 text-yellow-400' : 'bg-gray-700 text-gray-400'}`}>{todo.priority}</span>
                      </div>
                    ))}
                    {todos.filter(t => t.completed).length > 0 && (
                      <div className="mt-6">
                        <p className="text-xs text-[#6e6e73] font-semibold uppercase tracking-wider px-3 mb-2">Completed</p>
                        {todos.filter(t => t.completed).map(todo => (
                          <div key={todo.id} className="group flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-[#2c2c2e] transition-colors cursor-pointer opacity-60">
                            <button onClick={(e) => { e.stopPropagation(); toggleComplete(todo); }} className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-blue-500 bg-blue-500/20 flex items-center justify-center"><Check size={10} className="text-blue-400" /></button>
                            <div className="flex-1 min-w-0" onClick={() => openTodo(todo)}><p className="text-gray-500 text-sm line-through truncate">{todo.title}</p></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'edit_task' && selectedTodo ? (
            <div className="flex-1 flex flex-col p-12 overflow-y-auto">
              <div className="max-w-3xl w-full mx-auto">
                <button onClick={() => { setSelectedTodo(null); setActiveTab('tasks'); }} className="mb-6 flex items-center space-x-2 text-sm text-gray-400 hover:text-white transition-colors">
                  <span>←</span><span>Back to Tasks</span>
                </button>
                <div className="flex items-center space-x-4 mb-8 pb-4 border-b border-[#2c2c2e]">
                  <button onClick={() => { toggleComplete(selectedTodo); setSelectedTodo({...selectedTodo, completed: !selectedTodo.completed}); }} className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedTodo.completed ? 'border-blue-500 bg-blue-500/20' : 'border-[#6e6e73] hover:border-blue-400'}`}>
                    {selectedTodo.completed && <Check size={12} className="text-blue-400" />}
                  </button>
                  <input type="text" placeholder="Task title" className={`flex-1 text-3xl font-bold bg-transparent outline-none placeholder-[#48484a] ${selectedTodo.completed ? 'text-gray-500 line-through' : 'text-white'}`} value={editTaskTitle} onChange={(e) => setEditTaskTitle(e.target.value)} />
                </div>
                <p className="text-xs text-[#6e6e73] uppercase tracking-wider mb-3 font-semibold">Notes</p>
                <textarea placeholder="Add notes, context, links..." className="w-full h-[400px] bg-transparent text-gray-300 placeholder-[#48484a] outline-none resize-none leading-relaxed text-base" value={editTaskNotes} onChange={(e) => setEditTaskNotes(e.target.value)} />
                <div className="flex justify-end mt-6 space-x-3">
                  <button onClick={() => { setSelectedTodo(null); setActiveTab('tasks'); }} className="px-4 py-2 rounded-md text-gray-400 hover:text-white border border-[#3a3a3c] hover:bg-[#2c2c2e] transition-colors">Cancel</button>
                  <button onClick={handleUpdateTodo} disabled={savingTask || !editTaskTitle.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-md font-medium flex items-center space-x-2 transition-colors">
                    {savingTask ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" /> : <Check size={16} />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === 'calendar' ? (
              <div className="flex h-full">
                {/* Date List */}
                <div className="w-48 border-r border-[#2c2c2e] overflow-y-auto p-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Select a date</h3>
                  <div className="space-y-1">
                    {Array.from({ length: 14 }).map((_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() + i);
                      const iso = date.toISOString().split('T')[0];
                      const label = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                      return (
                        <button key={iso} onClick={() => setSelectedDate(iso)} className={`w-full text-left px-2 py-1 rounded ${selectedDate === iso ? 'bg-[#3a3a3c] text-white' : 'text-gray-300 hover:bg-[#2c2c2e] hover:text-white'}`}>{label}</button>
                      );
                    })}
                  </div>
                </div>
                {/* Main Calendar Area */}
                <div className="flex-1 p-8 overflow-y-auto">
                  {selectedDate ? (
                    <div className="max-w-2xl mx-auto">
                      <h2 className="text-2xl font-bold text-white mb-4">{new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
                      <div className="flex space-x-4 mb-6">
                        <button onClick={() => { setNewNoteTitle(new Date(selectedDate).toLocaleDateString()); setActiveTab('new_doc'); }} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium">
                          <Plus size={14} />
                          <span>Create Daily Note</span>
                        </button>
                        <button onClick={() => { setNewTaskTitle(''); setShowNewTaskInput(true); setSelectedDate(selectedDate); }} className="flex items-center space-x-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-md text-sm font-medium">
                          <Plus size={14} />
                          <span>Add Task</span>
                        </button>
                      </div>
                      {/* Existing tasks for this date */}
                      <div className="space-y-2">
                        {todos.filter(t => t.due_date === selectedDate).map(todo => (
                          <div key={todo.id} className="group flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-[#2c2c2e] transition-colors cursor-pointer" onClick={() => openTodo(todo)}>
                            <button onClick={(e) => { e.stopPropagation(); toggleComplete(todo); }} className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-[#6e6e73] hover:border-blue-400 transition-colors flex items-center justify-center" />
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">{todo.title}</p>
                              {todo.notes && <p className="text-gray-500 text-xs truncate mt-0.5">{todo.notes}</p>}
                            </div>
                            <span className={`opacity-0 group-hover:opacity-100 text-xs px-2 py-0.5 rounded-full ${todo.priority === 'high' ? 'bg-red-900/50 text-red-400' : todo.priority === 'medium' ? 'bg-yellow-900/50 text-yellow-400' : 'bg-gray-700 text-gray-400'}`}>{todo.priority}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400">Select a date to view or create notes and tasks.</p>
                  )}
                </div>
              </div>
          ) : null}
        </div>
      </main>

    </div>
  );
}
