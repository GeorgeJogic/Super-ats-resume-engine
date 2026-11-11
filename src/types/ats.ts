export type WorkflowStep = 'upload' | 'audit' | 'studio';

export type ProblemSeverity =
  | 'CRITICAL BLOCKER'
  | 'MAJOR ISSUE'
  | 'MINOR TWEAK';

export type ProblemFilter =
  | 'All Issues'
  | 'Critical Blockers'
  | 'Formatting Traps'
  | 'Weak Bullets'
  | 'Keyword Gaps';

export type StudioViewMode = 'split' | 'preview';

export type ResumeFontFamily = 'serif' | 'calibri' | 'sans';

export interface FileMetadata {
  detectedCandidateName: string;
  inferredTargetRole: string;
  isAtsFriendly: boolean;
}

export interface CategoryScoreItem {
  id: 'parseability' | 'keywords' | 'impact' | 'structure' | string;
  name: string;
  score: number;
  weight: number;
  status: 'Good to Pass' | 'Needs Fix' | 'Failing' | string;
  feedback: string;
}

export interface AtsProblem {
  id: string;
  severity: ProblemSeverity | string;
  category: string;
  detectedInUploadedCv: string;
  whyNotAtsFriendly: string;
  howToFix: string;
}

export interface AtsAudit {
  overallScore: number;
  passStatus: string;
  executiveSummary: string;
  categories: CategoryScoreItem[];
  problems: AtsProblem[];
  detectedKeywords: string[];
  missingRecommendedKeywords: string[];
}

export interface ContactHeader {
  fullName: string;
  professionalTitle: string;
  location: string;
  email: string;
  phone: string;
  links: string[];
}

export interface TechnicalSkillCluster {
  category: string;
  skills: string[];
}

export interface ExperienceEntry {
  role: string;
  company: string;
  location: string;
  dates: string;
  bullets: string[];
}

export interface ProjectEntry {
  title: string;
  techStack: string;
  dates: string;
  bullets: string[];
}

export interface EducationEntry {
  degree: string;
  institution: string;
  dates: string;
  details: string;
}

export interface SuperAtsResume {
  newAtsScore: number;
  fixesApplied: string[];
  contactHeader: ContactHeader;
  professionalSummary: string;
  technicalSkills: TechnicalSkillCluster[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  education: EducationEntry[];
  certifications: string[];
}

export interface AtsAnalysisResponse {
  fileMetadata: FileMetadata;
  audit: AtsAudit;
  superAtsResume: SuperAtsResume;
}

export interface BracketedPlaceholderItem {
  id: string;
  token: string;
  innerLabel: string;
  sectionLabel: string;
  contextSnippet: string;
}
