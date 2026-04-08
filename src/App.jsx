import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, 
  FileText, 
  Star, 
  Plus, 
  Search, 
  Wand2, 
  ChevronRight,
  ChevronDown,
  Settings,
  MoreHorizontal,
  Loader2,
  MoreVertical,
  Edit2,
  Trash2,
  FolderOpen,
  Sun,
  Moon,
  Tag,
  X,
  Download,
  FileDown,
  Printer,
  Maximize,
  Minimize,
  RefreshCcw
} from 'lucide-react';
import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- VRAIE BASE DE DONNÉES LOCALE (DEXIE) ---
export const db = new Dexie('MemorIADatabase');

db.version(1).stores({
  folders: '++id, name, icon, isDeleted, deletedAt',
  notes: '++id, folderId, title, content, isFavorite, isDeleted, createdAt, updatedAt, *tags'
});

// ============================================================================
// --- APPEL API GOOGLE GEMINI (Vraie IA avec Streaming) ---
// ============================================================================

// ============================================================================
// --- APPEL API GOOGLE GEMINI (Vraie IA avec Streaming) ---
// ============================================================================

const formatTextWithAI = async (textToFormat, onStream) => {
  // Récupération de la clé depuis l'engrenage de ton application
  const apiKey = (localStorage.getItem('gemini_api_key') || "").trim(); 
  
  if (!apiKey) {
    throw new Error("Clé API manquante. Veuillez configurer votre clé Gemini dans les paramètres (icône ⚙️).");
  }

  // Initialisation du client officiel Google Generative AI
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const systemPrompt = `Tu es un professeur expert en pédagogie et en structuration de l'information. L'utilisateur va te fournir des notes de cours brutes, souvent prises à la volée. 
Ton objectif est de transformer ce texte brut en une fiche de révision visuellement claire, complète et facile à mémoriser.

RÈGLES DE FORMATAGE STRICTES :
1. Renvoie UNIQUEMENT du code HTML valide. Aucune balise Markdown, aucun texte introductif ou conclusif.
2. Structure la note de la manière suivante (utilise ces balises HTML) :
   - Commence par un petit bloc résumé introductif (dans une balise <blockquote style="border-left: 4px solid #3b82f6; padding-left: 1rem; color: #4b5563; font-style: italic; margin-bottom: 1.5rem;">).
   - Utilise des <h2> pour les grands chapitres et des <h3> pour les sous-sections.
   - Utilise abondamment les listes à puces (<ul><li>) et les listes numérotées (<ol><li>) pour aérer le texte.
   - Mets TOUJOURS en <strong>gras</strong> les concepts clés, les dates importantes, les formules ou les noms propres.
   - Si l'utilisateur mentionne des acronymes (comme WBS, MOA, etc.) ou des concepts complexes de manière laconique, étoffe légèrement la définition pour qu'elle soit compréhensible lors de la révision.
   - Ajoute des retours à la ligne (<br> ou des marges CSS sur tes paragraphes) pour que le texte "respire".
   - S'il y a des formules ou du code, mets-les dans des balises <pre><code> ou <code>.`;
  
  const prompt = systemPrompt + "\n\nVoici les notes brutes à transformer en fiche de révision parfaite :\n\n" + textToFormat;

  // Utilisation de la méthode native de streaming du SDK (Pas de fetch manuel !)
  const result = await model.generateContentStream(prompt);
  
  let fullText = "";
  const tick3 = String.fromCharCode(96).repeat(3);

  // Lecture du flux de données en temps réel
  for await (const chunk of result.stream) {
    fullText += chunk.text();
    let cleanHtml = fullText.replace(new RegExp('^' + tick3 + 'html\\s*', 'i'), '').replace(new RegExp(tick3 + '\\s*$', 'i'), '').trim();
    if (onStream) onStream(cleanHtml);
  }
  
  return fullText.replace(new RegExp('^' + tick3 + 'html\\s*', 'i'), '').replace(new RegExp(tick3 + '\\s*$', 'i'), '').trim();
};
// ============================================================================

