import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FolderPlus, Server, HardDrive, FileText, Trash2, Plus, CreditCard as Edit, Save, X, LogOut, BookOpen, Users, TestTube } from 'lucide-react';
import { useData, Note, PracticeTest, Practical, Subject, Assignment } from '../context/DataContext';
import { fileStorageService, FileUploadData } from '../services/fileStorage';

const AdminPanel: React.FC = () => {
  const {
    isLoggedIn,
    logout,
    subjects = [],
    notes = [],
    practiceTests = [],
    practicals = [],
    assignments = [], // new
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
    syncWithServer
  } = useData();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'subjects' | 'notes' | 'practice-tests' | 'practicals' | 'assignments'>('subjects'); // added assignments
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [newSubject, setNewSubject] = useState<{ name: string; units: string[] }>({
    name: '',
    units: ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5']
  });
  const [uploadForm, setUploadForm] = useState<{
    type: 'notes' | 'practice-tests' | 'practicals' | 'assignments';
    title: string;
    description: string;
    subject: string;
    unit: string;
    file: File | null;
  }>({
    type: 'notes',
    title: '',
    description: '',
    subject: '',
    unit: '',
    file: null
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Check server status on component mount
  useEffect(() => {
    const checkServer = async () => {
      const isOnline = await fileStorageService.checkServerHealth();
      setServerStatus(isOnline ? 'online' : 'offline');
    };
    
    checkServer();
    const interval = setInterval(checkServer, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Manual sync button handler
  const handleManualSync = async () => {
    try {
      console.log('Starting manual sync...');
      await syncWithServer();
      alert('Successfully synced with server storage! All devices should now see the same files.');
    } catch (error) {
      console.error('Manual sync failed:', error);
      alert('Failed to sync with server. Please try again.');
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/admin-login');
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    console.log('AdminPanel rendered with subjects:', subjects);
  }, [subjects]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setUploadForm(prev => ({ ...prev, file }));
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!uploadForm.file || !uploadForm.title || !uploadForm.subject) {
      alert('Please fill in all required fields and select a file');
      return;
    }

    // Check if title and subject are not just whitespace
    if (!uploadForm.title.trim() || !uploadForm.subject.trim()) {
      alert('Title and subject cannot be empty');
      return;
    }

    // For notes, unit is required
    if (activeTab === 'notes' && !uploadForm.unit?.trim()) {
      alert('Please select a unit for notes');
      return;
    }

    // Check server status but don't block upload
    if (serverStatus === 'offline') {
      console.warn('Server appears offline, but attempting upload anyway...');
    }

    setIsUploading(true);
    setUploadProgress(0);

    const currentType = (activeTab === 'notes' || activeTab === 'practice-tests' || activeTab === 'practicals' || activeTab === 'assignments')
      ? activeTab
      : uploadForm.type;

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const uploadData: FileUploadData = {
        title: uploadForm.title.trim(),
        description: uploadForm.description.trim(),
        subject: uploadForm.subject.trim(),
        unit: uploadForm.unit?.trim() || '',
        type: currentType as 'notes' | 'practice-tests' | 'practicals' | 'assignments',
        file: uploadForm.file
      };

      console.log('Starting upload with data:', {
        title: uploadData.title,
        subject: uploadData.subject,
        type: uploadData.type,
        unit: uploadData.unit,
        fileName: uploadData.file.name,
        fileSize: uploadData.file.size
      });
      const storedFile = await fileStorageService.uploadFile(uploadData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (storedFile) {
        // Generate consistent unique ID
        const timestamp = Date.now();
        const uniqueId = currentType === 'notes' 
          ? `note-${storedFile.subject}-${storedFile.unit || ''}-${storedFile.storedFileName}-${timestamp}`
          : currentType === 'practice-tests'
          ? `test-${storedFile.subject}-${storedFile.storedFileName}-${timestamp}`
          : currentType === 'practicals'
          ? `practical-${storedFile.subject}-${storedFile.storedFileName}-${timestamp}`
          : `assignment-${storedFile.subject}-${storedFile.storedFileName}-${timestamp}`; // assignments id
        
        const baseItem = {
          id: uniqueId,
          title: storedFile.title,
          description: storedFile.description,
          fileName: storedFile.fileName,
          fileSize: storedFile.fileSize,
          uploadDate: storedFile.uploadDate,
          type: storedFile.fileType,
          filePath: storedFile.filePath,
          storedFileName: storedFile.storedFileName
        };

        if (currentType === 'notes') {
          const note: Note = {
            ...baseItem,
            subject: storedFile.subject,
            unit: storedFile.unit || ''
          } as Note;
          addNote(note);
        } else if (currentType === 'practice-tests') {
          const test: PracticeTest = {
            ...baseItem,
            subject: storedFile.subject
          } as PracticeTest;
          addPracticeTest(test);
        } else if (currentType === 'practicals') {
          const practical: Practical = {
            ...baseItem,
            subject: storedFile.subject
          } as Practical;
          addPractical(practical);
        } else if (currentType === 'assignments') {
          const assignment: Assignment = {
            ...baseItem,
            subject: storedFile.subject
          } as Assignment;
          addAssignment(assignment);
        }

        // Show success message
        alert('File uploaded successfully!');

        // Success animation
        setTimeout(() => {
          setUploadProgress(0);
          setIsUploading(false);
          
          // Reset form
          setUploadForm({
            type: currentType as 'notes' | 'practice-tests' | 'practicals' | 'assignments',
            title: '',
            description: '',
            subject: '',
            unit: '',
            file: null
          });
          
          // Reset file input
          const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
          if (fileInput) {
            fileInput.value = '';
          }
          
          // Trigger a sync to refresh the display
          syncWithServer();
        }, 1000);
      } else {
        throw new Error('No file data returned from server');
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('Full error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      
      alert(`Upload failed: ${errorMessage}\n\nPlease check the console for more details and ensure the server is running.`);
      
      setUploadProgress(0);
      setIsUploading(false);
    }
  };

  const handleAddSubject = () => {
    if (newSubject.name.trim()) {
      addSubject({
        id: Date.now().toString(),
        name: newSubject.name.trim(),
        units: newSubject.units?.filter(unit => unit.trim()) ?? []
      } as Subject);
      setNewSubject({ name: '', units: ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5'] });
      setIsAddingSubject(false);
    } else {
      alert('Subject name cannot be empty');
    }
  };

  const handleEditSubject = (subject: Subject) => {
    console.log('Edit button clicked for subject:', getSubjectName(subject), 'ID:', subject.id);
    setEditingSubject(subject.id);
    setNewSubject({ 
      name: subject.name, 
      units: (subject.units ?? []).map(unit => typeof unit === 'object' ? unit.name || '' : unit)
    });
  };

  const handleUpdateSubject = () => {
    if (editingSubject && newSubject.name.trim()) {
      const oldSubject = subjects.find(s => s.id === editingSubject);
      const newSubjectName = newSubject.name.trim();

      updateSubject(editingSubject, {
        id: editingSubject,
        name: newSubjectName,
        units: newSubject.units?.filter(unit => unit.trim()) ?? []
      } as Subject);

      if (oldSubject && oldSubject.name !== newSubjectName) {
        const updatedNotes = notes.map(note =>
          note.subject === oldSubject.name ? { ...note, subject: newSubjectName } : note
        );
        updateNotes(updatedNotes);

        const updatedTests = practiceTests.map(test =>
          test.subject === oldSubject.name ? { ...test, subject: newSubjectName } : test
        );
        updatePracticeTests(updatedTests);

        const updatedPracticals = practicals.map(practical =>
          practical.subject === oldSubject.name ? { ...practical, subject: newSubjectName } : practical
        );
        updatePracticals(updatedPracticals);

        const updatedAssignments = assignments.map(assign =>
          assign.subject === oldSubject.name ? { ...assign, subject: newSubjectName } : assign
        );
        updateAssignments(updatedAssignments);
      }

      setEditingSubject(null);
      setNewSubject({ name: '', units: ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5'] });
    } else {
      alert('Subject name cannot be empty');
    }
  };

  // Helper function to extract unit name from unit object or string
  const getUnitName = (unit: any): string => {
    if (typeof unit === 'string') return unit;
    if (unit && typeof unit === 'object') return unit.name || '';
    return '';
  };

  // Helper function to extract subject name from subject object or string
  const getSubjectName = (subject: any): string => {
    if (typeof subject === 'string') return subject;
    if (subject && typeof subject === 'object') return subject.name || '';
    return '';
  };

  if (!isLoggedIn) {
    console.log('User not logged in, redirecting to admin-login');
    return null;
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 slide-up enhanced-shadow glass-effect p-6 rounded-2xl">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gradient neon-glow enhanced-text">Admin Panel</h1>
            <p className="enhanced-text opacity-80">Manage subjects, notes, practice tests, practicals and assignments</p>
            
            {/* Server Status */}
            <div className="flex items-center space-x-2 mt-2">
              <Server className="h-4 w-4" />
              <span className={`text-sm font-bold ${
                serverStatus === 'online' ? 'text-green-500' : serverStatus === 'offline' ? 'text-red-500' : 'text-yellow-500'
              }`}>
                Server: {serverStatus.charAt(0).toUpperCase() + serverStatus.slice(1)}
              </span>
            </div>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={handleManualSync}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover-scale font-bold shimmer-effect"
            >
              <HardDrive className="h-4 w-4" />
              <span>Sync with Server</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover-scale font-bold shimmer-effect"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 overflow-x-auto">
          <button
            onClick={() => {
              console.log('Switching to subjects tab');
              setActiveTab('subjects');
            }}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-bold transition-all duration-300 ${
              activeTab === 'subjects'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white neon-glow enhanced-shadow'
                : 'bg-high-contrast enhanced-text hover-scale'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Subjects</span>
          </button>
          <button
            onClick={() => {
              console.log('Switching to notes tab');
              setActiveTab('notes');
            }}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-bold transition-all duration-300 ${
              activeTab === 'notes'
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white neon-glow enhanced-shadow'
                : 'bg-high-contrast enhanced-text hover-scale'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Notes</span>
          </button>
          <button
            onClick={() => {
              console.log('Switching to practice-tests tab');
              setActiveTab('practice-tests');
            }}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-bold transition-all duration-300 ${
              activeTab === 'practice-tests'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white neon-glow enhanced-shadow'
                : 'bg-high-contrast enhanced-text hover-scale'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Practice Tests</span>
          </button>
          <button
            onClick={() => {
              console.log('Switching to practicals tab');
              setActiveTab('practicals');
            }}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-bold transition-all duration-300 ${
              activeTab === 'practicals'
                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white neon-glow enhanced-shadow'
                : 'bg-high-contrast enhanced-text hover-scale'
            }`}
          >
            <TestTube className="h-4 w-4" />
            <span>Practicals</span>
          </button>

          {/* <- NEW: Assignments Tab */}
          <button
            onClick={() => {
              console.log('Switching to assignments tab');
              setActiveTab('assignments');
            }}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-bold transition-all duration-300 ${
              activeTab === 'assignments'
                ? 'bg-gradient-to-r from-teal-500 to-green-600 text-white neon-glow enhanced-shadow'
                : 'bg-high-contrast enhanced-text hover-scale'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Assignments</span>
          </button>
        </div>

        {/* Subjects Tab */}
        {activeTab === 'subjects' && (
          <div className="space-y-6">
            {/* Add/Edit Subject Form */}
            <div className="glass-effect p-6 rounded-2xl fade-in-up enhanced-shadow">
              <h3 className="text-xl font-semibold mb-4 enhanced-text neon-glow">
                {editingSubject ? 'Edit Subject' : 'Add New Subject'}
              </h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Subject Name"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-high-contrast rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none enhanced-text"
                />
                <div className="space-y-2">
                  {newSubject.units.map((unit, index) => (
                    <div key={index} className="flex space-x-2">
                      <input
                        type="text"
                        placeholder={`Unit ${index + 1}`}
                        value={unit}
                        onChange={(e) => {
                          const newUnits = [...newSubject.units];
                          newUnits[index] = e.target.value;
                          setNewSubject(prev => ({ ...prev, units: newUnits }));
                        }}
                        className="flex-1 px-4 py-2 bg-high-contrast rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none enhanced-text"
                      />
                      <button
                        type="button"
                        onClick={() => setNewSubject(prev => ({
                          ...prev,
                          units: prev.units.filter((_, i) => i !== index)
                        }))}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg hover-scale"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setNewSubject(prev => ({ ...prev, units: [...prev.units, `Unit ${prev.units.length + 1}`] }))}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover-scale"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Unit</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={editingSubject ? handleUpdateSubject : handleAddSubject}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover-scale font-bold shimmer-effect"
                >
                  {editingSubject ? <><Save className="h-4 w-4" /><span>Update Subject</span></> : <><FolderPlus className="h-4 w-4" /><span>Add Subject</span></>}
                </button>
                {editingSubject && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSubject(null);
                      setNewSubject({ name: '', units: ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5'] });
                    }}
                    className="ml-4 px-6 py-3 bg-gray-500 text-white rounded-lg hover-scale"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Subjects List */}
            <div className="glass-effect p-6 rounded-2xl enhanced-shadow">
              <h3 className="text-xl font-semibold mb-4 enhanced-text neon-glow">Subjects</h3>
              {subjects.length === 0 ? (
                <p className="text-sm enhanced-text opacity-80">No subjects available. Add a subject above.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjects.map((subject, index) => (
                    <div
                      key={subject.id}
                      className="glass-effect p-4 rounded-lg hover-scale slide-up enhanced-shadow"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <h4 className="font-bold mb-2 enhanced-text neon-glow">{getSubjectName(subject)}</h4>
                      <p className="text-sm enhanced-text opacity-80 mb-3">
                        Units: {(subject.units ?? []).map(getUnitName).join(', ') || 'None'}
                      </p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            console.log('Edit button clicked for subject:', getSubjectName(subject), 'ID:', subject.id);
                            handleEditSubject(subject);
                          }}
                          className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900 text-blue-700 dark:text-blue-300 rounded-lg hover-scale text-sm"
                          type="button"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                        <button
  onClick={async () => {
    console.log(`Delete button clicked for subject: ${getSubjectName(subject)} (ID: ${subject.id})`);
    if (window.confirm(`Are you sure you want to delete ${getSubjectName(subject)}? This will delete all associated notes, practice tests, practicals, and assignments.`)) {
      try {
        await deleteSubject(subject.id);   // 👈 THIS LINE CALLS deleteSubject
        console.log(`Successfully deleted subject: ${getSubjectName(subject)}`);
        await syncWithServer();
        alert('Subject deleted successfully!');
      } catch (error) {
        console.error('Failed to delete subject:', {
          subject: getSubjectName(subject),
          id: subject.id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        alert('Failed to delete subject. Please check the console for details and try again.');
      }
    }
  }}
  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 ..."
  type="button"
>
  <Trash2 className="h-3 w-3" />
  <span>Delete</span>
</button>

                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* File Upload Tabs (notes / practice-tests / practicals / assignments) */}
        {(activeTab === 'notes' || activeTab === 'practice-tests' || activeTab === 'practicals' || activeTab === 'assignments') && (
          <div className="space-y-6">
            {/* Upload Form */}
            <div className="glass-effect p-6 rounded-2xl fade-in-up enhanced-shadow">
              <h3 className="text-xl font-semibold mb-4 enhanced-text neon-glow">
                Upload {activeTab === 'notes' ? 'Notes' : activeTab === 'practice-tests' ? 'Practice Test' : activeTab === 'practicals' ? 'Practical' : 'Assignment'}
              </h3>

              {/* Upload Progress */}
              {isUploading && (
                <div className="mb-6 file-upload-success">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold enhanced-text">Uploading to dedicated storage...</span>
                    <span className="text-sm font-bold enhanced-text">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div 
                      className="progress-bar h-full rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <form onSubmit={handleFileUpload} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Title"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    className="px-4 py-3 bg-high-contrast rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none enhanced-text"
                    required
                    disabled={isUploading}
                  />

                  <select
                    value={uploadForm.subject}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, subject: e.target.value, unit: '' }))}
                    className="px-4 py-3 bg-high-contrast rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none enhanced-text"
                    required
                    disabled={isUploading}
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(subject => (
                      <option 
                        key={subject.id} 
                        value={getSubjectName(subject)}
                      >
                        {getSubjectName(subject)}
                      </option>
                    ))}
                  </select>
                </div>

                {activeTab === 'notes' && uploadForm.subject && (
                  <select
                    value={uploadForm.unit}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-4 py-3 bg-high-contrast rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none enhanced-text"
                    required
                    disabled={isUploading}
                  >
                    <option value="">Select Unit</option>
                    {(subjects.find(s => getSubjectName(s) === uploadForm.subject)?.units ?? []).map((unit, index) => (
                      <option 
                        key={index} 
                        value={getUnitName(unit)}
                      >
                        {getUnitName(unit)}
                      </option>
                    ))}
                  </select>
                )}

                <textarea
                  placeholder="Description (optional)"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-high-contrast rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none enhanced-text"
                  disabled={isUploading}
                />

                <div className="upload-zone p-6 rounded-lg">
                  <label className="block text-sm font-bold enhanced-text mb-2">
                    Upload File (PDF or Image) - No Size Limit
                  </label>
                  <input
                    type="file"
                    accept=".pdf,jpg,jpeg,png,gif"
                    onChange={handleFileChange}
                    className="w-full px-4 py-3 bg-high-contrast rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none enhanced-text file-icon"
                    required
                    disabled={isUploading}
                  />
                  {uploadForm.file && (
                    <p className="mt-2 text-sm enhanced-text opacity-80 font-bold">
                      Selected: {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover-scale font-bold shimmer-effect disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="h-4 w-4" />
                  <span>{isUploading ? 'Uploading...' : 'Upload to Storage'}</span>
                </button>
              </form>
            </div>

            {/* Files List */}
            <div className="glass-effect p-6 rounded-2xl enhanced-shadow">
              <h3 className="text-xl font-semibold mb-4 enhanced-text neon-glow">
                Uploaded {activeTab === 'notes' ? 'Notes' : activeTab === 'practice-tests' ? 'Practice Tests' : activeTab === 'practicals' ? 'Practicals' : 'Assignments'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(activeTab === 'notes' ? notes : activeTab === 'practice-tests' ? practiceTests : activeTab === 'practicals' ? practicals : assignments).map((item, index) => (
                  <div
                    key={item.id}
                    className="glass-effect p-4 rounded-lg hover-scale slide-up enhanced-shadow"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <h4 className="font-bold mb-2 enhanced-text neon-glow">{item.title}</h4>
                    <p className="text-sm enhanced-text opacity-80 mb-2">{item.description}</p>
                    <div className="text-xs enhanced-text opacity-70 mb-3">
                      <p>File: {item.fileName}</p>
                      <p>Size: {item.fileSize}</p>
                      <p>Date: {item.uploadDate}</p>
                      {activeTab === 'notes' && (item as any)?.unit && <p>Unit: {getUnitName((item as any).unit)}</p>}
                      {(item as any)?.subject && <p>Subject: {getSubjectName((item as any).subject)}</p>}
                    </div>
                    <button
                      onClick={() => {
                        console.log(`Delete button clicked for ${activeTab} item:`, item.id, 'Subject:', getSubjectName((item as any).subject));
                        const handleDelete = async () => {
                          try {
                            let success = false;
                            
                            if (activeTab === 'notes') {
                              const note = item as any;
                              if (note.storedFileName && note.subject && note.unit) {
                                success = await fileStorageService.deleteFile(
                                  note.subject, 
                                  'notes', 
                                  note.storedFileName, 
                                  note.unit
                                );
                              }
                              if (success || !note.storedFileName) {
                                deleteNote(item.id);
                              }
                            } else if (activeTab === 'practice-tests') {
                              const test = item as any;
                              if (test.storedFileName && test.subject) {
                                success = await fileStorageService.deleteFile(
                                  test.subject, 
                                  'practice-tests', 
                                  test.storedFileName
                                );
                              }
                              if (success || !test.storedFileName) {
                                deletePracticeTest(item.id);
                              }
                            } else if (activeTab === 'practicals') {
                              const practical = item as any;
                              if (practical.storedFileName && practical.subject) {
                                success = await fileStorageService.deleteFile(
                                  practical.subject, 
                                  'practicals', 
                                  practical.storedFileName
                                );
                              }
                              if (success || !practical.storedFileName) {
                                deletePractical(item.id);
                              }
                            } else {
                              // assignments
                              const assignment = item as any;
                              if (assignment.storedFileName && assignment.subject) {
                                success = await fileStorageService.deleteFile(
                                  assignment.subject,
                                  'assignments',
                                  assignment.storedFileName
                                );
                              }
                              if (success || !assignment.storedFileName) {
                                deleteAssignment(item.id);
                              }
                            }
                            
                            if (!success && (item as any).storedFileName) {
                              alert('Failed to delete file from storage. Please try again.');
                            } else {
                              console.log(`Successfully deleted ${activeTab} item:`, item.id);
                            }
                          } catch (error) {
                            console.error('Error deleting file:', {
                              id: item.id,
                              subject: getSubjectName((item as any).subject),
                              error: error instanceof Error ? error.message : String(error),
                              stack: error instanceof Error ? error.stack : undefined
                            });
                            alert('Error deleting file. Please try again.');
                          }
                        };
                        
                        handleDelete();
                      }}
                      className="flex items-center space-x-1 px-3 py-2 bg-gradient-to-r from-red-100 to-pink-100 dark:from-red-900 dark:to-pink-900 text-red-700 dark:text-red-300 rounded-lg hover-scale text-sm font-bold"
                      type="button"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;

