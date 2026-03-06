import type { Language } from '@/types'

const translations = {
  // Navigation
  'nav.dashboard': { de: 'Übersicht', en: 'Dashboard' },
  'nav.newSession': { de: 'Neue Session', en: 'New Session' },
  'nav.admin.usage': { de: 'Nutzung & Kosten', en: 'Usage & Costs' },
  'nav.settings': { de: 'Einstellungen', en: 'Settings' },
  'nav.logout': { de: 'Abmelden', en: 'Log out' },

  // Auth
  'auth.login.title': { de: 'Anmelden', en: 'Sign In' },
  'auth.login.email': { de: 'E-Mail-Adresse', en: 'Email Address' },
  'auth.login.password': { de: 'Passwort', en: 'Password' },
  'auth.login.submit': { de: 'Anmelden', en: 'Sign In' },
  'auth.login.error': { de: 'Ungültige Anmeldedaten', en: 'Invalid credentials' },
  'auth.invite.title': { de: 'Einladung annehmen', en: 'Accept Invitation' },
  'auth.invite.name': { de: 'Dein Name', en: 'Your Name' },
  'auth.invite.password': { de: 'Passwort wählen', en: 'Choose Password' },
  'auth.invite.submit': { de: 'Account erstellen', en: 'Create Account' },

  // Language Switch
  'lang.welcome': { de: 'Willkommen bei 17solutions.', en: 'Welcome to 17solutions.' },
  'lang.choose': { de: 'Das System arbeitet standardmäßig auf Deutsch. Die Sprache kann jederzeit geändert werden.', en: 'The system defaults to German. Language can be changed at any time.' },
  'lang.de': { de: 'Deutsch', en: 'German' },
  'lang.en': { de: 'English', en: 'English' },

  // Clusters
  'cluster.verstehen': { de: 'VERSTEHEN', en: 'UNDERSTAND' },
  'cluster.validieren': { de: 'VALIDIEREN', en: 'VALIDATE' },
  'cluster.create': { de: 'CREATE', en: 'CREATE' },
  'cluster.bewerten': { de: 'BEWERTEN', en: 'ASSESS' },

  // Modules
  'module.verstehen_01': { de: 'Marken-Einstieg', en: 'Brand Entry' },
  'module.verstehen_01b': { de: 'Dokumenten-Aufnahme', en: 'Document Intake' },
  'module.verstehen_02': { de: 'SDG-Zuordnung', en: 'SDG Mapping' },
  'module.verstehen_03': { de: 'SDG-Auswahl', en: 'SDG Selection' },
  'module.validieren_04': { de: 'Realitäts-Check', en: 'Reality Check' },
  'module.validieren_05': { de: 'Zielgruppen-Research', en: 'Target Research' },
  'module.validieren_06': { de: 'Daten-Research', en: 'Data Research' },
  'module.create_07': { de: 'Sprungbretter', en: 'Springboards' },
  'module.create_08': { de: 'Partnerschaften', en: 'Partnerships' },
  'module.create_09': { de: 'Ideen-Entwicklung', en: 'Idea Development' },
  'module.bewerten_10': { de: 'Business Impact', en: 'Business Impact' },
  'module.bewerten_11': { de: 'ROI-Schätzung', en: 'ROI Estimation' },
  'module.bewerten_12': { de: 'Case Board', en: 'Case Board' },

  // Session
  'session.new': { de: 'Neue Session starten', en: 'Start New Session' },
  'session.brand': { de: 'Markenname', en: 'Brand Name' },
  'session.brandPlaceholder': { de: 'z.B. MANN+HUMMEL, Siemens, Nike...', en: 'e.g. MANN+HUMMEL, Siemens, Nike...' },
  'session.create': { de: 'Session starten', en: 'Start Session' },
  'session.empty': { de: 'Noch keine Sessions. Starte deine erste!', en: 'No sessions yet. Start your first one!' },
  'session.lastEdited': { de: 'Zuletzt bearbeitet', en: 'Last edited' },
  'session.archive': { de: 'Archivieren', en: 'Archive' },

  // Chat
  'chat.placeholder': { de: 'Nachricht eingeben...', en: 'Type your message...' },
  'chat.send': { de: 'Senden', en: 'Send' },
  'chat.continue': { de: 'Weiter', en: 'Continue' },
  'chat.comingSoon': { de: 'Dieses Modul wird bald verfügbar sein.', en: 'This module will be available soon.' },

  // Usage (Admin)
  'usage.title': { de: 'Nutzung & Kosten', en: 'Usage & Costs' },
  'usage.user': { de: 'Nutzer', en: 'User' },
  'usage.sessions': { de: 'Sessions', en: 'Sessions' },
  'usage.tokens': { de: 'Tokens', en: 'Tokens' },
  'usage.cost': { de: 'Kosten', en: 'Cost' },
  'usage.lastActive': { de: 'Letzte Aktivität', en: 'Last Active' },
  'usage.export': { de: 'CSV exportieren', en: 'Export CSV' },
  'usage.total': { de: 'Gesamt', en: 'Total' },

  // General
  'general.loading': { de: 'Laden...', en: 'Loading...' },
  'general.error': { de: 'Ein Fehler ist aufgetreten.', en: 'An error occurred.' },
  'general.save': { de: 'Speichern', en: 'Save' },
  'general.cancel': { de: 'Abbrechen', en: 'Cancel' },
  'general.back': { de: 'Zurück', en: 'Back' },
} as const

export type TranslationKey = keyof typeof translations

export function t(key: TranslationKey, lang: Language = 'de'): string {
  const entry = translations[key]
  if (!entry) return key
  return entry[lang] || entry.de
}

export default translations
