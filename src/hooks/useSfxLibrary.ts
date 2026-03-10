// ============================================================================
// useSfxLibrary — List SFX files from Supabase Storage 'sfx-library' bucket
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface SfxFile {
  name: string;
  url: string;
  category: string;
}

export interface SfxCategory {
  name: string;
  files: SfxFile[];
}

interface SfxLibraryResult {
  categories: SfxCategory[];
  isLoading: boolean;
  error: string | null;
}

const BUCKET_NAME = 'sfx-library';
const FILE_LIMIT = 100;

// Supported audio file extensions
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.webm', '.flac']);

function isAudioFile(name: string): boolean {
  const lower = name.toLowerCase();
  return Array.from(AUDIO_EXTENSIONS).some(ext => lower.endsWith(ext));
}

export function useSfxLibrary(): SfxLibraryResult {
  const [categories, setCategories] = useState<SfxCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Only fetch once
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    let cancelled = false;

    async function loadLibrary() {
      setIsLoading(true);
      setError(null);

      try {
        // List root-level items (folders = categories)
        const { data: rootItems, error: rootError } = await supabase.storage
          .from(BUCKET_NAME)
          .list('', { limit: FILE_LIMIT, sortBy: { column: 'name', order: 'asc' } });

        if (rootError) {
          // If bucket doesn't exist or access denied, return empty gracefully
          if (
            rootError.message?.includes('not found') ||
            rootError.message?.includes('does not exist') ||
            rootError.message?.includes('Bucket not found')
          ) {
            if (!cancelled) {
              setCategories([]);
              setIsLoading(false);
            }
            return;
          }
          throw new Error(rootError.message);
        }

        if (!rootItems || rootItems.length === 0) {
          if (!cancelled) {
            setCategories([]);
            setIsLoading(false);
          }
          return;
        }

        // Separate folders (categories) from root-level audio files
        // Supabase storage: folders have id=null and no metadata
        const folders = rootItems.filter(
          item => item.id === null && !isAudioFile(item.name)
        );
        const rootFiles = rootItems.filter(item => isAudioFile(item.name));

        const result: SfxCategory[] = [];

        // Process each folder as a category
        const folderPromises = folders.map(async (folder) => {
          const { data: files, error: filesError } = await supabase.storage
            .from(BUCKET_NAME)
            .list(folder.name, {
              limit: FILE_LIMIT,
              sortBy: { column: 'name', order: 'asc' },
            });

          if (filesError || !files) return null;

          const audioFiles: SfxFile[] = files
            .filter(f => isAudioFile(f.name))
            .map(f => {
              const filePath = `${folder.name}/${f.name}`;
              const { data: urlData } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(filePath);
              return {
                name: f.name.replace(/\.[^.]+$/, ''), // strip extension for display
                url: urlData.publicUrl,
                category: folder.name,
              };
            });

          if (audioFiles.length === 0) return null;

          return {
            name: folder.name,
            files: audioFiles,
          };
        });

        const folderResults = await Promise.all(folderPromises);

        for (const cat of folderResults) {
          if (cat) result.push(cat);
        }

        // If there are root-level audio files, add them as "Uncategorized"
        if (rootFiles.length > 0) {
          const uncategorizedFiles: SfxFile[] = rootFiles.map(f => {
            const { data: urlData } = supabase.storage
              .from(BUCKET_NAME)
              .getPublicUrl(f.name);
            return {
              name: f.name.replace(/\.[^.]+$/, ''),
              url: urlData.publicUrl,
              category: 'Uncategorized',
            };
          });
          result.push({ name: 'Uncategorized', files: uncategorizedFiles });
        }

        if (!cancelled) {
          setCategories(result);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load SFX library';
          setError(message);
          setCategories([]);
          setIsLoading(false);
        }
      }
    }

    loadLibrary();

    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, isLoading, error };
}
