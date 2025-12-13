import React from 'react';
import {
  HeroSection,
  FeaturesSection,
  FeatureShowcase,
  TestimonialsSection,
  CTASection,
} from './sections';

export const Landing: React.FC = () => {
  return (
    <div className="overflow-hidden">
      <HeroSection />
      <FeaturesSection />
      <FeatureShowcase />
      <TestimonialsSection />
      <CTASection />
    </div>
  );
};
