import React from 'react';
import { ExternalLink, BookOpen, Target, Eye, Award, Users, Building, Lightbulb } from 'lucide-react';

const About: React.FC = () => {
  const features = [
    {
      icon: <BookOpen className="h-8 w-8" />,
      title: 'Modern laboratories and research-based learning',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: 'Experienced faculty members from academic and industry backgrounds',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: <Target className="h-8 w-8" />,
      title: 'Opportunities for internships, workshops, and industrial training',
      gradient: 'from-green-500 to-teal-500'
    },
    {
      icon: <Award className="h-8 w-8" />,
      title: 'Career-oriented training and placement support',
      gradient: 'from-orange-500 to-red-500'
    }
  ];

  const facilities = [
    'State-of-the-art laboratories and library resources',
    'Experienced and dedicated teaching faculty',
    'Student-centered learning environment',
    'Focus on extracurricular and professional development activities'
  ];

  const reasons = [
    'Strong academic foundation with practical exposure',
    'Career-oriented training and placement support',
    'Commitment to holistic development of students'
  ];

  return (
    <div className="min-h-screen pt-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 slide-up">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 text-white soft-glow">
              <Building className="h-12 w-12" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gradient mb-6 neon-glow">
            About SNCOP
          </h1>
          <p className="text-xl text-high-contrast opacity-80 leading-relaxed">
            Sainath College of Pharmacy - Excellence in Pharmaceutical Education
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-12">
          {/* About Section */}
          <section className="glass-effect p-8 rounded-2xl slide-up enhanced-shadow">
            <div className="flex items-center mb-6">
              <Building className="h-8 w-8 text-blue-500 mr-3" />
              <h2 className="text-2xl font-bold text-gradient neon-glow">About Sainath College of Pharmacy</h2>
            </div>
            <p className="text-high-contrast opacity-90 leading-relaxed mb-6">
              Sainath College of Pharmacy, Hinduari, Sonbhadra (U.P.), is a premier institute dedicated to nurturing the next generation of healthcare and pharmaceutical professionals. Established with the vision of excellence in education, research, and innovation, the college has become a trusted name in the field of pharmacy education.
            </p>
            <p className="text-high-contrast opacity-90 leading-relaxed">
              At Sainath College of Pharmacy, we believe in shaping not only skilled professionals but also responsible individuals who contribute to the betterment of society. Our institution blends academic rigor with practical exposure, ensuring students are well-prepared to meet the challenges of the healthcare and pharmaceutical industries.
            </p>
          </section>

          {/* Mission & Vision */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="glass-effect p-8 rounded-2xl card-hover slide-up enhanced-shadow" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center mb-6">
                <Target className="h-8 w-8 text-purple-500 mr-3" />
                <h2 className="text-2xl font-bold text-gradient neon-glow">Our Mission</h2>
              </div>
              <p className="text-high-contrast opacity-90 leading-relaxed">
                To provide quality education and practical training in pharmaceutical sciences, fostering innovation, ethical practices, and professional excellence.
              </p>
            </section>

            <section className="glass-effect p-8 rounded-2xl card-hover slide-up enhanced-shadow" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center mb-6">
                <Eye className="h-8 w-8 text-teal-500 mr-3" />
                <h2 className="text-2xl font-bold text-gradient neon-glow">Our Vision</h2>
              </div>
              <p className="text-high-contrast opacity-90 leading-relaxed">
                To emerge as a center of excellence in pharmacy education and research, producing competent professionals who advance healthcare systems locally, nationally, and globally.
              </p>
            </section>
          </div>

          {/* Academics & Programs */}
          <section className="glass-effect p-8 rounded-2xl slide-up enhanced-shadow" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center mb-6">
              <BookOpen className="h-8 w-8 text-green-500 mr-3" />
              <h2 className="text-2xl font-bold text-gradient neon-glow">Academics & Programs</h2>
            </div>
            <p className="text-high-contrast opacity-90 leading-relaxed mb-6">
              We offer a Bachelor of Pharmacy (B.Pharm) program with a strong emphasis on:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${feature.gradient} text-white flex-shrink-0`}>
                    {feature.icon}
                  </div>
                  <p className="text-high-contrast opacity-90 leading-relaxed">
                    {feature.title}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Campus & Facilities */}
          <section className="glass-effect p-8 rounded-2xl slide-up enhanced-shadow" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center mb-6">
              <Building className="h-8 w-8 text-indigo-500 mr-3" />
              <h2 className="text-2xl font-bold text-gradient neon-glow">Campus & Facilities</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {facilities.map((facility, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex-shrink-0"></div>
                  <p className="text-high-contrast opacity-90">{facility}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Why Choose Us */}
          <section className="glass-effect p-8 rounded-2xl slide-up enhanced-shadow" style={{ animationDelay: '0.6s' }}>
            <div className="flex items-center mb-6">
              <Award className="h-8 w-8 text-yellow-500 mr-3" />
              <h2 className="text-2xl font-bold text-gradient neon-glow">Why Choose Us?</h2>
            </div>
            <div className="space-y-4">
              {reasons.map((reason, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-green-500 to-teal-600 flex-shrink-0"></div>
                  <p className="text-high-contrast opacity-90">{reason}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Closing Statement */}
          <section className="glass-effect p-8 rounded-2xl text-center slide-up enhanced-shadow" style={{ animationDelay: '0.7s' }}>
            <div className="flex items-center justify-center mb-6">
              <Lightbulb className="h-8 w-8 text-yellow-500 mr-3" />
              <h2 className="text-2xl font-bold text-gradient neon-glow">Our Philosophy</h2>
            </div>
            <p className="text-xl text-high-contrast opacity-90 leading-relaxed italic font-semibold">
              "At Sainath College of Pharmacy, we don't just educate — we inspire, innovate, and transform lives through knowledge."
            </p>
          </section>

          {/* CTA */}
          <div className="text-center fade-in-up" style={{ animationDelay: '0.8s' }}>
            <a
              href="http://www.sncops.in"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-4 button-primary text-lg rounded-xl hover-scale shadow-2xl shimmer-effect text-shadow"
            >
              Visit Official Website
              <ExternalLink className="ml-3 h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
