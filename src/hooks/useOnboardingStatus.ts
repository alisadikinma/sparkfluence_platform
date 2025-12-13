import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface OnboardingStatus {
  loading: boolean;
  completed: boolean;
  data: {
    interest: string;
    profession: string;
    platforms: string[];
    objectives: string[];
    selected_niches: string[];
    creative_dna: string[];
  } | null;
}

export const useOnboardingStatus = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<OnboardingStatus>({
    loading: true,
    completed: false,
    data: null
  });

  useEffect(() => {
    const checkStatus = async () => {
      if (!user) {
        setStatus({ loading: false, completed: false, data: null });
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('onboarding_completed, interest, profession, platforms, objectives, selected_niches, creative_dna')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error checking onboarding status:', error);
          setStatus({ loading: false, completed: false, data: null });
          return;
        }

        setStatus({
          loading: false,
          completed: data?.onboarding_completed || false,
          data: data ? {
            interest: data.interest || '',
            profession: data.profession || '',
            platforms: data.platforms || [],
            objectives: data.objectives || [],
            selected_niches: data.selected_niches || [],
            creative_dna: data.creative_dna || []
          } : null
        });
      } catch (err) {
        console.error('Error:', err);
        setStatus({ loading: false, completed: false, data: null });
      }
    };

    checkStatus();
  }, [user]);

  return status;
};

/**
 * Hook to navigate to the correct page based on onboarding status
 * - If onboarding not complete: go to /welcome -> /onboarding flow
 * - If onboarding complete: go directly to /topic-selection
 */
export const useCreateVideoFlow = () => {
  const navigate = useNavigate();
  const { completed, data, loading } = useOnboardingStatus();

  const startCreateVideo = () => {
    if (loading) return;

    if (completed && data) {
      // Onboarding complete - sync data to localStorage for OnboardingContext
      const onboardingData = {
        interest: data.interest,
        profession: data.profession,
        platforms: data.platforms,
        objectives: data.objectives,
        selectedNiches: data.selected_niches.join('; '),
        creativeDNA: data.creative_dna,
        creativeStyle: data.creative_dna.join(', ')
      };
      localStorage.setItem('onboarding_data', JSON.stringify(onboardingData));
      
      // Go directly to topic selection
      navigate('/topic-selection');
    } else {
      // First time user - go through onboarding
      navigate('/welcome');
    }
  };

  return { startCreateVideo, loading, onboardingComplete: completed };
};

/**
 * Complete onboarding and save to database
 */
export const completeOnboarding = async (
  userId: string,
  data: {
    interest: string;
    profession: string;
    platforms: string[];
    objectives: string[];
    selected_niches: string[];
    creative_dna: string[];
  }
) => {
  // Upsert profile with user_id as conflict key
  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: userId,
      interest: data.interest,
      profession: data.profession,
      platforms: data.platforms,
      objectives: data.objectives,
      selected_niches: data.selected_niches,
      creative_dna: data.creative_dna,
      onboarding_completed: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (error) {
    console.error('Error saving onboarding:', error);
    throw error;
  }

  return true;
};
