import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { ChevronDown } from "lucide-react";

const languages = [
  { code: "id", label: "Indonesia", flag: "/flags/id.svg" },
  { code: "en", label: "English", flag: "/flags/gb.svg" },
  { code: "hi", label: "India", flag: "/flags/in.svg" },
];

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = languages.find(l => l.code === language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (code: string) => {
    setLanguage(code as "id" | "en" | "hi");
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a24] border border-[#2b2b38] hover:bg-[#2a2a38] transition-colors"
      >
        <img
          src={currentLang.flag}
          alt={currentLang.label}
          className="w-5 h-5 rounded-full object-cover"
        />
        <span className="text-white text-sm hidden sm:inline">{currentLang.label}</span>
        <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a24] border border-[#2b2b38] rounded-xl shadow-xl z-50 overflow-hidden">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#2a2a38] transition-colors ${
                language === lang.code ? 'bg-[#2a2a38]' : ''
              }`}
            >
              <img
                src={lang.flag}
                alt={lang.label}
                className="w-5 h-5 rounded-full object-cover"
              />
              <span className="text-white text-sm">{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
