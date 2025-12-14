import React from 'react';
import { User, Upload, X, ChevronDown, Loader2, Trash2, Edit2, Check } from 'lucide-react';
import { SavedAvatar, AvatarOption } from '../../hooks/useAvatarManager';
import { Button } from './button';

interface AvatarDropdownProps {
  // State
  avatarOption: AvatarOption;
  avatarDropdownOpen: boolean;
  uploadedAvatarPreview: string | null;
  savedAvatars: SavedAvatar[];
  selectedSavedAvatar: SavedAvatar | null;
  cachedAvatarUrl: string | null;
  profileCharacterDesc: string | null;
  
  // Loading states
  loadingAvatars: boolean;
  analyzingAvatar: boolean;
  
  // Edit state
  editingAvatarId: string | null;
  editingName: string;
  
  // Actions
  onDropdownToggle: () => void;
  onAvatarSelect: (option: AvatarOption, savedAvatar?: SavedAvatar) => void;
  onDelete: (avatarId: string, e: React.MouseEvent) => void;
  onEditStart: (avatarId: string, currentName: string) => void;
  onEditNameChange: (name: string) => void;
  onEditSave: (avatarId: string) => void;
  onEditCancel: () => void;
  getDisplayName: () => string;
  
  // Refs
  dropdownRef: React.RefObject<HTMLDivElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  
  // Config
  language: string;
  disabled?: boolean;
  className?: string;
}

