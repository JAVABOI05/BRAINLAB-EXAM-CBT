export type VideoProviderType = "webrtc" | "livekit" | "agora" | "daily";

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
