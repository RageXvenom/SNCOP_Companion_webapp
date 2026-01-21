import React, { useState, useMemo } from 'react';
import { Download, FileText, Clock, Eye } from 'lucide-react';
import { useData } from '../context/DataContext';
import FileViewer from '../components/FileViewer';
import SortFilter from '../components/SortFilter';

const Assignments: React.FC = () => {
  const { assignments = [], subjects = [] } = useData();
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
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

  const filteredAssignments = useMemo(() => {
    let filtered = assignments.filter(assign => {
      const matchesSubject = selectedSubject === 'all' || assign.subject === selectedSubject;
      const matchesSearch = (assign.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (assign.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      // Date filter - exact match
      let matchesDate = true;
      if (dateFilter && assign.uploadDate) {
        // Parse the date from uploadDate (assuming format like "Dec 4, 2024" or similar)
        // Convert to YYYY-MM-DD for comparison
        const assignDate = new Date(assign.uploadDate);
        const filterDate = new Date(dateFilter);
        matchesDate = assignDate.toDateString() === filterDate.toDateString();
      }
      
      return matchesSubject && matchesSearch && matchesDate;
    });

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.uploadDate || '').getTime();
      const dateB = new Date(b.uploadDate || '').getTime();
      return sortOption === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [assignments, selectedSubject, searchTerm, dateFilter, sortOption]);

  const handleViewFile = (fileData: string, fileName: string, type: 'pdf' | 'image', subject?: string, fileType?: string, unit?: string, storedFileName?: string) => {
    setViewerState({
      isOpen: true,
      fileData,
      fileName,
      fileType: type,
      subject: subject || '',
      type: 'assignments',
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

  return (
    <div className="min-h-screen pt-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 slide-up">
          <h1 className="text-4xl md:text-6xl font-bold text-gradient mb-6">
            Assignments
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Find subject-wise assignment PDFs and images uploaded by the admin.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-4 fade-in-up">
          {/* Sort Filter Component */}
          <SortFilter
            initialSort={sortOption}
            initialSearch={searchTerm}
            initialDate={dateFilter}
            onSortChange={setSortOption}
            onSearchChange={setSearchTerm}
            onDateFilterChange={setDateFilter}
            className="mb-6"
          />

          {/* Subject Filter */}
          <div className="flex flex-wrap gap-3 justify-center p-4 bg-high-contrast rounded-xl enhanced-shadow">
            <button
              onClick={() => setSelectedSubject('all')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 hover-scale button-glow ${
                selectedSubject === 'all'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg text-shadow'
                  : 'button-secondary'
              }`}
              type="button"
            >
              All Subjects ({assignments.length})
            </button>
            {subjects.map((subject) => {
              const subjectAssignCount = assignments.filter(a => a.subject === subject.name).length;
              return (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject.name)}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 hover-scale button-glow ${
                    selectedSubject === subject.name
                      ? 'button-primary text-shadow'
                      : 'button-secondary'
                  }`}
                  type="button"
                >
                  {subject.name} ({subjectAssignCount})
                </button>
              );
            })}
          </div>
        </div>

        {/* Assignments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssignments.map((assign, index) => (
            <div
              key={assign.id}
              className="glass-effect p-6 rounded-2xl card-hover slide-up enhanced-shadow"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${
                  assign.type === 'pdf'
                    ? 'bg-gradient-to-r from-orange-500 to-red-600'
                    : 'bg-gradient-to-r from-green-500 to-teal-600'
                } text-white`}>
                  <FileText className="h-6 w-6" />
                </div>
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900 dark:to-red-900 text-orange-800 dark:text-orange-200">
                  {assign.subject}
                </span>
              </div>

              <h3 className="text-lg font-bold mb-2 text-high-contrast neon-glow">
                {assign.title}
              </h3>
              <p className="text-high-contrast text-sm mb-4 line-clamp-2 opacity-80">
                {assign.description}
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-xs text-high-contrast opacity-70">
                  <Clock className="h-3 w-3 mr-1" />
                  {assign.uploadDate}
                </div>
                <div className="flex items-center text-xs text-high-contrast opacity-70">
                  <Download className="h-3 w-3 mr-1" />
                  {assign.fileSize}
                </div>
              </div>

              <button
                onClick={() => handleViewFile(
                  assign.fileData || '',
                  assign.fileName,
                  assign.type,
                  assign.subject,
                  'assignments',
                  undefined,
                  assign.storedFileName
                )}
                className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-teal-500 to-green-600 text-white rounded-lg hover-scale font-bold text-sm shimmer-effect text-shadow"
                type="button"
              >
                <Eye className="mr-2 h-4 w-4" />
                View Assignment
              </button>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredAssignments.length === 0 && (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-high-contrast mb-2">
              No assignments found
            </h3>
            <p className="text-high-contrast opacity-70">
              {searchTerm || selectedSubject !== 'all' || dateFilter
                ? 'Try adjusting your search criteria or filters.'
                : 'Assignments will appear here once they are uploaded by the admin.'}
            </p>
          </div>
        )}

        {/* Info Section */}
        {assignments.length > 0 && (
          <div className="mt-20 glass-effect p-8 rounded-2xl fade-in-up">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gradient mb-4 neon-glow">
                Stay on top of submissions
              </h3>
              <p className="text-high-contrast opacity-80 max-w-2xl mx-auto">
                Download or view assignment sheets uploaded by your instructors.
              </p>
            </div>
          </div>
        )}

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
    </div>
  );
};

export default Assignments;
