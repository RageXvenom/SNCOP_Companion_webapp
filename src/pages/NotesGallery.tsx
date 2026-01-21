import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FileText, Users, Clock, ArrowRight } from 'lucide-react';
import { useData } from '../context/DataContext';

const NotesGallery: React.FC = () => {
  const { subjects = [], notes = [], practicals = [] } = useData();

  const getSubjectStats = (subjectName: string) => {
    const subjectNotes = notes.filter(note => note.subject === subjectName);
    const subjectPracticals = practicals.filter(p => p.subject === subjectName);
    return {
      notesCount: subjectNotes.length,
      practicalsCount: subjectPracticals.length,
      totalFiles: subjectNotes.length + subjectPracticals.length
    };
  };

  return (
    <div className="min-h-screen pt-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 slide-up">
          <h1 className="text-4xl md:text-6xl font-bold text-gradient mb-6">
            Notes Gallery
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Access comprehensive study materials organized by subjects and units for B.Pharm
          </p>
        </div>

        {/* Subjects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {subjects.map((subject, index) => {
            const stats = getSubjectStats(subject.name);
            return (
              <Link
                key={subject.id}
                to={`/notes/${encodeURIComponent(subject.name)}`}
                className="group glass-effect p-8 rounded-2xl card-hover transition-all duration-300 slide-up enhanced-shadow"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Subject Icon */}
                <div className="flex items-center justify-center w-16 h-16 mb-6 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="h-8 w-8" />
                </div>

                {/* Subject Info */}
                <h3 className="text-xl font-bold mb-4 text-high-contrast group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-purple-600 transition-all duration-300 neon-glow">
                  {subject.name}
                </h3>

                {/* Units */}
                <div className="mb-6">
                  <p className="text-sm text-high-contrast opacity-70 mb-2 font-semibold">Units Available:</p>
                  <div className="flex flex-wrap gap-2">
                    {subject.units.slice(0, 3).map((unit, unitIndex) => (
                      <span
                        key={unitIndex}
                        className="px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 text-blue-800 dark:text-blue-200"
                      >
                        {typeof unit === 'string' ? unit : unit?.name || 'Unknown Unit'}
                      </span>
                    ))}
                    {subject.units.length > 3 && (
                      <span className="px-3 py-1 text-xs font-bold rounded-full bg-high-contrast text-high-contrast border border-gray-300 dark:border-gray-600">
                        +{subject.units.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-sm text-high-contrast opacity-80">
                    <FileText className="h-4 w-4 mr-2" />
                    <span className="font-semibold">{stats.notesCount} Notes</span>
                  </div>
                  <div className="flex items-center text-sm text-high-contrast opacity-80">
                    <Users className="h-4 w-4 mr-2" />
                    <span className="font-semibold">{stats.practicalsCount} Practicals</span>
                  </div>
                  <div className="flex items-center text-sm text-high-contrast opacity-80">
                    <Clock className="h-4 w-4 mr-2" />
                    <span className="font-semibold">{stats.totalFiles} Total Files</span>
                  </div>
                </div>

                {/* Action */}
                <div className="flex items-center text-sm font-bold text-gradient group-hover:translate-x-1 transition-transform duration-300 neon-glow">
                  Browse {subject.name}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Empty State */}
        {subjects.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-high-contrast mb-2">
              No subjects available
            </h3>
            <p className="text-high-contrast opacity-70">
              Subjects will appear here once they are added by the admin.
            </p>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-20 glass-effect p-8 rounded-2xl fade-in-up enhanced-shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-gradient mb-2 neon-glow">{subjects.length}</div>
              <div className="text-high-contrast opacity-80 font-semibold">Subjects</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gradient mb-2 neon-glow">
                {subjects.reduce((acc, subject) => acc + (subject.units?.length ?? 0), 0)}
              </div>
              <div className="text-high-contrast opacity-80 font-semibold">Units</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gradient mb-2 neon-glow">
                {notes.length + practicals.length}
              </div>
              <div className="text-high-contrast opacity-80 font-semibold">Total Files</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesGallery;
