import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Logo } from "../../components/ui/logo";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { Upload, Loader2 } from "lucide-react";

export const AvatarUpload = (): JSX.Element => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // UI Text
  const uiText = {
    title: language === 'id' ? 'Upload Foto Anda' : 'Upload Your Photo',
    subtitle: language === 'id' 
      ? 'Pilih foto terbaik Anda untuk digunakan sebagai avatar. Pastikan wajah terlihat jelas.'
      : 'Choose your best photo to use as your avatar. Make sure your face is clearly visible.',
    uploadButton: language === 'id' 
      ? 'Upload foto dengan wajah yang jelas dan pencahayaan bagus'
      : 'Upload a photo with a clearly visible face and good lighting',
    dragDrop: language === 'id' 
      ? 'Drag and drop di sini, format JPEG, PNG dan JPG (maks: 5MB)'
      : 'Drag and drop here, JPEG, PNG and JPG formats (max: 5MB)',
    changePhoto: language === 'id' ? 'Ganti foto' : 'Change photo',
    previous: language === 'id' ? 'Sebelumnya' : 'Previous',
    next: language === 'id' ? 'Lanjut' : 'Next',
    uploading: language === 'id' ? 'Mengupload...' : 'Uploading...',
    fileTooLarge: language === 'id' ? 'File terlalu besar. Maksimal 5MB.' : 'File too large. Maximum 5MB.',
    invalidFormat: language === 'id' ? 'Format tidak valid. Gunakan JPEG atau PNG.' : 'Invalid format. Use JPEG or PNG.',
  };

  const handleFileSelect = (file: File) => {
    setUploadError(null);
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(uiText.fileTooLarge);
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError(uiText.invalidFormat);
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const uploadToSupabase = async (file: File): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    // Generate unique filename
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage bucket "avatars"
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleNext = async () => {
    if (!selectedFile || !previewUrl) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // Upload to Supabase Storage
      const avatarUrl = await uploadToSupabase(selectedFile);

      // Update user profile with avatar URL
      if (user) {
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ avatar_url: avatarUrl })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Failed to update profile:', updateError);
          // Continue anyway, avatar is uploaded
        }
      }

      // Navigate to preview with the permanent URL
      navigate("/avatar-preview", { state: { avatarUrl } });

    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadError(err.message || 'Upload failed');
      
      // Fallback: navigate with base64 preview
      navigate("/avatar-preview", { state: { avatarUrl: previewUrl } });
    } finally {
      setIsUploading(false);
    }
  };

  const handleBack = () => {
    navigate("/creative-dna");
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-3xl">
        <div className="mb-8 sm:mb-12">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>
          <div className="flex gap-2 mb-8 justify-center">
            <div className="h-1 w-12 sm:w-16 bg-[#7c3aed] rounded-full" />
            <div className="h-1 w-12 sm:w-16 bg-[#7c3aed] rounded-full" />
            <div className="h-1 w-12 sm:w-16 bg-[#7c3aed] rounded-full" />
            <div className="h-1 w-12 sm:w-16 bg-[#7c3aed] rounded-full" />
            <div className="h-1 w-12 sm:w-16 bg-white/20 rounded-full" />
            <div className="h-1 w-12 sm:w-16 bg-white/20 rounded-full" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white text-center mb-3">
            {uiText.title}
          </h1>
          <p className="text-white/60 text-center text-sm max-w-2xl mx-auto px-4">
            {uiText.subtitle}
          </p>
        </div>

        <div
          className={`relative border-2 border-dashed rounded-3xl p-6 sm:p-12 transition-all duration-300 ${
            isDragging
              ? "border-[#7c3aed] bg-[#7c3aed]/10"
              : previewUrl
              ? "border-[#7c3aed] bg-[#1a1a24]"
              : "border-[#3a3a48] bg-[#1a1a24] hover:border-[#7c3aed]/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            onChange={handleFileChange}
            className="hidden"
          />

          {previewUrl ? (
            <div className="flex flex-col items-center">
              <div className="relative mb-6">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full max-w-lg h-48 sm:h-64 object-cover rounded-2xl"
                />
                <button
                  onClick={() => {
                    setPreviewUrl(null);
                    setSelectedFile(null);
                    setUploadError(null);
                  }}
                  className="absolute top-3 right-3 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <button
                onClick={handleUploadClick}
                className="text-[#7c3aed] hover:text-[#6d28d9] text-sm font-medium transition-colors"
              >
                {uiText.changePhoto}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <div className="w-full max-w-lg h-36 sm:h-48 bg-[#2a2a38] rounded-2xl mb-6 flex items-center justify-center overflow-hidden">
                <img
                  src="https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=600"
                  alt="Example"
                  className="w-full h-full object-cover"
                />
              </div>

              <button
                onClick={handleUploadClick}
                className="group flex items-center justify-center gap-3 px-4 sm:px-8 py-4 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl font-medium transition-all duration-200 hover:scale-105 mb-4 text-sm sm:text-base"
              >
                <Upload className="w-5 h-5 flex-shrink-0" />
                <span className="text-center">{uiText.uploadButton}</span>
              </button>

              <p className="text-white/50 text-xs sm:text-sm text-center px-4">
                {uiText.dragDrop}
              </p>
            </div>
          )}

          {/* Error Message */}
          {uploadError && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
              {uploadError}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-8 sm:mt-12">
          <Button
            onClick={handleBack}
            variant="secondary"
            className="bg-white text-[#0a0a12] hover:bg-white/90 h-12 px-6 sm:px-8 font-medium"
          >
            {uiText.previous}
          </Button>
          <Button
            onClick={handleNext}
            disabled={!selectedFile || isUploading}
            className={`h-12 px-6 sm:px-8 font-medium ${
              !selectedFile || isUploading
                ? "bg-[#7c3aed]/50 text-white/50 cursor-not-allowed"
                : "bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uiText.uploading}
              </>
            ) : (
              uiText.next
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
