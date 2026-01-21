import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, Award, Download, FileText, Play, ArrowRight, MessageSquare, UserPlus } from 'lucide-react';
import PharmacyLogo from '../components/PharmacyLogo';
import { useAuth } from '../context/AuthContext';

const Home: React.FC = () => {
  const { user } = useAuth();

  // Features list – SNCOP-AI only when logged in
  const features = [
    {
      icon: <BookOpen className="h-8 w-8" />,
      title: 'Notes Gallery',
      description: 'Access subject-wise organized notes with customizable units',
      link: '/notes',
      gradient: 'from-blue-500 to-cyan-500'
    },

    // SNCOP-AI visible ONLY when logged in
    ...(user ? [{
      icon: <MessageSquare className="h-8 w-8" />,
      title: 'SNCOP-AI Chat',
      description: 'Ask questions and get instant AI-powered help with your studies',
      link: '/ai-chat',
      gradient: 'from-emerald-500 to-teal-500'
    }] : []),

    {
      icon: <FileText className="h-8 w-8" />,
      title: 'Practice Tests',
      description: 'Practice with comprehensive test materials',
      link: '/practice-tests',
      gradient: 'from-violet-500 to-pink-500'
    },
    {
      icon: <Award className="h-8 w-8" />,
      title: 'Quality Education',
      description: 'Premium study materials for B.Pharm students',
      link: '/about',
      gradient: 'from-orange-500 to-red-500'
    }
  ];

  const stats = [
    { number: '100+', label: 'Study Materials' },
    { number: '6', label: 'Subjects Covered' },
    { number: '24/7', label: 'Available Access' },
    { number: '100%', label: 'Free Resources' }
  ];

  // Support form states
  const [formData, setFormData] = useState({ name: '', email: '', contact: '', message: '' });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFormSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');

    const embed = {
      title: "New SNCOP_Companion Support Request",
      color: 0xff1a1a,
      fields: [
        { name: "Full Name", value: formData.name, inline: true },
        { name: "Email", value: formData.email, inline: true },
        { name: "Contact Number", value: formData.contact, inline: true },
        { name: "Message", value: formData.message, inline: false }
      ],
      timestamp: new Date().toISOString(),
      footer: { text: "SNCOP_Companion Support" }
    };

    const payload = {
      content: "<@&1432700410489208842> <@1037766535630045306> <@1059907728849518642>",
      embeds: [embed]
    };

    try {
      const res = await fetch(
        "https://discord.com/api/webhooks/1432699886163198024/SgEzpb015IvydrV-6efQMJy-HLJGCC5nLG0CWInIzQ4LTPnAj4oBM76DsR6XtYM4HzBs",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      if (res.ok) {
        setSuccess("Message sent successfully! We'll get back to you soon.");
        setFormData({ name: '', email: '', contact: '', message: '' });
      } else throw new Error(`Discord returned ${res.status}`);
    } catch {
      setError("Submission failed – please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen">

      {/* HERO SECTION */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="slide-up">
              <PharmacyLogo />
              <h1 className="text-5xl md:text-7xl font-bold mb-6">
                <span className="text-gradient">SNCOP</span>
                <br />
                <span className="text-4xl md:text-6xl text-gray-800 dark:text-gray-200">
                  Companion
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-8 max-w-3xl mx-auto">
                Your complete digital companion for B.Pharm studies at 
                <span className="font-semibold text-gradient"> Sainath College of Pharmacy</span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 fade-in-up">

              {/* Always visible */}
              <Link
                to="/notes"
                className="inline-flex items-center px-8 py-4 rounded-xl button-primary text-lg hover-scale shadow-2xl shimmer-effect text-shadow"
              >
                <BookOpen className="mr-3 h-5 w-5" />
                Browse Notes
                <ArrowRight className="ml-3 h-5 w-5" />
              </Link>

              {/* Show "Ask SNCOP-AI" when logged in, "Register for SNCOP-AI" when not logged in */}
              {user ? (
                <Link
                  to="/ai-chat"
                  className="inline-flex items-center px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-lg hover-scale shadow-2xl shimmer-effect"
                >
                  <MessageSquare className="mr-3 h-5 w-5" />
                  Ask SNCOP-AI
                  <ArrowRight className="ml-3 h-5 w-5" />
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="inline-flex items-center px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-lg hover-scale shadow-2xl shimmer-effect"
                >
                  <UserPlus className="mr-3 h-5 w-5" />
                  Register for SNCOP-AI
                  <ArrowRight className="ml-3 h-5 w-5" />
                </Link>
              )}

            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20 fade-in-up">
            {stats.map((stat, index) => (
              <div key={index} className="text-center glass-effect p-6 rounded-xl card-hover enhanced-shadow">
                <div className="text-3xl md:text-4xl font-bold text-gradient mb-2 neon-glow">{stat.number}</div>
                <div className="text-sm text-high-contrast opacity-80 font-semibold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SUPPORT FORM */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 fade-in-up">
        <div className="max-w-3xl mx-auto glass-effect p-10 rounded-3xl enhanced-shadow slide-up relative">

          <div className="absolute inset-0 rounded-3xl border-[3px] border-transparent bg-gradient-to-r from-pink-500/40 via-purple-500/40 to-blue-500/40 pointer-events-none animate-gradient-border" />

          <h2 className="text-3xl md:text-4xl font-bold text-gradient mb-6 neon-glow text-center">
            Need Help? Contact Support
          </h2>

          <img
            src="https://i.ibb.co/ZpDNcMb4/image.png"
            className="w-full rounded-xl mb-8 shadow-lg"
          />

          <form onSubmit={handleFormSubmit} className="space-y-6">

            {/* Full Name */}
            <div>
              <label className="font-semibold">Full Name *</label>
              <input
                required
                type="text"
                className="w-full mt-2 p-3 rounded-xl bg-white/30 dark:bg-black/20 border border-gray-300 dark:border-gray-700"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Email */}
            <div>
              <label className="font-semibold">Email *</label>
              <input
                required
                type="email"
                className="w-full mt-2 p-3 rounded-xl bg-white/30 dark:bg-black/20 border border-gray-300 dark:border-gray-700"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {/* Contact */}
            <div>
              <label className="font-semibold">Contact Number *</label>
              <input
                required
                type="tel"
                pattern="[0-9]{10,15}"
                className="w-full mt-2 p-3 rounded-xl bg-white/30 dark:bg-black/20 border border-gray-300 dark:border-gray-700"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              />
            </div>

            {/* Message */}
            <div>
              <label className="font-semibold">Message *</label>
              <textarea
                required
                className="w-full mt-2 p-3 rounded-xl bg-white/30 dark:bg-black/20 border border-gray-300 dark:border-gray-700 min-h-[120px]"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 text-lg font-bold rounded-xl bg-gradient-to-r from-red-500 to-red-700 text-white"
            >
              {loading ? "Submitting..." : "Submit"}
            </button>
          </form>

          {success && (
            <p className="mt-6 p-4 rounded-xl bg-green-200 text-green-900 text-center font-semibold">
              {success}
            </p>
          )}
          {error && (
            <p className="mt-6 p-4 rounded-xl bg-red-200 text-red-900 text-center font-semibold">
              {error}
            </p>
          )}
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-effect p-12 rounded-3xl card-hover enhanced-shadow">
            <h2 className="text-3xl md:text-4xl font-bold text-gradient mb-6 neon-glow">
              Ready to Start Your Journey?
            </h2>
            <p className="text-xl text-high-contrast opacity-80 mb-8">
              Join hundreds of B.Pharmacy students who are already using our platform.
            </p>
            <Link
              to="/notes"
              className="inline-flex items-center px-10 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg hover-scale shadow-2xl shimmer-effect"
            >
              <Download className="mr-3 h-5 w-5" />
              Access Notes Now
              <ArrowRight className="ml-3 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
