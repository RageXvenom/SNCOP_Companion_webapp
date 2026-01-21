import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fileStorageService } from '../services/fileStorage';

interface ServerFile {
  filename: string;
  size: string;
  modified: string;
  type: 'pdf' | 'image';
  title?: string;
  description?: string;
}

interface ServerSubjectData {
  notes?: Record<string, ServerFile[]>;
  'practice-tests'?: ServerFile[];
  practicals?: ServerFile[];
  assignments?: ServerFile[]; // <- added assignments
}

interface ServerStorage {
  storageStructure: Record<string, ServerSubjectData>;
}

export interface Note {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  subject: string;
  unit: string;
  type: 'pdf' | 'image';
  fileData?: string;
  filePath?: string;
  storedFileName?: string;
}

export interface PracticeTest {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  subject: string;
  type: 'pdf' | 'image';
  fileData?: string;
  filePath?: string;
  storedFileName?: string;
}

export interface Practical {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  subject: string;
  type: 'pdf' | 'image';
  fileData?: string;
  filePath?: string;
  storedFileName?: string;
}

// <== NEW: Assignment interface (mirrors Practical) ==>
export interface Assignment {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  subject: string;
  type: 'pdf' | 'image';
  fileData?: string;
  filePath?: string;
  storedFileName?: string;
}

export interface Subject {
  id: string;
  name: string;
  units: string[];
}

