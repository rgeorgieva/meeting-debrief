// Shared TypeScript types matching the n8n API contracts.

export type User = {
  id: string;
  email: string;
};

export type AuthResponse = {
  sessionToken: string;
  expiresAt: string;
  user: User;
};

export type ActionItem = {
  id: string;
  text: string;
  owner: string | null;
  isDone: boolean;
  completedAt: string | null;
  position: number;
  createdAt?: string;
};

export type Meeting = {
  id: string;
  title: string;
  meetingDate: string | null;
  summary: string;
  transcript: string;
  participants: string[];
  decisions: string[];
  blockers: string[];
  followupEmail: string;
  createdAt: string;
  actionItems: ActionItem[];
};

export type MeetingListItem = {
  id: string;
  title: string;
  meetingDate: string | null;
  summaryPreview: string;
  openActionItemsCount: number;
  createdAt: string;
};

export type MeetingsListResponse = {
  meetings: MeetingListItem[];
  total: number;
};

export type DebriefDraft = {
  title: string;
  meetingDate: string | null;
  summary: string;
  participants: string[];
  decisions: string[];
  actionItems: { text: string; owner: string | null }[];
  blockers: string[];
  followupEmail: string;
};

export type DebriefResponse =
  | { isValidMeeting: true; draft: DebriefDraft }
  | { isValidMeeting: false; message: string };

export type OpenActionItem = {
  id: string;
  text: string;
  owner: string | null;
  createdAt: string;
  meeting: {
    id: string;
    title: string;
    meetingDate: string | null;
  };
};

export type ApiError = {
  error: string;
  message: string;
};
