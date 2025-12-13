import React, { createContext, useContext, useState, useEffect } from 'react';

interface OnboardingData {
  interest: string;
  profession: string;
  platforms: string[];
  objectives: string[];
  selectedNiches: string;
  creativeDNA: string[];  // Array of selected DNA styles
  creativeStyle: string;  // Keep for backward compatibility
}

interface OnboardingContextType {
  onboardingData: OnboardingData;
  updateOnboardingData: (data: Partial<OnboardingData>) => void;
  clearOnboardingData: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const STORAGE_KEY = 'onboarding_data';

const defaultOnboardingData: OnboardingData = {
  interest: '',
  profession: '',
  platforms: [],
  objectives: [],
  selectedNiches: '',
  creativeDNA: [],
  creativeStyle: '',
};

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Ensure creativeDNA is always an array
        return {
          ...defaultOnboardingData,
          ...parsed,
          creativeDNA: parsed.creativeDNA || []
        };
      } catch (e) {
        console.error('Failed to parse stored onboarding data:', e);
      }
    }
    return defaultOnboardingData;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(onboardingData));
  }, [onboardingData]);

  const updateOnboardingData = (data: Partial<OnboardingData>) => {
    setOnboardingData((prev) => ({
      ...prev,
      ...data,
    }));
  };

  const clearOnboardingData = () => {
    setOnboardingData(defaultOnboardingData);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <OnboardingContext.Provider
      value={{
        onboardingData,
        updateOnboardingData,
        clearOnboardingData,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
