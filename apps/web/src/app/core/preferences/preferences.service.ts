import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import enUsTranslations from '../../../assets/i18n/en-US.json';
import ptBrTranslations from '../../../assets/i18n/pt-BR.json';

export type SupportedLanguage = 'pt-BR' | 'en-US';
export type ThemePreference = 'light' | 'dark';

const LANGUAGE_KEY = 'bcb.preferences.language';
const THEME_KEY = 'bcb.preferences.theme';
const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['pt-BR', 'en-US'];
type TranslationTable = Parameters<TranslateService['setTranslation']>[1];

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly languageSignal = signal<SupportedLanguage>(readLanguage());
  private readonly themeSignal = signal<ThemePreference>(readTheme());

  readonly language = this.languageSignal.asReadonly();
  readonly theme = this.themeSignal.asReadonly();
  readonly languages = SUPPORTED_LANGUAGES;

  constructor(private readonly translate: TranslateService) {
    this.translate.addLangs([...SUPPORTED_LANGUAGES]);
    this.translate.setTranslation('pt-BR', ptBrTranslations as TranslationTable);
    this.translate.setTranslation('en-US', enUsTranslations as TranslationTable);
    this.translate.setFallbackLang('pt-BR');
    this.translate.use(this.languageSignal());
    this.applyTheme(this.themeSignal());
  }

  setLanguage(language: SupportedLanguage): void {
    this.languageSignal.set(language);
    globalThis.localStorage?.setItem(LANGUAGE_KEY, language);
    this.translate.use(language);
  }

  toggleTheme(): void {
    this.setTheme(this.themeSignal() === 'dark' ? 'light' : 'dark');
  }

  private setTheme(theme: ThemePreference): void {
    this.themeSignal.set(theme);
    globalThis.localStorage?.setItem(THEME_KEY, theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: ThemePreference): void {
    globalThis.document?.documentElement.classList.toggle('dark', theme === 'dark');
  }
}

function readLanguage(): SupportedLanguage {
  const value = globalThis.localStorage?.getItem(LANGUAGE_KEY);

  return value === 'en-US' ? 'en-US' : 'pt-BR';
}

function readTheme(): ThemePreference {
  const value = globalThis.localStorage?.getItem(THEME_KEY);

  return value === 'dark' ? 'dark' : 'light';
}
