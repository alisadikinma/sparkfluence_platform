import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface PlannedContent {
  id: string;
  user_id: string;
  title: string;
  description: string;
  content_type: string;
  platforms: string[];
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  thumbnail_url?: string;
  video_data?: any;
  final_video_url?: string;
  is_public?: boolean;
  created_at: string;
  updated_at: string;
}

interface PlannerContextType {
  plannedContent: PlannedContent[];
  loading: boolean;
  error: string | null;
  addPlannedContent: (content: Omit<PlannedContent, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<PlannedContent | null>;
  updatePlannedContent: (id: string, updates: Partial<PlannedContent>) => Promise<boolean>;
  deletePlannedContent: (id: string) => Promise<boolean>;
  refreshContent: () => Promise<void>;
}

const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

export const usePlanner = () => {
  const context = useContext(PlannerContext);
  if (!context) {
    throw new Error('usePlanner must be used within a PlannerProvider');
  }
  return context;
};

interface PlannerProviderProps {
  children: ReactNode;
}

export const PlannerProvider = ({ children }: PlannerProviderProps) => {
  const [plannedContent, setPlannedContent] = useState<PlannedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setPlannedContent([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('planned_content')
        .select('*')
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      if (fetchError) throw fetchError;

      setPlannedContent(data || []);
    } catch (err) {
      console.error('Error fetching planned content:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch content');
    } finally {
      setLoading(false);
    }
  };

  const addPlannedContent = async (
    content: Omit<PlannedContent, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<PlannedContent | null> => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('Error getting user:', userError);
        throw new Error(`Authentication error: ${userError.message}`);
      }

      if (!user) {
        throw new Error('User not authenticated. Please log in and try again.');
      }

      console.log('Adding content for user:', user.id);

      const insertData = {
        ...content,
        user_id: user.id,
      };

      console.log('Inserting data:', insertData);

      const { data, error: insertError } = await supabase
        .from('planned_content')
        .insert([insertData])
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(`Database error: ${insertError.message}`);
      }

      if (data) {
        console.log('Content added successfully:', data);
        setPlannedContent((prev) => [...prev, data]);
        return data;
      }

      throw new Error('No data returned from insert operation');
    } catch (err) {
      console.error('Error adding planned content:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add content';
      setError(errorMessage);
      throw err;
    }
  };

  const updatePlannedContent = async (id: string, updates: Partial<PlannedContent>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('planned_content')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      setPlannedContent((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );

      return true;
    } catch (err) {
      console.error('Error updating planned content:', err);
      setError(err instanceof Error ? err.message : 'Failed to update content');
      return false;
    }
  };

  const deletePlannedContent = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('planned_content')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setPlannedContent((prev) => prev.filter((item) => item.id !== id));

      return true;
    } catch (err) {
      console.error('Error deleting planned content:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete content');
      return false;
    }
  };

  const refreshContent = async () => {
    await fetchContent();
  };

  useEffect(() => {
    fetchContent();

    try {
      const channel = supabase
        .channel('planned_content_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'planned_content',
          },
          () => {
            fetchContent();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Failed to set up realtime subscription:', error);
    }
  }, []);

  const value: PlannerContextType = {
    plannedContent,
    loading,
    error,
    addPlannedContent,
    updatePlannedContent,
    deletePlannedContent,
    refreshContent,
  };

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
};
