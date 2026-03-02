export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  contentPanelData?: ContentPanelData;
}

export interface ContentPanelData {
  type: 'tutorial' | 'analytics' | 'help' | 'guide';
  title: string;
  content: string;
  actions?: ContentAction[];
}

export interface ContentAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  prompt: string;
}

export interface ChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  contentPanel: ContentPanelData | null;
}
