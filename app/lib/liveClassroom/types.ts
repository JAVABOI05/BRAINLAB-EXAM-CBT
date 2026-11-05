export type VideoProviderType = "webrtc" | "livekit" | "agora" | "daily";

export interface LiveServicesCredentials {
  livekit_url?: string;
  livekit_api_key?: string;
  livekit_api_secret?: string;
  agora_app_id?: string;
  agora_app_certificate?: string;
  daily_api_key?: string;
  daily_domain?: string;
  webrtc_ice_servers?: string;
}

export type ParticipantRole = "host" | "speaker" | "listener";

export interface RoomPermissions {
  canPublishAudio: boolean;
  canPublishVideo: boolean;
  canPublishScreen: boolean;
  canChat: boolean;
  isModerator: boolean;
}

export interface LiveRoomTokenRequest {
  roomId: string;
  roomName: string;
  userId: string;
  userName: string;
  role: ParticipantRole;
  permissions: RoomPermissions;
  durationSeconds?: number;
}

export interface LiveRoomTokenResponse {
  token: string;
  provider: VideoProviderType;
  serverUrl?: string;
  roomName: string;
  expiresAt: string;
  identity: string;
  permissions: RoomPermissions;
  role?: ParticipantRole;
  classDetails?: any;
}

export interface Participant {
  id: string;
  name: string;
  role: ParticipantRole;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  joinedAt: string;
  networkQuality: "excellent" | "good" | "poor" | "reconnecting";
}

export interface ClassroomMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isHost?: boolean;
  type?: "text" | "image" | "audio" | "quiz";
  mediaUrl?: string;
  duration?: number;
  isPinned?: boolean;
}

export interface ClassroomPoll {
  id: string;
  question: string;
  options: { text: string; votes: number }[];
  totalVotes: number;
  isOpen: boolean;
  userVotedIndex?: number;
}

export interface AttendanceRecordPayload {
  classId: string;
  userId: string;
  joinTime: string;
  leaveTime?: string;
  durationSeconds: number;
  status: "present" | "partial" | "absent";
  providerSessionId?: string;
}
