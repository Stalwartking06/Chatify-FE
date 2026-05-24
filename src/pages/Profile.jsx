import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore.js';
import { Camera, User, FileText, ArrowLeft, Loader2, ZoomIn, ZoomOut, Move } from 'lucide-react';

const Profile = () => {
  const { user, updateProfile } = useAuthStore();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Profile Form States
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarPreview, setAvatarPreview] = useState(
    user?.avatar
      ? user.avatar.startsWith('/')
        ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${user.avatar}`
        : user.avatar
      : ''
  );
  const [avatarFile, setAvatarFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cropper Modal States
  const [cropImageSrc, setCropImageSrc] = useState(null); // Base64 selected image source
  const [cropperZoom, setCropperZoom] = useState(1);
  const [cropperOffset, setCropperOffset] = useState({ x: 0, y: 0 });
  const cropperCanvasRef = useRef(null);
  const cropperImageRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  // 1. Handle selection of a new image file
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropImageSrc(reader.result); // Open the Cropper modal
        setCropperZoom(1);
        setCropperOffset({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  // 2. Load and draw the image in the cropper canvas when zoom, offset, or image changes
  useEffect(() => {
    if (!cropImageSrc) return;

    const img = new Image();
    img.src = cropImageSrc;
    img.onload = () => {
      cropperImageRef.current = img;
      drawCropperCanvas();
    };
  }, [cropImageSrc, cropperZoom, cropperOffset]);

  const drawCropperCanvas = () => {
    const canvas = cropperCanvasRef.current;
    const img = cropperImageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    const size = 300; // Canvas dimensions (300x300 pixels)
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    // Calculate scaling to cover the canvas area (cover mode)
    const baseScale = Math.max(size / img.width, size / img.height);
    const finalScale = baseScale * cropperZoom;

    const drawWidth = img.width * finalScale;
    const drawHeight = img.height * finalScale;

    // Draw centering the image with panning offset
    const x = size / 2 + cropperOffset.x - drawWidth / 2;
    const y = size / 2 + cropperOffset.y - drawHeight / 2;

    ctx.drawImage(img, x, y, drawWidth, drawHeight);
  };

  // 3. Interactive drag / pan handlers for both Mouse and Touch
  const handleDragStart = (clientX, clientY) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: clientX - cropperOffset.x,
      y: clientY - cropperOffset.y,
    };
  };

  const handleDragMove = (clientX, clientY) => {
    if (!isDraggingRef.current) return;
    setCropperOffset({
      x: clientX - dragStartRef.current.x,
      y: clientY - dragStartRef.current.y,
    });
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
  };

  // Mouse event listeners
  const onMouseDown = (e) => {
    handleDragStart(e.clientX, e.clientY);
  };

  const onMouseMove = (e) => {
    handleDragMove(e.clientX, e.clientY);
  };

  // Touch event listeners for mobile devices
  const onTouchStart = (e) => {
    if (e.touches.length === 1) {
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const onTouchMove = (e) => {
    if (e.touches.length === 1) {
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  // 4. Export crop result as file Blob and close cropper modal
  const applyCrop = () => {
    const canvas = cropperCanvasRef.current;
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const croppedFile = new File([blob], 'cropped-avatar.jpg', { type: 'image/jpeg' });
          setAvatarFile(croppedFile);
          
          // Set preview URL
          const previewUrl = URL.createObjectURL(blob);
          setAvatarPreview(previewUrl);
          
          setCropImageSrc(null); // Close modal
        }
      },
      'image/jpeg',
      0.95 // Image quality
    );
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('displayName', displayName);
    formData.append('bio', bio);
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    const success = await updateProfile(formData);
    setIsSubmitting(false);
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <header className="h-16 border-b border-slate-800/80 flex items-center px-4 md:px-6 relative z-10 glass-panel">
        <button
          onClick={() => navigate('/')}
          className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold ml-3">Edit Profile</h1>
      </header>

      {/* Main Panel */}
      <main className="flex-1 overflow-y-auto flex justify-center items-start py-8 px-4 relative z-10">
        <div className="w-full max-w-md glass-panel rounded-3xl p-6 md:p-8 shadow-xl animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Selector */}
            <div className="flex flex-col items-center">
              <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-blue-500 bg-slate-800 flex items-center justify-center relative shadow-lg shadow-blue-500/10">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-slate-500 uppercase">
                      {user?.displayName ? user.displayName.slice(0, 2) : 'U'}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="absolute bottom-0 right-0 p-2 rounded-full bg-blue-600 border border-slate-900 shadow-md">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                onClick={(e) => {
                  e.target.value = null; // Let the same file be selected again
                }}
                className="hidden"
              />
              <span className="text-xs text-slate-400 mt-3">Click photo to update avatar</span>
            </div>

            {/* Display Username */}
            <div className="p-4 rounded-2xl bg-slate-800/35 border border-slate-800/80">
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Username</div>
              <div className="text-sm font-semibold text-slate-300 mt-0.5">@{user?.username}</div>
            </div>

            {/* Display Name Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Display Name"
                required
                maxLength={30}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#0f172a]/60 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {/* Bio Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                maxLength={100}
                rows={3}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#0f172a]/60 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
              />
              <div className="text-right text-xs text-slate-500">{bio.length}/100</div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving changes...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </form>
        </div>
      </main>

      {/* CROPPER MODAL */}
      {cropImageSrc && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0f172a]/95 border border-slate-800/80 rounded-3xl p-6 flex flex-col shadow-2xl relative animate-slide-up">
            <h3 className="text-lg font-bold text-center text-slate-200 mb-2">Crop Profile Photo</h3>
            <p className="text-xs text-slate-400 text-center mb-6">Drag photo to center, use slider to zoom</p>

            {/* Crop Viewport with Glowing Circular Boundary */}
            <div className="relative flex justify-center items-center mb-6">
              <div className="w-[300px] h-[300px] rounded-full overflow-hidden border-2 border-blue-500 shadow-xl shadow-blue-500/10 cursor-move relative flex items-center justify-center bg-slate-950">
                <canvas
                  ref={cropperCanvasRef}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={handleDragEnd}
                  onMouseLeave={handleDragEnd}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={handleDragEnd}
                  className="absolute"
                />
                
                {/* Visual grid layout helper */}
                <div className="absolute inset-0 border border-slate-700/25 rounded-full pointer-events-none"></div>
                <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
                  <Move className="w-8 h-8 text-white/20" />
                </div>
              </div>
            </div>

            {/* Zoom Slider controls */}
            <div className="flex items-center gap-3 px-2 mb-6">
              <ZoomOut className="w-4 h-4 text-slate-400" />
              <input
                type="range"
                min="1"
                max="4"
                step="0.05"
                value={cropperZoom}
                onChange={(e) => setCropperZoom(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <ZoomIn className="w-4 h-4 text-slate-400" />
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCropImageSrc(null)}
                className="flex-1 py-3 text-xs font-semibold rounded-2xl bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyCrop}
                className="flex-1 py-3 text-xs font-semibold rounded-2xl bg-blue-600 text-white hover:bg-blue-500 active:scale-95 transition-all cursor-pointer"
              >
                Crop & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
