export type ContentType =
  | "rich_text"
  | "audio"
  | "video"
  | "in_class_mcq"
  | "external_link"
  | "document"
  | "image"
  | "interactive_diagram";

export interface RichTextData {
  markdown: string;
  html?: string;
  reading_time_mins?: number;
  key_takeaways?: string[];
  definitions?: Array<{ term: string; meaning: string }>;
}

export interface AudioData {
  url: string;
  duration_seconds?: number;
  transcript?: string;
  speaker?: string;
  notes?: string;
  file_name?: string;
}

export interface VideoData {
  url: string;
  provider: "direct" | "youtube" | "vimeo" | "mux";
  duration_seconds?: number;
  captions?: string;
  thumbnail_url?: string;
}

export interface MCQOption {
  id: string; // "A" | "B" | "C" | "D"
  text: string;
}

export interface MCQQuestion {
  id: string;
  question: string;
  options: MCQOption[];
  correct_option_id: string;
  explanation?: string;
  distractor_explanations?: Record<string, string>;
  marks?: number;
}

export interface InClassMCQData {
  instructions?: string;
  pass_percentage?: number;
  time_limit_seconds?: number;
  questions: MCQQuestion[];
}

export interface ExternalLinkData {
  url: string;
  category?: string;
  description?: string;
  open_in_new_tab?: boolean;
}

export interface DocumentData {
  url: string;
  file_name?: string;
  file_size_bytes?: number;
  mime_type?: string;
  instructions?: string;
  download_allowed?: boolean;
}

export interface ImageData {
  url: string;
  alt_text: string;
  caption?: string;
  attribution?: string;
  width?: number;
  height?: number;
}

export interface TopicContentItem {
  id: string;
  topic_id: string;
  content_type: ContentType;
  title: string;
  summary?: string | null;
  order_index: number;
  is_published: boolean;
  metadata: Record<string, unknown>;
  data: Record<string, unknown>;
  ai_metadata?: {
    generated_by_ai?: boolean;
    source_content_id?: string;
    transformation_type?: string;
    quality_score?: number;
    review_status?: "unreviewed" | "reviewed" | "flagged";
  };
  version: number;
  created_at: string;
  updated_at: string;
}

export interface ContentTypeDescriptor {
  type: ContentType;
  label: string;
  icon: string;
  description: string;
  badgeColor: string;
  defaultTitle: string;
  defaultData: Record<string, unknown>;
}

export const CONTENT_TYPE_REGISTRY: Record<ContentType, ContentTypeDescriptor> = {
  rich_text: {
    type: "rich_text",
    label: "Study Note / Article",
    icon: "📄",
    description: "Structured educational note with headings, definitions, callouts, tables, and KaTeX equations.",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    defaultTitle: "Introduction Note",
    defaultData: {
      markdown: "# Overview\n\nWrite your lesson note here. Use formatting to structure key ideas.\n\n> **Key Takeaway**: Highlight essential exam points.",
      reading_time_mins: 5,
      key_takeaways: [],
      definitions: [],
    },
  },
  audio: {
    type: "audio",
    label: "Audio Lesson / Voice Note",
    icon: "🎙️",
    description: "Spoken lecture or audio summary with playback controls, transcript, and speaker attribution.",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    defaultTitle: "Audio Explanation",
    defaultData: {
      url: "",
      speaker: "BrainLab Tutor",
      transcript: "",
      notes: "",
    },
  },
  video: {
    type: "video",
    label: "Video Lesson",
    icon: "🎬",
    description: "Short concept video or hosted lecture (YouTube, Vimeo, or direct MP4 stream).",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    defaultTitle: "Explanatory Video",
    defaultData: {
      url: "",
      provider: "youtube",
      captions: "",
    },
  },
  in_class_mcq: {
    type: "in_class_mcq",
    label: "In-Class MCQ Checkpoint",
    icon: "⚡",
    description: "Interactive formative quiz with instant grading, explanations, and distractor feedback.",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    defaultTitle: "Quick Checkpoint Assessment",
    defaultData: {
      instructions: "Answer the following questions to test your comprehension.",
      pass_percentage: 70,
      questions: [
        {
          id: "q1",
          question: "Which of the following best describes the core concept?",
          options: [
            { id: "A", text: "First possible option" },
            { id: "B", text: "Second possible option" },
            { id: "C", text: "Third possible option" },
            { id: "D", text: "Fourth possible option" },
          ],
          correct_option_id: "A",
          explanation: "Option A is correct because it directly addresses the definition.",
          distractor_explanations: {
            B: "Option B is incorrect because...",
            C: "Option C confuses the terminology with...",
            D: "Option D applies to a different condition.",
          },
        },
      ],
    },
  },
  external_link: {
    type: "external_link",
    label: "External Learning Resource",
    icon: "🔗",
    description: "Verified external destination, research paper, academic website, or virtual lab.",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    defaultTitle: "Recommended Reading",
    defaultData: {
      url: "",
      category: "Supplementary Reading",
      description: "External educational reference to deepen understanding.",
      open_in_new_tab: true,
    },
  },
  document: {
    type: "document",
    label: "PDF / Downloadable Resource",
    icon: "📎",
    description: "Course syllabus, past question PDF, formula sheet, or printable study guide.",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
    defaultTitle: "Topic Summary Sheet (PDF)",
    defaultData: {
      url: "",
      file_name: "summary.pdf",
      instructions: "Download this document for offline revision.",
      download_allowed: true,
    },
  },
  image: {
    type: "image",
    label: "Diagram / Illustration",
    icon: "🖼️",
    description: "Annotated educational diagram, formula chart, or biological illustration with alt text.",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    defaultTitle: "Annotated Concept Diagram",
    defaultData: {
      url: "",
      alt_text: "Visual diagram illustrating topic concepts",
      caption: "",
      attribution: "",
    },
  },
  interactive_diagram: {
    type: "interactive_diagram",
    label: "Interactive Diagram",
    icon: "📊",
    description: "Mermaid or interactive schema for workflows, cycles, and architectures.",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    defaultTitle: "Process Flow Diagram",
    defaultData: {
      diagram_code: "graph TD\n  A[Start] --> B[Process]\n  B --> C[Result]",
    },
  },
};
