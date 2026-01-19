// Session states
export type SessionState = 'draft' | 'active' | 'completed' | 'archived';

// Theme selection
export type ThemeSelection = 'more' | 'less';

// Presenter profile
export interface Presenter {
  id: string;
  email: string;
  name: string;
  organization: string;
  logoUrl?: string;
  brandGuidelinesUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Session
// Note: welcomeMessage, summaryFull, summaryCondensed are NOT NULL DEFAULT '' in schema
export interface Session {
  id: string;
  presenterId: string;
  state: SessionState;
  lengthMinutes: number;
  title: string;
  welcomeMessage: string;
  summaryFull: string;
  summaryCondensed: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

// Theme
export interface Theme {
  id: string;
  sessionId: string;
  text: string;
  sortOrder: number;
}

// Response
export interface Response {
  id: string;
  sessionId: string;
  participantEmail: string;  // Used for uniqueness
  name?: string;
  followupEmail?: string;    // Optional different email for follow-up
  freeFormText?: string;
  participantToken?: string; // For update verification (not exposed to other participants)
  selections: ThemeSelectionRecord[];
  createdAt: Date;
  updatedAt: Date;
}

// Theme selection record
export interface ThemeSelectionRecord {
  themeId: string;
  selection: ThemeSelection;
}

// Aggregated theme (for results)
export interface AggregatedTheme {
  theme: Theme;
  moreCount: number;
  lessCount: number;
  netInterest: number;
}

// Generated outline
export interface Outline {
  sections: OutlineSection[];
  generatedAt: Date;
}

export interface OutlineSection {
  title: string;
  subPoints: string[];
}

// Spotlight (AI-identified interesting responses)
export interface Spotlight {
  id: string;
  text: string;
  reason: string;
}
