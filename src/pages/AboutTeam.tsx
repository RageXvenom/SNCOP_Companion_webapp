import React from 'react';
import { ExternalLink, Code, Heart, Users, Award } from 'lucide-react';

const AboutTeam: React.FC = () => {
  return (
    <div className="min-h-screen pt-28 px-4 sm:px-6 lg:px-8">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 pharmacy-gradient opacity-15" />
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 bg-gradient-to-r from-blue-300 to-teal-300 rounded-full soft-particles"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-teal-600 text-white shadow-xl">
              <Code className="h-12 w-12" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gradient mb-6">
            About Team
          </h1>
          <p className="text-xl text-high-contrast opacity-80">
            Meet the minds behind this educational platform
          </p>
        </div>

        {/* Team Section */}
        <section className="glass-effect p-8 rounded-2xl shadow-2xl mb-16">
          <div className="flex items-center justify-center mb-10">
            <Users className="h-8 w-8 text-blue-500 mr-3" />
            <h2 className="text-3xl font-bold text-gradient">
              Team Members
            </h2>
          </div>

          {/* Arvind */}
          <div className="mb-16">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden border-4 border-blue-400 shadow-lg">
                <img
                  src="https://i.ibb.co/hyCn4h7/Arvind.jpg"
                  alt="Arvind Babu Nag"
                  className="w-full h-full object-cover hover:scale-110 transition"
                />
              </div>

              <h3 className="text-3xl font-bold text-gradient mb-2">
                Arvind Babu Nag
              </h3>
              <p className="text-lg opacity-80 font-semibold mb-4">
                Full Stack Developer & B.Pharm Student
              </p>

              <p className="opacity-90 mb-8">
                <strong>Arvind Babu Nag</strong> is the developer and technical lead of
                this platform, currently pursuing <strong>B.Pharm</strong> at
                <strong> Sainath College of Pharmacy</strong>, Sonbhadra (U.P.).
              </p>

              <a
                href="https://arvindnag.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-teal-600 text-white font-bold shadow-xl"
              >
                <ExternalLink className="mr-2 h-5 w-5" />
                Visit Portfolio
              </a>
            </div>
          </div>

          <hr className="border-gray-400 dark:border-gray-600 mb-16" />

          {/* Manish Sharma */}
          <div>
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden border-4 border-teal-400 shadow-lg">
                <img
                  src="https://i.ibb.co/23Pt98Py/image.png"
                  alt="Manish Sharma"
                  className="w-full h-full object-cover hover:scale-110 transition"
                />
              </div>

              <h3 className="text-3xl font-bold text-gradient mb-2">
                Manish Sharma
              </h3>

              <p className="text-lg opacity-80 font-semibold mb-4">
                Admin & B.Pharm Student
              </p>

              <p className="opacity-90 mb-8">
                <strong>Manish Sharma</strong> is an admin member of this platform and a
                dedicated <strong>B.Pharm student</strong> at
                <span className="font-semibold text-teal-500">
                  {' '}Sainath College of Pharmacy
                </span>.  
                He actively supports academic content management and helps students
                access structured learning resources.
              </p>

              <a
                href="https://manishsharma4u.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-8 py-4 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold shadow-xl"
              >
                <ExternalLink className="mr-2 h-5 w-5" />
                View Profile
              </a>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="glass-effect p-8 rounded-2xl shadow-2xl text-center">
          <div className="flex justify-center items-center mb-6">
            <Award className="h-8 w-8 text-teal-500 mr-3" />
            <h2 className="text-2xl font-bold text-gradient">
              Our Mission & Vision
            </h2>
          </div>

          <p className="text-lg opacity-90 mb-4 font-semibold">
            "Bridging the gap between technology and pharmaceutical education
            to create accessible and innovative learning solutions."
          </p>

          <div className="flex justify-center items-center gap-2 opacity-80">
            <span>Developed with</span>
            <Heart className="h-5 w-5 text-red-500" fill="currentColor" />
            <span>for SNCOP students</span>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutTeam;

