export type ThemePreference = 'light' | 'dark' | 'auto';
export type StudentSkin = 'default' | 'halloween' | 'mid_autumn' | 'tet';

const THEME_KEY = 'aptis-theme';
export const THEME_UPDATED_EVENT = 'aptis-theme-updated';
export const STUDENT_SKIN_KEY = 'aptis-student-skin';
export const UI_SETTINGS_UPDATED_EVENT = 'aptis-ui-settings-updated';

export function getStoredStudentSkin(): StudentSkin {
  const skin = typeof window === 'undefined' ? null : window.localStorage.getItem(STUDENT_SKIN_KEY);
  return skin === 'halloween' || skin === 'mid_autumn' || skin === 'tet' ? skin : 'default';
}

export function applyThemePreference() {
  document.documentElement.classList.remove('dark');
  document.documentElement.dataset.theme = 'light';
  document.documentElement.style.colorScheme = 'light';
}

export function getStoredTheme(): 'light' | 'dark' {
  return window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
}

export function setStudentTheme(theme: 'light' | 'dark') {
  window.localStorage.setItem(THEME_KEY, theme);
  window.dispatchEvent(new Event(THEME_UPDATED_EVENT));
}

export function applyStudentSkin(skin: StudentSkin = 'default') {
  document.documentElement.dataset.studentSkin = skin;
}

