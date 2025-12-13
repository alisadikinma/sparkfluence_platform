import { en, TranslationKeys } from './translations/en';
import { id } from './translations/id';
import { hi } from './translations/hi';

export type Language = 'en' | 'id' | 'hi';

export const translations: Record<Language, TranslationKeys> = {
  en,
  id,
  hi,
};

export type { TranslationKeys };
export { en, id, hi };
