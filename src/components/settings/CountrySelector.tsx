import React, { useState, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getSupportedCountries, getCountryName, detectCountryFromTimezone } from '../../lib/countryDetection';

interface CountrySelectorProps {
  className?: string;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [selectedCountry, setSelectedCountry] = useState<string>('ID');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const countries = getSupportedCountries();

  // Fetch current country from profile
  useEffect(() => {
    const fetchCountry = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from('user_profiles')
        .select('country')
        .eq('user_id', user.id)
        .single();

      if (data?.country) {
        setSelectedCountry(data.country);
      } else {
        // Default to detected country
        setSelectedCountry(detectCountryFromTimezone());
      }
    };

    fetchCountry();
  }, [user]);

  const handleSelect = async (countryCode: string) => {
    if (!user?.id || countryCode === selectedCountry) {
      setIsOpen(false);
      return;
    }

    setLoading(true);
    
    const { error } = await supabase
      .from('user_profiles')
      .update({ country: countryCode })
      .eq('user_id', user.id);

    if (!error) {
      setSelectedCountry(countryCode);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }

    setLoading(false);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-white/70 mb-2">
        <Globe className="w-4 h-4 inline mr-2" />
        Trending Region
      </label>
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="w-full flex items-center justify-between bg-[#0a0a12] border border-[#2b2b38] rounded-xl px-4 py-3 text-white hover:border-[#7c3aed]/50 transition-colors disabled:opacity-50"
      >
        <span className="flex items-center gap-2">
          <span className="text-lg">{getCountryFlag(selectedCountry)}</span>
          <span>{getCountryName(selectedCountry)}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {saved && (
        <div className="absolute right-0 top-0 flex items-center gap-1 text-green-400 text-xs">
          <Check className="w-3 h-3" />
          Saved
        </div>
      )}

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full max-h-64 overflow-y-auto bg-[#1a1a24] border border-[#2b2b38] rounded-xl shadow-xl">
          {countries.map(({ code, name }) => (
            <button
              key={code}
              onClick={() => handleSelect(code)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#7c3aed]/10 transition-colors ${
                code === selectedCountry ? 'bg-[#7c3aed]/20 text-[#7c3aed]' : 'text-white'
              }`}
            >
              <span className="text-lg">{getCountryFlag(code)}</span>
              <span className="flex-1">{name}</span>
              {code === selectedCountry && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}

      <p className="mt-2 text-xs text-white/40">
        This affects trending topics shown in niche recommendations
      </p>
    </div>
  );
};

// Get country flag emoji from code
function getCountryFlag(code: string): string {
  const flags: Record<string, string> = {
    'ID': '🇮🇩',
    'IN': '🇮🇳',
    'US': '🇺🇸',
    'GB': '🇬🇧',
    'SG': '🇸🇬',
    'MY': '🇲🇾',
    'PH': '🇵🇭',
    'TH': '🇹🇭',
    'VN': '🇻🇳',
    'JP': '🇯🇵',
    'KR': '🇰🇷',
    'CN': '🇨🇳',
    'HK': '🇭🇰',
    'TW': '🇹🇼',
    'AU': '🇦🇺',
    'NZ': '🇳🇿',
    'CA': '🇨🇦',
    'MX': '🇲🇽',
    'BR': '🇧🇷',
    'AR': '🇦🇷',
    'DE': '🇩🇪',
    'FR': '🇫🇷',
    'ES': '🇪🇸',
    'IT': '🇮🇹',
    'NL': '🇳🇱',
    'RU': '🇷🇺',
    'TR': '🇹🇷',
    'SA': '🇸🇦',
    'AE': '🇦🇪',
    'PK': '🇵🇰',
    'BD': '🇧🇩',
    'LK': '🇱🇰',
    'NP': '🇳🇵',
    'MM': '🇲🇲',
    'KH': '🇰🇭',
    'NG': '🇳🇬',
    'ZA': '🇿🇦',
    'EG': '🇪🇬',
    'KE': '🇰🇪',
  };
  return flags[code] || '🌍';
}

export default CountrySelector;