// --- COMPOSANTS UI (Modales) ---

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 z-[200] flex items-center justify-center backdrop-blur-sm p-4 print:hidden">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-96 max-w-full transform transition-all border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">Annuler</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-sm">Confirmer</button>
        </div>
      </div>
    </div>
  );
};

const RenameModal = ({ isOpen, title, initialValue, onConfirm, onCancel }) => {
  const [value, setValue] = useState('');
  
  useEffect(() => {
    if (isOpen) setValue(initialValue);
  }, [isOpen, initialValue]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 z-[200] flex items-center justify-center backdrop-blur-sm p-4 print:hidden">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-96 max-w-full transform transition-all border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">{title}</h3>
        <input 
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onConfirm(value);
            if (e.key === 'Escape') onCancel();
          }}
          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:border-blue-500 outline-none text-gray-800 dark:text-gray-200 mb-6"
        />
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">Annuler</button>
          <button onClick={() => onConfirm(value)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm">Renommer</button>
        </div>
      </div>
    </div>
  );
};

const SettingsModal = ({ isOpen, onClose, showAIButton, setShowAIButton }) => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [localShowAI, setLocalShowAI] = useState(showAIButton);
  
  useEffect(() => {
    setLocalShowAI(showAIButton);
  }, [showAIButton, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('gemini_api_key', apiKey.trim()); // Nettoyage lors de la sauvegarde
    localStorage.setItem('showAIButton', localShowAI);
    setShowAIButton(localShowAI);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 z-[200] flex items-center justify-center backdrop-blur-sm p-4 print:hidden">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-[450px] max-w-full transform transition-all border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-6 text-gray-800 dark:text-gray-100">
          <Settings size={20} className="text-blue-500" />
          <h2 className="text-lg font-bold">Paramètres de l'application</h2>
        </div>
        
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <Wand2 size={16} className="text-indigo-500" />
              Configuration IA
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Clé API Gemini</label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Collez votre clé API ici (ex: AIzaSy...)"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-gray-800 dark:text-gray-200"
                />
              </div>
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={localShowAI}
                    onChange={(e) => setLocalShowAI(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Afficher le bouton de mise en forme IA</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">Annuler</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm">Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

// --- SIDEBAR ---

const Sidebar = ({ selectedNoteId, setSelectedNoteId, isDark, toggleTheme, onOpenSettings, isFocusMode }) => {
  const folders = useLiveQuery(() => db.folders.toArray(), []);
  const allNotes = useLiveQuery(() => db.notes.toArray(), []);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({});

  // Filtrage : On exclut par défaut les notes supprimées (Corbeille)
  const notes = allNotes?.filter(n => {
    if (n.isDeleted) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (n.title && n.title.toLowerCase().includes(term)) || 
      (n.content && n.content.toLowerCase().includes(term)) ||
      (n.tags && n.tags.some(t => t.toLowerCase().includes(term)))
    );
  }) || [];

  const trashedNotes = allNotes?.filter(n => n.isDeleted) || [];
  const favoriteNotes = notes.filter(n => n.isFavorite);
  const activeFolders = folders?.filter(f => !f.isDeleted)?.filter(f => {
    if (!searchTerm) return true;
    return notes.some(n => n.folderId === f.id) || f.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const [activeDropdown, setActiveDropdown] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, type: '', name: '' });
  const [renameModal, setRenameModal] = useState({ isOpen: false, id: null, type: '', currentValue: '' });

  const handleCreateFolder = async () => {
    const id = await db.folders.add({ name: 'Nouveau cours', icon: 'Folder', isDeleted: false });
    setExpandedFolders(prev => ({ ...prev, [id]: true }));
    setRenameModal({ isOpen: true, id, type: 'folder', currentValue: 'Nouveau cours' });
  };

  const handleCreateNote = async (folderId) => {
    const newNoteId = await db.notes.add({
      folderId, title: 'Nouvelle note', content: '', isFavorite: false, isDeleted: false, createdAt: Date.now(), updatedAt: Date.now(), tags: []
    });
    setExpandedFolders(prev => ({ ...prev, [folderId]: true }));
    setSelectedNoteId(newNoteId);
    setRenameModal({ isOpen: true, id: newNoteId, type: 'note', currentValue: 'Nouvelle note' });
  };

  const handleGlobalCreateNote = async () => {
    let targetFolderId = activeFolders && activeFolders.length > 0 ? activeFolders[0].id : await db.folders.add({ name: 'Général', icon: 'Folder', isDeleted: false });
    await handleCreateNote(targetFolderId);
  };

  const handleRenameConfirm = async (newValue) => {
    if (newValue && newValue.trim() !== "") {
      if (renameModal.type === 'folder') {
        await db.folders.update(renameModal.id, { name: newValue.trim() });
      } else if (renameModal.type === 'note') {
        await db.notes.update(renameModal.id, { title: newValue.trim() });
      }
    }
    setRenameModal({ ...renameModal, isOpen: false });
  };

  const executeDelete = async () => {
    if (deleteModal.type === 'folder') {
      await db.folders.update(deleteModal.id, { isDeleted: true, deletedAt: Date.now() }); // Soft delete
      const folderNotes = await db.notes.toArray();
      for (const n of folderNotes) {
        if (n.folderId === deleteModal.id) {
          await db.notes.update(n.id, { isDeleted: true, deletedAt: Date.now() });
        }
      }
      const currentNote = await db.notes.get(selectedNoteId);
      if (currentNote?.folderId === deleteModal.id) setSelectedNoteId(null);
    } else {
      await db.notes.update(deleteModal.id, { isDeleted: true, deletedAt: Date.now() }); // Soft delete
      if (selectedNoteId === deleteModal.id) setSelectedNoteId(null);
    }
    setDeleteModal({ isOpen: false, id: null, type: '', name: '' });
  };

  const toggleFolder = (e, folderId) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: prev[folderId] === undefined ? false : !prev[folderId]
    }));
  };

  return (
    <>
      <ConfirmModal 
        isOpen={deleteModal.isOpen}
        title={`Placer le ${deleteModal.type === 'folder' ? 'dossier' : 'fichier'} dans la corbeille`}
        message={`Êtes-vous sûr de vouloir supprimer "${deleteModal.name}" ? ${deleteModal.type === 'folder' ? 'Toutes les notes à l\'intérieur seront également déplacées vers la corbeille.' : 'Vous pourrez le restaurer depuis la corbeille.'}`}
        onConfirm={executeDelete}
        onCancel={() => setDeleteModal({ ...deleteModal, isOpen: false })}
      />
      
      <RenameModal
        isOpen={renameModal.isOpen}
        title={`Renommer le ${renameModal.type === 'folder' ? 'dossier' : 'fichier'}`}
        initialValue={renameModal.currentValue}
        onConfirm={handleRenameConfirm}
        onCancel={() => setRenameModal({ ...renameModal, isOpen: false })}
      />

      <aside className={`${isFocusMode ? 'w-0 opacity-0 overflow-hidden border-none' : 'w-64 border-r'} h-screen bg-[#F7F7F5] dark:bg-gray-900 border-gray-200 dark:border-gray-800 flex flex-col text-gray-800 dark:text-gray-200 shrink-0 relative transition-all duration-300 print:hidden z-40 whitespace-nowrap`}>
        
        <div onClick={onOpenSettings} className="p-4 flex items-center justify-between hover:bg-gray-200/50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors group">
          <div className="flex items-center gap-2 font-semibold">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">M</div>
            <span>MemorIA</span>
          </div>
          <Settings size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" title="Paramètres" />
        </div>

        <div className="px-3 pb-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Rechercher... (Tags inclus)" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500 text-gray-800 dark:text-gray-200"
            />
          </div>
        </div>

        <div className="px-3 pb-4">
          <button onClick={handleGlobalCreateNote} className="w-full flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700/80 text-sm font-medium transition-all">
            <Plus size={16} /> Nouvelle note
          </button>
        </div>

        {activeDropdown && <div className="fixed inset-0 z-[60]" onClick={() => setActiveDropdown(null)} />}

        <div className="flex-1 overflow-y-auto px-3 space-y-6 pb-4">
          {searchTerm && notes.length === 0 && (
            <p className="px-2 text-sm text-gray-400 dark:text-gray-500 text-center italic mt-4">Aucun résultat trouvé.</p>
          )}

          {favoriteNotes.length > 0 && (
            <div>
              <h3 className="px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Favoris</h3>
              <ul className="space-y-0.5">
                {favoriteNotes.map((note) => (
                  <li key={note.id}>
                    <button onClick={() => setSelectedNoteId(note.id)} className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded text-left transition-colors ${selectedNoteId === note.id ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300' : 'hover:bg-gray-200/50 dark:hover:bg-gray-800'}`}>
                      <Star size={16} className="text-yellow-500 fill-yellow-500/20 shrink-0" />
                      <span className="truncate">{note.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between px-2 mb-1">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dossiers</h3>
              <button onClick={handleCreateFolder} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Nouveau dossier"><Plus size={14} /></button>
            </div>
            <div className="space-y-2 mt-2">
              {activeFolders?.map((folder) => {
                const folderNotes = notes.filter(n => n.folderId === folder.id);
                const hasActiveDropdown = activeDropdown === folder.id || folderNotes.some(n => activeDropdown === `note-${n.id}`);
                const isExpanded = expandedFolders[folder.id] !== false; // Ouvert par défaut
                
                return (
                  <div key={folder.id} className={`relative ${hasActiveDropdown ? 'z-[70]' : 'z-10'}`}>
                    <div 
                      onClick={(e) => toggleFolder(e, folder.id)}
                      className="group relative w-full flex items-center justify-between px-2 py-1.5 text-sm rounded hover:bg-gray-200/50 dark:hover:bg-gray-800 text-left font-medium cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {isExpanded ? (
                          <ChevronDown size={14} className="text-gray-400 dark:text-gray-500 shrink-0" />
                        ) : (
                          <ChevronRight size={14} className="text-gray-400 dark:text-gray-500 shrink-0" />
                        )}
                        <Folder size={16} className="text-gray-500 dark:text-gray-400 shrink-0" />
                        <span className="truncate">{folder.name}</span>
                      </div>

                      <div className={`flex items-center gap-1 shrink-0 ml-2 transition-opacity ${activeDropdown === folder.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <button onClick={(e) => { e.stopPropagation(); handleCreateNote(folder.id); }} className="p-0.5 hover:bg-gray-300 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400" title="Nouvelle note"><Plus size={14} /></button>
                        <div className="relative">
                          <button onClick={(e) => { e.stopPropagation(); setActiveDropdown(folder.id); }} className="p-0.5 hover:bg-gray-300 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400"><MoreVertical size={14} /></button>
                          {activeDropdown === folder.id && (
                            <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 rounded-md py-1 z-[100] origin-top-right">
                              <button onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); setRenameModal({ isOpen: true, id: folder.id, type: 'folder', currentValue: folder.name }); }} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"><Edit2 size={14}/> Renommer</button>
                              <button onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); setDeleteModal({ isOpen: true, id: folder.id, type: 'folder', name: folder.name }); }} className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"><Trash2 size={14}/> Supprimer</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {isExpanded && folderNotes.length > 0 && (
                      <ul className="mt-0.5 space-y-0.5 ml-4 border-l border-gray-200 dark:border-gray-700 pl-2">
                        {folderNotes.map((note) => (
                          <li key={note.id} className={`group relative ${activeDropdown === `note-${note.id}` ? 'z-[70]' : 'z-10'}`}>
                            <div onClick={() => setSelectedNoteId(note.id)} className={`w-full flex items-center justify-between px-2 py-1.5 text-sm rounded text-left transition-colors cursor-pointer ${selectedNoteId === note.id ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-medium' : 'hover:bg-gray-200/50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText size={14} className="shrink-0" />
                                <span className="truncate">{note.title}</span>
                              </div>
                              
                              <div className={`relative shrink-0 transition-opacity ${activeDropdown === `note-${note.id}` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                <span onClick={(e) => { e.stopPropagation(); setActiveDropdown(`note-${note.id}`); }} className="p-0.5 hover:bg-gray-300 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 block"><MoreVertical size={14} /></span>
                                {activeDropdown === `note-${note.id}` && (
                                  <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 rounded-md py-1 z-[100] origin-top-right">
                                    <span onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); setRenameModal({ isOpen: true, id: note.id, type: 'note', currentValue: note.title }); }} className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer"><Edit2 size={14}/> Renommer</span>
                                    <span onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); setDeleteModal({ isOpen: true, id: note.id, type: 'note', name: note.title }); }} className="block w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 cursor-pointer"><Trash2 size={14}/> Corbeille</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* SECTION CORBEILLE */}
          <div className="pt-4 mt-2 border-t border-gray-200 dark:border-gray-800">
            <button 
              onClick={() => setIsTrashOpen(!isTrashOpen)} 
              className="flex items-center justify-between w-full px-2 py-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-200/50 dark:hover:bg-gray-800 rounded transition-colors"
            >
              <div className="flex items-center gap-2">
                <Trash2 size={14} />
                Corbeille {trashedNotes.length > 0 && `(${trashedNotes.length})`}
              </div>
              {isTrashOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            
            {isTrashOpen && trashedNotes.length > 0 && (
              <ul className="mt-2 space-y-0.5 border-l border-gray-200 dark:border-gray-700 pl-2 ml-2">
                {trashedNotes.map((note) => (
                  <li key={note.id}>
                    <button 
                      onClick={() => setSelectedNoteId(note.id)} 
                      className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded text-left transition-colors ${selectedNoteId === note.id ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 font-medium' : 'hover:bg-gray-200/50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
                    >
                      <FileText size={14} className="shrink-0" />
                      <span className="truncate">{note.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {isTrashOpen && trashedNotes.length === 0 && (
              <p className="px-4 mt-2 text-xs text-gray-400 italic">Corbeille vide.</p>
            )}
          </div>

        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-800 shrink-0">
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-800 rounded-md transition-colors"
          >
            <span className="font-medium">{isDark ? 'Mode Clair' : 'Mode Sombre'}</span>
            {isDark ? <Sun size={16} className="text-yellow-500" /> : <Moon size={16} />}
          </button>
        </div>
      </aside>
    </>
  );
};

// --- TOPBAR ---

const TopBar = ({ selectedNoteId, setSelectedNoteId, isFocusMode, setIsFocusMode }) => {
  const folders = useLiveQuery(() => db.folders.toArray(), []);
  const note = useLiveQuery(() => selectedNoteId ? db.notes.get(selectedNoteId) : null, [selectedNoteId]);
  const folder = useLiveQuery(() => note ? db.folders.get(note.folderId) : null, [note?.folderId]);

  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const handleMoveToFolder = async (newFolderId) => {
    if (note && note.folderId !== newFolderId) {
      await db.notes.update(selectedNoteId, { folderId: newFolderId });
    }
    setIsFolderDropdownOpen(false);
  };

  const handleToggleFavorite = async () => {
    if (note) {
      await db.notes.update(selectedNoteId, { isFavorite: !note.isFavorite });
    }
  };

  const handleExportMarkdown = () => {
    if (!note) return;
    const tagsString = note.tags && note.tags.length > 0 ? `\n**Tags:** ${note.tags.join(', ')}\n` : '';
    const mdContent = `# ${note.title}\n${tagsString}\n---\n\n${note.content.replace(/<[^>]*>?/gm, '\n')}`;
    
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${note.title || 'Note'}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setIsExportDropdownOpen(false);
  };

  const handlePrint = () => {
    setIsExportDropdownOpen(false);
    setTimeout(() => {
      try {
        window.print();
      } catch (error) {
        alert("Votre navigateur bloque la fenêtre d'impression. Veuillez utiliser l'exportation Markdown.");
      }
    }, 100);
  };

  // Actions de Corbeille
  const handleRestore = async () => {
    if (note) {
      await db.notes.update(selectedNoteId, { isDeleted: false, deletedAt: null });
    }
  };

  const executeHardDelete = async () => {
    await db.notes.delete(selectedNoteId); // Real hard delete in Dexie
    setSelectedNoteId(null);
    setIsDeleteConfirmOpen(false);
  };

  return (
    <>
      <ConfirmModal 
        isOpen={isDeleteConfirmOpen}
        title="Suppression définitive"
        message="Voulez-vous vraiment supprimer cette note définitivement ? Cette action est irréversible."
        onConfirm={executeHardDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
      <header className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 bg-white dark:bg-gray-950 shrink-0 relative z-30 transition-colors duration-200 print:hidden">
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          
          {/* Toggle Focus Mode */}
          <button 
            onClick={() => setIsFocusMode(!isFocusMode)}
            className="mr-4 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            title={isFocusMode ? "Quitter le mode focus" : "Mode focus (Plein écran)"}
          >
            {isFocusMode ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>

          {folder && note ? (
            <>
              <div className="relative">
                {note.isDeleted ? (
                  <span className="px-2 py-1 -ml-2 rounded-md flex items-center gap-1.5 text-sm font-medium text-red-500 opacity-70">
                    <Trash2 size={14} /> Corbeille
                  </span>
                ) : (
                  <button 
                    onClick={() => setIsFolderDropdownOpen(!isFolderDropdownOpen)}
                    className="hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 -ml-2 rounded-md flex items-center gap-1.5 text-sm font-medium transition-colors"
                    title="Déplacer vers..."
                  >
                    <FolderOpen size={14} className="text-gray-400 dark:text-gray-500" />
                    {folder.name}
                  </button>
                )}

                {isFolderDropdownOpen && !note.isDeleted && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsFolderDropdownOpen(false)} />
                    <div className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg rounded-md z-20 py-1 max-h-64 overflow-y-auto">
                      <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-900 mb-1">
                        Déplacer vers...
                      </div>
                      {folders?.filter(f => !f.isDeleted).map(f => (
                        <button 
                          key={f.id} 
                          onClick={() => handleMoveToFolder(f.id)}
                          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${f.id === folder.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-200'}`}
                        >
                          <Folder size={14} className={f.id === folder.id ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}/> 
                          <span className="truncate">{f.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <ChevronRight size={16} className="mx-1 text-gray-300 dark:text-gray-600" />
              <span className={`font-semibold ${note.isDeleted ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-100'}`}>{note.title}</span>
            </>
          ) : (
            <span className="italic">MemorIA Workspace</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {note && note.isDeleted ? (
            /* ACTIONS CORBEILLE */
            <div className="flex items-center gap-2">
              <button 
                onClick={handleRestore} 
                className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <RefreshCcw size={16} /> Restaurer
              </button>
              <button 
                onClick={() => setIsDeleteConfirmOpen(true)} 
                className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <Trash2 size={16} /> Supprimer définitivement
              </button>
            </div>
          ) : note ? (
            /* ACTIONS NORMALES */
            <>
              <button 
                onClick={handleToggleFavorite}
                className="p-1.5 rounded transition-colors flex items-center hover:bg-gray-100 dark:hover:bg-gray-800"
                title={note.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              >
                <Star 
                  size={18} 
                  className={note.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-400 hover:text-yellow-400"} 
                />
              </button>

              <div className="relative">
                <button 
                  onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                  className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors flex items-center gap-1"
                  title="Exporter / Partager"
                >
                  <Download size={18} />
                </button>
                
                {isExportDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsExportDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg rounded-md z-20 py-1">
                      <button onClick={handleExportMarkdown} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                        <FileDown size={16} className="text-gray-400" />
                        Exporter en Markdown
                      </button>
                      <button onClick={handlePrint} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-t border-gray-100 dark:border-gray-700">
                        <Printer size={16} className="text-gray-400" />
                        Imprimer (PDF)
                      </button>
                    </div>
                  </>
                )}
              </div>
              <button className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors ml-2">
                <MoreHorizontal size={20} />
              </button>
            </>
          ) : null}
        </div>
      </header>
    </>
  );
};

// --- ZONE D'ÉDITION UNIFIÉE ---

const EditorArea = ({ selectedNoteId, showAIButton }) => {
  const note = useLiveQuery(() => selectedNoteId ? db.notes.get(selectedNoteId) : null, [selectedNoteId]);
  
  const [localTitle, setLocalTitle] = useState('');
  const [localTags, setLocalTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const editorRef = useRef(null);
  const contentValueRef = useRef(''); 
  const debounceTimerRef = useRef(null);
  const prevNoteRef = useRef(null);

  // Sécurité pour la corbeille
  const isDeleted = note?.isDeleted || false;
  const isEditable = !isLoading && !isDeleted;

  useEffect(() => {
    if (note) {
      if (prevNoteRef.current?.id !== note.id || prevNoteRef.current?.isDeleted !== note.isDeleted) {
        setLocalTitle(note.title || '');
        setLocalTags(note.tags || []);
        setTagInput('');
        
        const newContent = note.content || '';
        contentValueRef.current = newContent;
        
        if (editorRef.current) {
          editorRef.current.innerHTML = newContent;
        }
      } else {
        if (note.title !== prevNoteRef.current.title) setLocalTitle(note.title || '');
        if (JSON.stringify(note.tags) !== JSON.stringify(prevNoteRef.current.tags)) setLocalTags(note.tags || []);
      }
      
      prevNoteRef.current = { ...note };
    }
  }, [note]);

  useEffect(() => {
    if (!selectedNoteId || !isEditable) return; 
    const timer = setTimeout(() => {
      if (note && (localTitle !== note.title || JSON.stringify(localTags) !== JSON.stringify(note.tags || []))) {
        db.notes.update(selectedNoteId, { title: localTitle, tags: localTags });
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [localTitle, localTags, selectedNoteId, note, isEditable]);

  const handleEditorInput = (e) => {
    const newContent = e.currentTarget.innerHTML;
    contentValueRef.current = newContent;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (selectedNoteId) {
        db.notes.update(selectedNoteId, { content: newContent });
      }
    }, 800);
  };

  const handleAIGeneration = async () => {
    const currentText = contentValueRef.current;
    if (!currentText.trim() || !isEditable || !selectedNoteId) return;
    
    setIsLoading(true);
    const backupText = currentText; // Sauvegarde du brouillon en cas d'erreur
    
    try {
      // Effet "Machine à écrire" via le callback onStream
      const generatedHtml = await formatTextWithAI(currentText, (chunk) => {
        contentValueRef.current = chunk;
        if (editorRef.current) {
          editorRef.current.innerHTML = chunk;
        }
      });
      
      db.notes.update(selectedNoteId, { content: generatedHtml });
    } catch (error) {
      console.error("Erreur IA:", error);
      
      // Restauration silencieuse de l'état initial pour ne rien perdre
      contentValueRef.current = backupText;
      if (editorRef.current) {
        editorRef.current.innerHTML = backupText;
      }
      
      // Alerte claire pour l'utilisateur
      window.alert("Erreur de connexion à l'IA : \n" + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!localTags.includes(newTag)) {
        setLocalTags([...localTags, newTag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setLocalTags(localTags.filter(t => t !== tagToRemove));
  };

  if (!selectedNoteId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-400 dark:text-gray-500 p-8 text-center h-full transition-colors duration-200 print:hidden">
        <div className="w-16 h-16 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-800 shadow-sm mb-4">
           <FileText size={32} className="text-gray-300 dark:text-gray-600" />
        </div>
        <h2 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">Aucune note sélectionnée</h2>
        <p className="max-w-sm">Créez une nouvelle note ou sélectionnez-en une dans la barre latérale pour commencer.</p>
      </div>
    );
  }

  return (
    <div id="printable-area" className="flex-1 flex flex-col p-8 overflow-y-auto h-full bg-white dark:bg-gray-950 relative z-0 transition-colors duration-200 print:overflow-visible print:p-0 print:m-0 print:w-full print:block print:bg-white print:text-black">
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-rich-editor:empty:before,
        .custom-rich-editor > *:first-child:empty:not(:focus):before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          display: block;
        }
        .dark .custom-rich-editor:empty:before,
        .dark .custom-rich-editor > *:first-child:empty:not(:focus):before {
          color: #4b5563;
        }
        @media print {
          body * { visibility: hidden !important; }
          #printable-area, #printable-area * { visibility: visible !important; }
          #printable-area { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100vw !important;
            height: auto !important;
            margin: 0 !important;
            padding: 20px !important;
            background: white !important;
            color: black !important;
          }
          .print\\:hidden, #printable-area .print\\:hidden { display: none !important; }
        }
      `}} />

      {/* En-tête de la note */}
      <div className={`max-w-4xl mx-auto w-full mb-6 print:mb-4 transition-opacity ${isDeleted ? 'opacity-60' : ''}`}>
        <input 
          type="text"
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          className="text-4xl font-extrabold text-gray-800 dark:text-gray-100 mb-4 border-transparent focus:border-transparent focus:ring-0 outline-none w-full placeholder-gray-300 dark:placeholder-gray-700 bg-transparent leading-tight print:text-black print:p-0 print:m-0"
          placeholder="Titre de la note..."
          disabled={!isEditable}
        />
        
        {/* Zone des Tags */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <Tag size={16} className="text-gray-400 mr-1 print:hidden" />
          {localTags.map(tag => (
            <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium border border-gray-200 dark:border-gray-700 print:border-none print:px-0 print:py-0 print:text-sm print:text-gray-600 print:bg-transparent">
              #{tag}
              {!isDeleted && (
                <button 
                  onClick={() => handleRemoveTag(tag)} 
                  className="text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 focus:outline-none print:hidden"
                  title="Supprimer"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
          {!isDeleted && (
            <input 
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder={localTags.length === 0 ? "Ajouter un tag... (Entrée)" : "Ajouter..."}
              className="text-sm bg-transparent border-none outline-none focus:ring-0 text-gray-500 dark:text-gray-400 placeholder-gray-300 dark:placeholder-gray-600 w-40 print:hidden"
              disabled={isLoading}
            />
          )}
        </div>
      </div>

      {/* Éditeur de Texte Unifié */}
      <div className={`flex-1 w-full max-w-4xl mx-auto relative print:w-full print:max-w-none transition-opacity ${isDeleted ? 'opacity-60' : ''}`}>
        <div 
          ref={editorRef}
          contentEditable={isEditable}
          suppressContentEditableWarning
          onInput={handleEditorInput}
          data-placeholder="Tapez vos notes ici ou utilisez l'IA..."
          className={`custom-rich-editor min-h-[50vh] outline-none text-gray-800 dark:text-gray-200 prose prose-blue dark:prose-invert prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-xl prose-p:leading-relaxed prose-li:my-1 max-w-none pb-24 transition-opacity print:text-black ${!isEditable ? 'opacity-70 cursor-not-allowed' : ''}`}
        />
      </div>

      {/* Bouton IA Flottant */}
      {showAIButton && !isDeleted && (
        <div className="fixed bottom-8 right-8 z-50 print:hidden">
          <button 
            onClick={handleAIGeneration}
            disabled={isLoading || contentValueRef.current.replace(/<[^>]*>?/gm, '').trim().length === 0}
            className={`px-5 py-3 rounded-full shadow-lg font-medium flex items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95
              ${isLoading || contentValueRef.current.replace(/<[^>]*>?/gm, '').trim().length === 0 ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/30'}`}
          >
            {isLoading ? (
              <><Loader2 size={20} className="animate-spin" /> ✨ L'IA réfléchit...</>
            ) : (
              <><Wand2 size={20} /> ✨ Mettre en forme (IA)</>
            )}
          </button>
        </div>
      )}

    </div>
  );
};

export default function App() {
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  
  const [showAIButton, setShowAIButton] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('showAIButton') !== 'false';
    }
    return true;
  });

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <div className="flex h-screen w-full bg-white dark:bg-gray-950 overflow-hidden font-sans transition-colors duration-200">
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        showAIButton={showAIButton}
        setShowAIButton={setShowAIButton}
      />
      
      <Sidebar 
        selectedNoteId={selectedNoteId} 
        setSelectedNoteId={setSelectedNoteId} 
        isDark={isDark} 
        toggleTheme={toggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isFocusMode={isFocusMode}
      />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative print:h-auto print:overflow-visible print:w-full print:block">
        <TopBar 
          selectedNoteId={selectedNoteId} 
          setSelectedNoteId={setSelectedNoteId}
          isFocusMode={isFocusMode} 
          setIsFocusMode={setIsFocusMode} 
        />
        <EditorArea 
          selectedNoteId={selectedNoteId} 
          showAIButton={showAIButton}
        />
      </main>
    </div>
  );
}