export const AvatarDropdown: React.FC<AvatarDropdownProps> = ({
  avatarOption,
  avatarDropdownOpen,
  uploadedAvatarPreview,
  savedAvatars,
  selectedSavedAvatar,
  cachedAvatarUrl,
  profileCharacterDesc,
  loadingAvatars,
  analyzingAvatar,
  editingAvatarId,
  editingName,
  onDropdownToggle,
  onAvatarSelect,
  onDelete,
  onEditStart,
  onEditNameChange,
  onEditSave,
  onEditCancel,
  getDisplayName,
  dropdownRef,
  fileInputRef,
  language,
  disabled = false,
  className = '',
}) => {
  const uiText = {
    noAvatar: language === 'id' ? 'Tanpa Avatar' : 'No Avatar',
    useProfile: language === 'id' ? 'Gunakan Profil' : 'Use Profile',
    uploadNew: language === 'id' ? 'Upload Baru' : 'Upload New',
    savedAvatars: language === 'id' ? 'Avatar Tersimpan' : 'Saved Avatars',
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={onDropdownToggle}
        disabled={disabled || analyzingAvatar}
        className="w-full flex items-center justify-between gap-1 bg-surface border border-border-default rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 text-text-primary text-xs sm:text-sm lg:text-base focus:outline-none focus:border-primary cursor-pointer"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {analyzingAvatar || loadingAvatars ? (
            <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-primary" />
          ) : uploadedAvatarPreview && avatarOption !== 'none' ? (
            <img src={uploadedAvatarPreview} alt="" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover" />
          ) : (
            <User className="w-3 h-3 sm:w-4 sm:h-4 text-text-secondary" />
          )}
          <span className="truncate text-xs sm:text-sm">
            {analyzingAvatar ? '...' : getDisplayName()}
          </span>
        </div>
        <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-text-secondary flex-shrink-0" />
      </button>

      {/* Dropdown Menu */}
      {avatarDropdownOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border-default rounded-lg shadow-lg z-50 overflow-hidden max-h-64 overflow-y-auto">
          {/* No Avatar */}
          <button
            type="button"
            onClick={() => onAvatarSelect('none')}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs sm:text-sm hover:bg-page transition-colors ${
              avatarOption === 'none' ? 'bg-primary/20 text-primary' : 'text-text-secondary'
            }`}
          >
            <X className="w-4 h-4" />
            <span>{uiText.noAvatar}</span>
          </button>

          {/* Use Profile Avatar */}
          {cachedAvatarUrl && (
            <button
              type="button"
              onClick={() => onAvatarSelect('profile')}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs sm:text-sm hover:bg-page transition-colors ${
                avatarOption === 'profile' ? 'bg-primary/20 text-primary' : 'text-text-secondary'
              }`}
            >
              <img src={cachedAvatarUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
              <span>{uiText.useProfile}</span>
              {profileCharacterDesc && <span className="text-green-400 text-xs">✓</span>}
            </button>
          )}

          {/* Saved Avatars */}
          {savedAvatars.length > 0 && (
            <>
              <div className="px-3 py-1 text-xs text-text-muted border-t border-border-default mt-1">
                {uiText.savedAvatars}
              </div>
              {savedAvatars.map((avatar) => (
                <div
                  key={avatar.id}
                  className={`flex items-center gap-2 px-3 py-2 hover:bg-page transition-colors ${
                    selectedSavedAvatar?.id === avatar.id ? 'bg-primary/20' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onAvatarSelect('saved', avatar)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    <img src={avatar.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                    {editingAvatarId === avatar.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => onEditNameChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onEditSave(avatar.id);
                          if (e.key === 'Escape') onEditCancel();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-page border border-primary rounded px-1 py-0.5 text-xs text-text-primary focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className={`truncate text-xs sm:text-sm ${
                        selectedSavedAvatar?.id === avatar.id ? 'text-primary' : 'text-text-secondary'
                      }`}>
                        {avatar.name}
                      </span>
                    )}
                    {avatar.character_description && <span className="text-green-400 text-xs flex-shrink-0">✓</span>}
                  </button>
                  
                  {/* Edit/Delete buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {editingAvatarId === avatar.id ? (
                      <button
                        type="button"
                        onClick={() => onEditSave(avatar.id)}
                        className="p-1 text-green-400 hover:bg-green-400/20 rounded"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditStart(avatar.id, avatar.name);
                        }}
                        className="p-1 text-text-muted hover:text-primary hover:bg-primary/20 rounded"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => onDelete(avatar.id, e)}
                      className="p-1 text-text-muted hover:text-red-400 hover:bg-red-400/20 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Upload New */}
          <button
            type="button"
            onClick={() => onAvatarSelect('upload')}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs sm:text-sm hover:bg-page transition-colors text-text-secondary border-t border-border-default"
          >
            <Upload className="w-4 h-4" />
            <span>{uiText.uploadNew}</span>
          </button>
        </div>
      )}
    </div>
  );
};

// Name Modal Component
interface AvatarNameModalProps {
  show: boolean;
  name: string;
  previewFile: File | null;
  saving: boolean;
  language: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onCancel: () => void;
  nameInputRef: React.RefObject<HTMLInputElement>;
}

export const AvatarNameModal: React.FC<AvatarNameModalProps> = ({
  show,
  name,
  previewFile,
  saving,
  language,
  onNameChange,
  onSave,
  onCancel,
  nameInputRef,
}) => {
  if (!show) return null;

  const uiText = {
    title: language === 'id' ? 'Nama Avatar' : 'Avatar Name',
    placeholder: language === 'id' ? 'Masukkan nama...' : 'Enter name...',
    cancel: language === 'id' ? 'Batal' : 'Cancel',
    save: language === 'id' ? 'Simpan' : 'Save',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border-default rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          {uiText.title}
        </h3>
        
        {previewFile && (
          <div className="flex justify-center mb-4">
            <img 
              src={URL.createObjectURL(previewFile)} 
              alt="Preview" 
              className="w-20 h-20 rounded-full object-cover border-2 border-primary"
            />
          </div>
        )}
        
        <input
          ref={nameInputRef}
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={uiText.placeholder}
          className="w-full bg-surface border border-border-default rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-primary mb-4"
          maxLength={30}
        />
        
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
            className="flex-1"
          >
            {uiText.cancel}
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={saving || !name.trim()}
            className="flex-1 bg-primary hover:bg-primary-hover text-white"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              uiText.save
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