interface DataContextType {
  subjects: Subject[];
  notes: Note[];
  practiceTests: PracticeTest[];
  practicals: Practical[];
  assignments: Assignment[]; // <- added to context type
  isLoggedIn: boolean;
  addSubject: (subject: Subject) => void;
  updateSubject: (id: string, updatedSubject: Subject) => void;
  deleteSubject: (id: string) => Promise<void>;
  addNote: (note: Note) => void;
  deleteNote: (id: string) => void;
  addPracticeTest: (test: PracticeTest) => void;
  deletePracticeTest: (id: string) => void;
  addPractical: (practical: Practical) => void;
  deletePractical: (id: string) => void;
  addAssignment: (assignment: Assignment) => void; // new
  deleteAssignment: (id: string) => void; // new
  updateNotes: (notes: Note[]) => void;
  updatePracticeTests: (tests: PracticeTest[]) => void;
  updatePracticals: (practicals: Practical[]) => void;
  updateAssignments: (assignments: Assignment[]) => void; // new
  login: (email: string, password: string) => boolean;
  logout: () => void;
  syncWithServer: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subjects, setSubjects] = useState<Subject[]>(() => JSON.parse(localStorage.getItem('sncop_subjects') || '[]'));
  const [notes, setNotes] = useState<Note[]>(() => JSON.parse(localStorage.getItem('sncop_notes') || '[]'));
  const [practiceTests, setPracticeTests] = useState<PracticeTest[]>(() => JSON.parse(localStorage.getItem('sncop_practice_tests') || '[]'));
  const [practicals, setPracticals] = useState<Practical[]>(() => JSON.parse(localStorage.getItem('sncop_practicals') || '[]'));
  const [assignments, setAssignments] = useState<Assignment[]>(() => JSON.parse(localStorage.getItem('sncop_assignments') || '[]')); // new
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('sncop_admin_logged_in') === 'true');

  const saveToLocalStorage = useCallback((key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  }, []);

  useEffect(() => { saveToLocalStorage('sncop_subjects', subjects); }, [subjects, saveToLocalStorage]);
  useEffect(() => { saveToLocalStorage('sncop_notes', notes); }, [notes, saveToLocalStorage]);
  useEffect(() => { saveToLocalStorage('sncop_practice_tests', practiceTests); }, [practiceTests, saveToLocalStorage]);
  useEffect(() => { saveToLocalStorage('sncop_practicals', practicals); }, [practicals, saveToLocalStorage]);
  useEffect(() => { saveToLocalStorage('sncop_assignments', assignments); }, [assignments, saveToLocalStorage]); // new

  const login = (email: string, password: string) => {
    const success = email === ADMIN_EMAIL && password === ADMIN_PASSWORD;
    setIsLoggedIn(success);
    localStorage.setItem('sncop_admin_logged_in', success ? 'true' : 'false');
    return success;
  };

  const logout = () => {
    setIsLoggedIn(false);
    localStorage.setItem('sncop_admin_logged_in', 'false');
  };

  // ⏳ Cooldown ref
  const lastSyncRef = useRef<number>(0);

  const syncWithServer = useCallback(async () => {
    const now = Date.now();

    // ✅ enforce 5 min (300000 ms) cooldown
    if (now - lastSyncRef.current < 300000) {
      console.log("⏳ Sync skipped due to cooldown");
      return;
    }
    lastSyncRef.current = now;

    try {
      const serverStorage: ServerStorage | null = await fileStorageService.syncWithServer();
      if (!serverStorage || !serverStorage.storageStructure) return;

      const serverSubjects: Subject[] = [];
      const serverNotes: Note[] = [];
      const serverPracticeTests: PracticeTest[] = [];
      const serverPracticals: Practical[] = [];
      const serverAssignments: Assignment[] = []; // new

      Object.entries(serverStorage.storageStructure)
        .filter(([subjectName]) => subjectName.toLowerCase() !== 'temp')
        .forEach(([subjectName, subjectData], idx) => {
          const units = subjectData.notes ? Object.keys(subjectData.notes) : [];

          serverSubjects.push({
            id: (subjects.find(s => s.name === subjectName)?.id) || String(idx + 1),
            name: subjectName,
            units: units.length ? units : ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5']
          });

          if (subjectData.notes) {
            Object.entries(subjectData.notes).forEach(([unitName, unitFiles]) => {
              unitFiles.forEach((file: ServerFile) => {
                serverNotes.push({
                  id: `note-${subjectName}-${unitName}-${file.filename}-${Date.now()}`,
                  title: file.title || file.filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
                  description: file.description || '',
                  fileName: file.filename,
                  fileSize: file.size || '0 KB',
                  uploadDate: file.modified || new Date().toLocaleDateString(),
                  subject: subjectName,
                  unit: unitName,
                  type: file.type || 'pdf',
                  storedFileName: file.filename
                });
              });
            });
          }

          if (subjectData['practice-tests']) {
            subjectData['practice-tests'].forEach((file: ServerFile) => {
              serverPracticeTests.push({
                id: `test-${subjectName}-${file.filename}-${Date.now()}`,
                title: file.title || file.filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
                description: file.description || '',
                fileName: file.filename,
                fileSize: file.size || '0 KB',
                uploadDate: file.modified || new Date().toLocaleDateString(),
                subject: subjectName,
                type: file.type || 'pdf',
                storedFileName: file.filename
              });
            });
          }

          if (subjectData.practicals) {
            subjectData.practicals.forEach((file: ServerFile) => {
              serverPracticals.push({
                id: `practical-${subjectName}-${file.filename}-${Date.now()}`,
                title: file.title || file.filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
                description: file.description || '',
                fileName: file.filename,
                fileSize: file.size || '0 KB',
                uploadDate: file.modified || new Date().toLocaleDateString(),
                subject: subjectName,
                type: file.type || 'pdf',
                storedFileName: file.filename
              });
            });
          }

          // <- NEW: assignments sync
          if (subjectData.assignments) {
            subjectData.assignments.forEach((file: ServerFile) => {
              serverAssignments.push({
                id: `assignment-${subjectName}-${file.filename}-${Date.now()}`,
                title: file.title || file.filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
                description: file.description || '',
                fileName: file.filename,
                fileSize: file.size || '0 KB',
                uploadDate: file.modified || new Date().toLocaleDateString(),
                subject: subjectName,
                type: file.type || 'pdf',
                storedFileName: file.filename
              });
            });
          }
        });

      setSubjects(serverSubjects);
      setNotes(serverNotes);
      setPracticeTests(serverPracticeTests);
      setPracticals(serverPracticals);
      setAssignments(serverAssignments); // new
      console.log("✅ Synced with server at", new Date().toLocaleTimeString(), {
        subjects: serverSubjects.length,
        notes: serverNotes.length,
        practiceTests: serverPracticeTests.length,
        practicals: serverPracticals.length,
        assignments: serverAssignments.length
      });
    } catch (error) {
      console.error('Error syncing with server:', error);
    }
  }, [subjects]);

  useEffect(() => {
    syncWithServer();
    const interval = setInterval(syncWithServer, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [syncWithServer]);

  const addSubject = (subject: Subject) => {
    fileStorageService.createSubject(subject.name, subject.units);
    setSubjects(prev => [...prev, subject]);
  };

  const updateSubject = (id: string, updatedSubject: Subject) => {
    const oldSubject = subjects.find(s => s.id === id);
    if (oldSubject) {
      fileStorageService.createSubject(updatedSubject.name, updatedSubject.units);
    }
    setSubjects(prev => prev.map(s => (s.id === id ? updatedSubject : s)));
  };

  const deleteSubject = async (id: string) => {
    const subjectToDelete = subjects.find(s => s.id === id);
    if (!subjectToDelete) return;

    try {
      console.log(`Deleting subject: ${subjectToDelete.name}`);
      console.log('Calling API with:', `${subjectToDelete.name}`);

      const success = await fileStorageService.deleteSubject(subjectToDelete.name.trim());
      if (!success) throw new Error(`Server failed to delete subject: ${subjectToDelete.name}`);

      setSubjects(prev => prev.filter(s => s.id !== id));
      setNotes(prev => prev.filter(n => n.subject !== subjectToDelete.name));
      setPracticeTests(prev => prev.filter(t => t.subject !== subjectToDelete.name));
      setPracticals(prev => prev.filter(p => p.subject !== subjectToDelete.name));
      setAssignments(prev => prev.filter(a => a.subject !== subjectToDelete.name)); // new

      await syncWithServer();
      console.log(`Subject deleted: ${subjectToDelete.name}`);
    } catch (error) {
      console.error('Delete subject failed:', error);
      throw error;
    }
  };

  // CRUD helpers
  const addNote = (note: Note) => setNotes(prev => [...prev, note]);
  const deleteNote = (id: string) => setNotes(prev => prev.filter(n => n.id !== id));
  const addPracticeTest = (test: PracticeTest) => setPracticeTests(prev => [...prev, test]);
  const deletePracticeTest = (id: string) => setPracticeTests(prev => prev.filter(t => t.id !== id));
  const addPractical = (practical: Practical) => setPracticals(prev => [...prev, practical]);
  const deletePractical = (id: string) => setPracticals(prev => prev.filter(p => p.id !== id));

  // <- NEW: assignments helpers
  const addAssignment = (assignment: Assignment) => setAssignments(prev => [...prev, assignment]);
  const deleteAssignment = (id: string) => setAssignments(prev => prev.filter(a => a.id !== id));
  const updateNotes = (newNotes: Note[]) => setNotes(newNotes);
  const updatePracticeTests = (tests: PracticeTest[]) => setPracticeTests(tests);
  const updatePracticals = (practicalsArg: Practical[]) => setPracticals(practicalsArg);
  const updateAssignments = (assignmentsArg: Assignment[]) => setAssignments(assignmentsArg); // new

  return (
    <DataContext.Provider
      value={{
        subjects,
        notes,
        practiceTests,
        practicals,
        assignments, // new
        isLoggedIn,
        addSubject,
        updateSubject,
        deleteSubject,
        addNote,
        deleteNote,
        addPracticeTest,
        deletePracticeTest,
        addPractical,
        deletePractical,
        addAssignment, // new
        deleteAssignment, // new
        updateNotes,
        updatePracticeTests,
        updatePracticals,
        updateAssignments, // new
        login,
        logout,
        syncWithServer
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};

