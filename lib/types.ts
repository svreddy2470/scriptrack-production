
export interface User {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: UserRole
  status: UserStatus
  photoUrl: string | null
  imdbProfile: string | null
  isProfileComplete: boolean
  createdAt: Date
  updatedAt: Date
}

export type UserRole = 'ADMIN' | 'EXECUTIVE' | 'PRODUCER' | 'READER'
export type UserStatus = 'ACTIVE' | 'INACTIVE'

// Script related types
export type ScriptType = 'FEATURE_FILM' | 'WEB_SERIES'
export type DevelopmentStatus = 'SHOOTING_SCRIPT' | 'FIRST_DRAFT' | 'TREATMENT' | 'ONE_LINE_ORDER' | 'PITCH_DECK'
export type ScriptStatus = 'SUBMITTED' | 'READING' | 'CONSIDERED' | 'DEVELOPMENT' | 'GREENLIT' | 'IN_PRODUCTION' | 'ON_HOLD' | 'REJECTED'
export type BudgetRange = 'INDIE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
export type ScriptFileType = 'SCREENPLAY' | 'PITCHDECK' | 'TREATMENT' | 'ONELINE_ORDER' | 'STORYBOARD' | 'TEAM_PROFILE'

// Assignment related types
export type AssignmentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
export type AssignmentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

// Feedback related types
export type FeedbackCategory = 'GENERAL' | 'SCRIPT_QUALITY' | 'MARKETABILITY' | 'PRODUCTION_NOTES' | 'DEVELOPMENT_SUGGESTIONS'

// Activity related types
export type ActivityType = 'SCRIPT_SUBMITTED' | 'STATUS_CHANGED' | 'ASSIGNMENT_CREATED' | 'ASSIGNMENT_COMPLETED' | 'FEEDBACK_ADDED' | 'FILE_UPLOADED' | 'SCRIPT_FEATURED' | 'SCRIPT_EDITED' | 'PASSWORD_RESET' | 'MEETING_SCHEDULED' | 'MEETING_UPDATED' | 'MEETING_CANCELLED' | 'MEETING_COMPLETED'

// Meeting related types
export type MeetingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type ParticipantStatus = 'INVITED' | 'CONFIRMED' | 'DECLINED' | 'ATTENDED' | 'MISSED'
export type ParticipantResponse = 'ACCEPTED' | 'DECLINED' | 'TENTATIVE'

export interface Script {
  id: string
  title: string
  writers: string
  phone: string
  email: string
  type: ScriptType
  developmentStatus: DevelopmentStatus
  logline: string
  synopsis: string
  director?: string | null
  budgetRange?: BudgetRange | null
  genre?: string | null
  subGenre?: string | null
  coverImageUrl?: string | null
  status: ScriptStatus
  submittedBy: string
  user?: Partial<User>
  notes?: string | null
  isFeatured: boolean
  readingProgress: number
  files?: ScriptFile[]
  createdAt: Date
  updatedAt: Date
}

export interface ScriptFile {
  id: string
  scriptId: string
  fileType: ScriptFileType
  fileName: string
  fileUrl: string
  fileSize: number
  version: number
  isLatest: boolean
  uploadedBy: string
  uploader?: Partial<User>
  script?: Script
  createdAt: Date
  updatedAt: Date
}

export interface Assignment {
  id: string
  scriptId: string
  assignedTo: string
  assignedBy: string
  dueDate?: Date | null
  notes?: string | null
  status: AssignmentStatus
  priority: AssignmentPriority
  createdAt: Date
  updatedAt: Date
  script?: Script
  assignee?: Partial<User>
  assigner?: Partial<User>
  feedback?: Feedback[]
}

export interface Feedback {
  id: string
  scriptId: string
  assignmentId?: string | null
  userId: string
  rating?: number | null
  comments: string
  category: FeedbackCategory
  isPrivate: boolean
  createdAt: Date
  updatedAt: Date
  script?: Script
  assignment?: Assignment
  user?: Partial<User>
}

export interface Activity {
  id: string
  scriptId: string
  userId: string
  type: ActivityType
  title: string
  description?: string | null
  metadata?: any
  createdAt: Date
  script?: Script
  user?: Partial<User>
}

export interface Meeting {
  id: string
  scriptId: string
  title: string
  description?: string | null
  scheduledAt: Date | string
  scheduledBy: string
  status: MeetingStatus
  meetingLink?: string | null
  location?: string | null
  duration?: number | null
  createdAt: Date | string
  updatedAt: Date | string
  script?: Partial<Script>
  organizer?: Partial<User>
  participants?: MeetingParticipant[]
}

export interface MeetingParticipant {
  id: string
  meetingId: string
  userId: string
  status: ParticipantStatus
  response?: ParticipantResponse | null
  createdAt: Date | string
  updatedAt: Date | string
  meeting?: Meeting
  user?: Partial<User>
}

export interface ScriptSubmissionData {
  title: string
  writers: string
  phone: string
  email: string
  type: ScriptType
  developmentStatus: DevelopmentStatus
  logline: string
  synopsis: string
  director?: string
  budgetRange?: BudgetRange
  genre?: string
  subGenre?: string
  files?: ScriptFileUpload[]
}

export interface ScriptFileUpload {
  fileType: ScriptFileType
  fileName: string
  fileUrl: string
  fileSize: number
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      phone?: string | null
      role?: UserRole
      photoUrl?: string | null
      imdbProfile?: string | null
      isProfileComplete?: boolean
      createdAt?: string
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    phone?: string | null
    role?: UserRole
    photoUrl?: string | null
    imdbProfile?: string | null
    isProfileComplete?: boolean
    createdAt?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole
    phone?: string | null
    photoUrl?: string | null
    imdbProfile?: string | null
    isProfileComplete?: boolean
    createdAt?: string
  }
}
