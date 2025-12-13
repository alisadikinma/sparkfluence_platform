import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { FadeIn } from '../../../components/animations';
import { useLanguage } from '../../../contexts/LanguageContext';

const testimonials = [
  {
    id: 1,
    quote: "Sparkfluence transformed my content game. I went from posting once a week to daily, and my engagement tripled!",
    name: 'Sarah Chen',
    role: 'Lifestyle Creator',
    avatar: 'https://randomuser.me/api/portraits/women/65.jpg',
  },
  {
    id: 2,
    quote: "The AI scripts are incredibly on-point. It understands trends and creates hooks that actually work.",
    name: 'Marcus Johnson',
    role: 'Tech Reviewer',
    avatar: 'https://randomuser.me/api/portraits/men/46.jpg',
  },
  {
    id: 3,
    quote: "As a small business owner, this tool saved me thousands on video production. Game changer!",
    name: 'Emily Rodriguez',
    role: 'Business Owner',
    avatar: 'https://randomuser.me/api/portraits/women/47.jpg',
  },
];

export const TestimonialsSection: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const { t } = useLanguage();

  const nextTestimonial = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="py-16 md:py-20 lg:py-28 bg-surface/50">
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-6">
        {/* Section Header */}
        <FadeIn direction="up" className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-4">
            {t.testimonials.title}{' '}
            <span className="text-gradient">{t.testimonials.titleHighlight}</span>
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            {t.testimonials.description}
          </p>
        </FadeIn>

        {/* Desktop Grid */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <FadeIn key={testimonial.id} delay={index * 0.1} direction="up">
              <TestimonialCard {...testimonial} />
            </FadeIn>
          ))}
        </div>

        {/* Mobile/Tablet Carousel */}
        <div className="lg:hidden">
          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <TestimonialCard {...testimonials[activeIndex]} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Carousel Controls */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <motion.button
              onClick={prevTestimonial}
              className="p-2 rounded-full bg-card border border-border-default text-text-secondary hover:text-text-primary hover:border-primary/50 transition-colors"
              whileTap={{ scale: 0.9 }}
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>

            {/* Dots */}
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === activeIndex
                      ? 'w-6 bg-primary'
                      : 'w-2 bg-border-default hover:bg-text-muted'
                  }`}
                />
              ))}
            </div>

            <motion.button
              onClick={nextTestimonial}
              className="p-2 rounded-full bg-card border border-border-default text-text-secondary hover:text-text-primary hover:border-primary/50 transition-colors"
              whileTap={{ scale: 0.9 }}
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
};

interface TestimonialCardProps {
  quote: string;
  name: string;
  role: string;
  avatar: string;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({
  quote,
  name,
  role,
  avatar,
}) => {
  return (
    <motion.div
      className="relative p-6 md:p-8 rounded-2xl bg-card border border-border-default h-full"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      {/* Quote Icon */}
      <div className="absolute top-6 right-6 text-primary/20">
        <Quote className="w-10 h-10" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <p className="text-lg text-text-secondary mb-6 italic">
          "{quote}"
        </p>

        {/* Author */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-surface">
            <img
              src={avatar}
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8B5CF6&color=fff`;
              }}
            />
          </div>
          <div>
            <p className="font-semibold text-text-primary">{name}</p>
            <p className="text-sm text-text-muted">{role}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
