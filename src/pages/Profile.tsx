import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, Loader, Save, LogOut, Camera, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
  const { user, profile, signOut, updateProfile, updateEmail, updatePassword } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState<string>(profile?.avatar_url || '');
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string>('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ✅ Update profile picture when profile changes
  useEffect(() => {
    if (profile?.avatar_url) {
      setProfilePicture(profile.avatar_url);
    }
  }, [profile?.avatar_url]);

  // ✅ Optimized image compression
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Max dimensions
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Canvas to Blob conversion failed'));
              }
            },
            'image/jpeg',
            0.85 // 85% quality
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // ❌ image nahi hai
  if (!file.type.startsWith('image/')) {
    setError('Please select an image file');
    return;
  }

  // ❌ size limit
  if (file.size > 5 * 1024 * 1024) {
    setError('Image size must be less than 5MB');
    return;
  }

  setError('');

  // ✅ STEP 1: GIF ko as-it-is rakho (NO compression)
  if (file.type === 'image/gif') {
    setProfilePictureFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePicturePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    return; // 🔴 IMPORTANT
  }

  // ✅ STEP 2: JPG / PNG ke liye compression
  try {
    const compressedBlob = await compressImage(file);

    const compressedFile = new File(
      [compressedBlob],
      file.name,
      { type: 'image/jpeg', lastModified: Date.now() }
    );

    setProfilePictureFile(compressedFile);

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePicturePreview(reader.result as string);
    };
    reader.readAsDataURL(compressedFile);
  } catch (err) {
    setError('Image processing failed');
  }
};


  const handleUploadProfilePicture = async () => {
    if (!profilePictureFile) return;

    setUploadingPicture(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', profilePictureFile);
      formData.append('userId', user?.id || '');

      const response = await fetch('/api/upload-profile-picture', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setProfilePicture(data.avatarUrl);
        setProfilePicturePreview('');
        setProfilePictureFile(null);
        setSuccess('Profile picture updated successfully!');
        
        // ✅ Update profile with new avatar URL (keep current name)
        await updateProfile(fullName, data.avatarUrl);
        
        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setError(data.message || 'Failed to upload profile picture');
      }
    } catch (err) {
      setError('Failed to upload profile picture');
      console.error('Upload error:', err);
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    setUploadingPicture(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/remove-profile-picture', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user?.id }),
      });

      const data = await response.json();

      if (data.success) {
        setProfilePicture('');
        setProfilePicturePreview('');
        setProfilePictureFile(null);
        setSuccess('Profile picture removed successfully!');
        
        // ✅ Update profile to remove avatar URL (keep current name)
        await updateProfile(fullName, '');
      } else {
        setError(data.message || 'Failed to remove profile picture');
      }
    } catch (err) {
      setError('Failed to remove profile picture');
      console.error('Remove error:', err);
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleCancelUpload = () => {
    setProfilePictureFile(null);
    setProfilePicturePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!fullName.trim()) {
      setError('Full name cannot be empty');
      setLoading(false);
      return;
    }

    // ✅ FIX: Keep the current profile picture when updating name
    const { error } = await updateProfile(fullName.trim(), profilePicture || profile?.avatar_url || '');

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Profile updated successfully!');
    }

    setLoading(false);
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    const { error } = await updateEmail(email.trim());

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Email updated successfully!');
    }

    setLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    const { error } = await updatePassword(newPassword);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="glass-effect rounded-3xl p-8 enhanced-shadow mb-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gradient neon-glow mb-2">Profile Settings</h1>
                <p className="text-high-contrast opacity-70">Manage your account information</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover-scale font-bold shimmer-effect"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm"
              >
                {success}
              </motion.div>
            )}

            <div className="space-y-8">
              {/* Profile Picture Section */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-xl font-bold text-high-contrast mb-4">Profile Picture</h2>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Avatar Display */}
                  <div className="relative group">
                    {profilePicturePreview || profilePicture ? (
                      <img
                        src={profilePicturePreview || profilePicture}
                        alt="Profile"
                        className="w-32 h-32 rounded-full object-cover border-4 border-blue-500/30 shadow-lg"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center border-4 border-blue-500/30 shadow-lg">
                        <span className="text-white text-4xl font-bold">
                          {getInitials(fullName || user?.email || 'U')}
                        </span>
                      </div>
                    )}
                    
                    {/* Camera overlay on hover */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Camera className="h-8 w-8 text-white" />
                    </button>
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                    />

                    {profilePictureFile ? (
                      <div className="space-y-3">
                        <p className="text-sm text-high-contrast">
                          Selected: {profilePictureFile.name} ({(profilePictureFile.size / 1024).toFixed(2)} KB)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={handleUploadProfilePicture}
                            disabled={uploadingPicture}
                            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover-scale font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {uploadingPicture ? (
                              <Loader className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            <span>Upload</span>
                          </button>
                          <button
                            onClick={handleCancelUpload}
                            disabled={uploadingPicture}
                            className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover-scale font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <X className="h-4 w-4" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover-scale font-bold"
                        >
                          <Camera className="h-4 w-4" />
                          <span>Change Picture</span>
                        </button>
                        {(profilePicture || profilePicturePreview) && (
                          <button
                            onClick={handleRemoveProfilePicture}
                            disabled={uploadingPicture}
                            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover-scale font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {uploadingPicture ? (
                              <Loader className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Images are automatically optimized. Max 5MB (JPG, PNG, GIF)
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-xl font-bold text-high-contrast mb-4">Personal Information</h2>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-high-contrast mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 glass-effect rounded-xl text-high-contrast focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover-scale font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shimmer-effect"
                  >
                    {loading ? (
                      <Loader className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        <span>Update Name</span>
                      </>
                    )}
                  </button>
                </form>
              </motion.div>

              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-xl font-bold text-high-contrast mb-4">Email Address</h2>
                <form onSubmit={handleUpdateEmail} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-high-contrast mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 glass-effect rounded-xl text-high-contrast focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover-scale font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shimmer-effect"
                  >
                    {loading ? (
                      <Loader className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        <span>Update Email</span>
                      </>
                    )}
                  </button>
                </form>
              </motion.div>

              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-xl font-bold text-high-contrast mb-4">Change Password</h2>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-high-contrast mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 glass-effect rounded-xl text-high-contrast focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="Enter new password (min. 6 characters)"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-high-contrast mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 glass-effect rounded-xl text-high-contrast focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="Confirm your new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover-scale font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shimmer-effect"
                  >
                    {loading ? (
                      <Loader className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
