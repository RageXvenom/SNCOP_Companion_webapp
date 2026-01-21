import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Clock, Eye, BookOpen, Users } from 'lucide-react';
import { useData } from '../context/DataContext';
import FileViewer from '../components/FileViewer';
import SortFilter from '../components/SortFilter';

const SubjectNotes: React.FC = () => {
  const params = useParams();
  const subjectParam = params.subject ?? '';
  const { subjects = [], notes = [], practicals = [] } = useData();
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'notes' | 'practicals'>('notes');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<'newest' | 'oldest'>('newest');
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [viewerState, setViewerState] = useState({
    isOpen: false,
    fileData: '',
    fileName: '',
    fileType: 'pdf' as 'pdf' | 'image',
    subject: '',
    type: '',
    unit: '',
    storedFileName: ''
  });

  const subjectName = subjectParam ? decodeURIComponent(subjectParam) : '';
  const currentSubject = subjects.find(s => s.name === subjectName);

  const subjectNotes = notes.filter(note => note.subject === subjectName);
  const subjectPracticals = practicals.filter(practical => practical.subject === subjectName);

  const filteredNotes = useMemo(() => {
    let filtered = subjectNotes.filter(note => {
      const matchesUnit = selectedUnit === 'all' || note.unit === selectedUnit;
      const matchesSearch = (note.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (note.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      // Date filter - exact match
      let matchesDate = true;
      if (dateFilter && note.uploadDate) {
        const noteDate = new Date(note.uploadDate);
        const filterDate = new Date(dateFilter);
        matchesDate = noteDate.toDateString() === filterDate.toDateString();
      }
      
      return matchesUnit && matchesSearch && matchesDate;
    });

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.uploadDate || '').getTime();
      const dateB = new Date(b.uploadDate || '').getTime();
      return sortOption === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [subjectNotes, selectedUnit, searchTerm, dateFilter, sortOption]);

  const filteredPracticals = useMemo(() => {
    let filtered = subjectPracticals.filter(practical => {
      const matchesSearch = (practical.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (practical.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      // Date filter - exact match
      let matchesDate = true;
      if (dateFilter && practical.uploadDate) {
        const practicalDate = new Date(practical.uploadDate);
        const filterDate = new Date(dateFilter);
        matchesDate = practicalDate.toDateString() === filterDate.toDateString();
      }
      
      return matchesSearch && matchesDate;
    });

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.uploadDate || '').getTime();
      const dateB = new Date(b.uploadDate || '').getTime();
      return sortOption === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [subjectPracticals, searchTerm, dateFilter, sortOption]);

  const handleViewFile = (fileData: string, fileName: string, type: any, subject?: string, fileType?: string, unit?: string, storedFileName?: string) => {
    setViewerState({
      isOpen: true,
      fileData,
      fileName,
      fileType: type === 'pdf' || type === 'image' ? type : 'pdf',
      subject: subject || '',
      type: fileType || '',
      unit: unit || '',
      storedFileName: storedFileName || ''
    });
  };

  const closeViewer = () => {
    setViewerState({
      isOpen: false,
      fileData: '',
      fileName: '',
      fileType: 'pdf',
      subject: '',
      type: '',
      unit: '',
      storedFileName: ''
    });
  };

  if (!currentSubject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            Subject not found
          </h2>
          <Link
            to="/notes"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 shimmer-effect ripple-effect transition-all duration-300"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Notes Gallery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 slide-up">
          <Link
            to="/notes"
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-6 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Notes Gallery
          </Link>

          <div className="glass-effect p-8 rounded-2xl">
            <div className="flex items-center mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white mr-4">
                <BookOpen className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gradient">
                  {String(currentSubject.name)}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {String(currentSubject.units?.length ?? 0)} units available • {String(subjectNotes.length)} notes • {String(subjectPracticals.length)} practicals
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8 fade-in-up">
          <div className="flex space-x-1 bg-high-contrast p-1 rounded-xl max-w-md enhanced-shadow">
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm ripple-effect transition-all duration-300 ${
                activeTab === 'notes'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shimmer-effect'
                  : 'button-secondary hover-scale'
              }`}
              type="button"
            >
              <FileText className="h-4 w-4" />
              Notes ({String(subjectNotes.length)})
            </button>
            <button
              onClick={() => setActiveTab('practicals')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm ripple-effect transition-all duration-300 ${
                activeTab === 'practicals'
                  ? 'bg-gradient-to-r from-green-500 to-teal-600 text-white shadow-lg shimmer-effect'
                  : 'button-secondary hover-scale'
              }`}
              type="button"
            >
              <Users className="h-4 w-4" />
              Practicals ({String(subjectPracticals.length)})
            </button>
          </div>
        </div>

        {/* Sort Filter Component */}
        <div className="mb-8 fade-in-up">
          <SortFilter
            initialSort={sortOption}
            initialSearch={searchTerm}
            initialDate={dateFilter}
            onSortChange={setSortOption}
            onSearchChange={setSearchTerm}
            onDateFilterChange={setDateFilter}
          />
        </div>

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <>
            {/* Unit Filter */}
            <div className="mb-8 fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex flex-wrap gap-3 p-4 bg-high-contrast rounded-xl enhanced-shadow">
                <button
                  onClick={() => setSelectedUnit('all')}
                  className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-bold text-sm ripple-effect transition-all duration-300 ${
                    selectedUnit === 'all'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shimmer-effect'
                      : 'button-secondary hover-scale'
                  }`}
                  type="button"
                >
                  All Units ({String(subjectNotes.length)})
                </button>
                {currentSubject.units?.map((unit) => {
                  const unitNotesCount = subjectNotes.filter(note => note.unit === unit).length;
                  return (
                    <button
                      key={String(unit)}
                      onClick={() => setSelectedUnit(String(unit))}
                      className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-bold text-sm ripple-effect transition-all duration-300 ${
                        selectedUnit === unit
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shimmer-effect'
                          : 'button-secondary hover-scale'
                      }`}
                      type="button"
                    >
                      {String(unit)} ({String(unitNotesCount)})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNotes.map((note, index) => (
                <div
                  key={String(note.id)}
                  className="glass-effect p-6 rounded-2xl card-hover slide-up enhanced-shadow"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl ${
                      note.type === 'pdf'
                        ? 'bg-gradient-to-r from-red-500 to-pink-600'
                        : 'bg-gradient-to-r from-blue-500 to-purple-600'
                    } text-white`}>
                      <FileText className="h-6 w-6" />
                    </div>
                    <span className="px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 text-blue-800 dark:text-blue-200">
                      {String(note.unit ?? 'N/A')}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold mb-2 text-high-contrast neon-glow">
                    {String(note.title)}
                  </h3>
                  <p className="text-high-contrast text-sm mb-4 line-clamp-2 opacity-80">
                    {String(note.description ?? '')}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-xs text-high-contrast opacity-70">
                      <Clock className="h-3 w-3 mr-1" />
                      {String(note.uploadDate ?? '')}
                    </div>
                    <div className="flex items-center text-xs text-high-contrast opacity-70">
                      <Eye className="h-3 w-3 mr-1" />
                      {String(note.fileSize ?? '')}
                    </div>
                  </div>

                  {/* View Button */}
                  <button
                    onClick={() => handleViewFile(
                      note.fileData || '', 
                      note.fileName, 
                      note.type,
                      note.subject,
                      'notes',
                      note.unit,
                      note.storedFileName
                    )}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 shimmer-effect ripple-effect transition-all duration-300"
                    type="button"
                  >
                    <Eye className="h-5 w-5" />
                    <span className="font-semibold">
                      View {String(note.type ?? 'PDF').toUpperCase()}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Practicals Tab */}
        {activeTab === 'practicals' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPracticals.map((practical, index) => (
              <div
                key={String(practical.id)}
                className="glass-effect p-6 rounded-2xl card-hover slide-up enhanced-shadow"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-teal-600 text-white">
                    <Users className="h-6 w-6" />
                  </div>
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-green-100 to-teal-100 dark:from-green-900 dark:to-teal-900 text-green-800 dark:text-green-200">
                    Practical
                  </span>
                </div>

                <h3 className="text-lg font-bold mb-2 text-high-contrast neon-glow">
                  {String(practical.title)}
                </h3>
                <p className="text-high-contrast text-sm mb-4 line-clamp-2 opacity-80">
                  {String(practical.description ?? '')}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-xs text-high-contrast opacity-70">
                    <Clock className="h-3 w-3 mr-1" />
                    {String(practical.uploadDate ?? '')}
                  </div>
                  <div className="flex items-center text-xs text-high-contrast opacity-70">
                    <Eye className="h-3 w-3 mr-1" />
                    {String(practical.fileSize ?? '')}
                  </div>
                </div>

                {/* View Button */}
                <button
                  onClick={() => handleViewFile(
                    practical.fileData || '', 
                    practical.fileName, 
                    practical.type,
                    practical.subject,
                    'practicals',
                    undefined,
                    practical.storedFileName
                  )}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 shimmer-effect ripple-effect transition-all duration-300"
                  type="button"
                >
                  <Eye className="h-5 w-5" />
                  <span className="font-semibold">
                    View {String(practical.type ?? 'PDF').toUpperCase()}
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Empty States */}
        {activeTab === 'notes' && filteredNotes.length === 0 && (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-high-contrast mb-2">
              No notes available
            </h3>
            <p className="text-high-contrast opacity-70">
              {searchTerm || dateFilter || selectedUnit !== 'all'
                ? 'Try adjusting your search criteria or filters.'
                : 'Notes will appear here once they are uploaded by the admin.'}
            </p>
          </div>
        )}

        {activeTab === 'practicals' && filteredPracticals.length === 0 && (
          <div className="text-center py-16">
            <Users className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-high-contrast mb-2">
              No practicals available
            </h3>
            <p className="text-high-contrast opacity-70">
              {searchTerm || dateFilter
                ? 'Try adjusting your search criteria or filters.'
                : 'Practical materials will appear here once they are uploaded by the admin.'}
            </p>
          </div>
        )}
      </div>

      {/* File Viewer */}
      <FileViewer
        isOpen={viewerState.isOpen}
        onClose={closeViewer}
        fileData={viewerState.fileData}
        fileName={viewerState.fileName}
        fileType={viewerState.fileType}
        subject={viewerState.subject}
        type={viewerState.type}
        unit={viewerState.unit}
        storedFileName={viewerState.storedFileName}
      />
    </div>
  );
};

export default SubjectNotes;
