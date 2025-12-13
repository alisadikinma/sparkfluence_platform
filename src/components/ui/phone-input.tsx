import React, { useState, useRef, useEffect } from "react";
import { Input } from "./input";
import { ChevronDown, Search } from "lucide-react";
import { countryCodes, CountryCode, detectCountryFromTimezone, formatPhoneForAPI } from "../../lib/countryCodes";

interface PhoneInputProps {
  value: string;
  onChange: (phone: string, dialCode: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  defaultCountry?: string; // ISO code like 'ID', 'US'
  autoDetect?: boolean;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder,
  className = "",
  defaultCountry,
  autoDetect = true,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(() => {
    if (defaultCountry) {
      return countryCodes.find(c => c.code === defaultCountry) || countryCodes[0];
    }
    return autoDetect ? detectCountryFromTimezone() : countryCodes[0];
  });
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef(false);

  // Initialize dial code on mount
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      // Notify parent of initial dial code
      onChange(value, selectedCountry.dialCode);
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const filteredCountries = searchQuery
    ? countryCodes.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.dialCode.includes(searchQuery) ||
          c.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : countryCodes;

  const handleCountrySelect = (country: CountryCode) => {
    console.log("[PhoneInput] Country selected:", country.name, "+"+country.dialCode);
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchQuery("");
    // Notify parent with updated dial code
    onChange(value, country.dialCode);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.replace(/\D/g, "");
    // Remove leading zero if user types it
    const cleanValue = inputValue.startsWith("0") ? inputValue.slice(1) : inputValue;
    onChange(cleanValue, selectedCountry.dialCode);
  };

  return (
    <div className={`relative flex gap-2 ${className}`} ref={dropdownRef}>
      {/* Country Selector */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-1.5 bg-[#0a0a12] border border-[#2b2b38] rounded-xl px-3 h-12 hover:border-[#7c3aed] transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
      >
        <span className="text-lg">{selectedCountry.flag}</span>
        <span className="text-white text-sm">+{selectedCountry.dialCode}</span>
        <ChevronDown className={`w-4 h-4 text-[#9ca3af] transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-[#1a1a24] border border-[#2b2b38] rounded-xl shadow-xl z-50 max-h-80 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-[#2b2b38]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0a0a12] border border-[#2b2b38] rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder:text-[#9ca3af] focus:border-[#7c3aed] focus:outline-none"
              />
            </div>
          </div>

          {/* Country List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredCountries.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleCountrySelect(country)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#7c3aed]/20 transition-colors text-left ${
                  selectedCountry.code === country.code ? "bg-[#7c3aed]/10" : ""
                }`}
              >
                <span className="text-lg">{country.flag}</span>
                <span className="text-white text-sm flex-1 truncate">{country.name}</span>
                <span className="text-[#9ca3af] text-sm">+{country.dialCode}</span>
              </button>
            ))}
            {filteredCountries.length === 0 && (
              <p className="text-[#9ca3af] text-sm text-center py-4">No country found</p>
            )}
          </div>
        </div>
      )}

      {/* Phone Number Input */}
      <Input
        type="tel"
        placeholder={placeholder || selectedCountry.placeholder}
        value={value}
        onChange={handlePhoneChange}
        disabled={disabled}
        className="flex-1 bg-[#0a0a12] border-[#2b2b38] text-white placeholder:text-white/40 h-12 rounded-xl focus:border-[#7c3aed]"
      />
    </div>
  );
};
