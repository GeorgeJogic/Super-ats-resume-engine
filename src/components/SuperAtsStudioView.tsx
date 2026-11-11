import React, { useMemo, useState } from 'react';
import {
  FileText,
  Download,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  Edit3,
  Eye,
  Columns,
  CheckCircle2,
  Plus
} from 'lucide-react';
import type {
  AtsAudit,
  ResumeFontFamily,
  StudioViewMode,
  SuperAtsResume
} from '../types/ats';
import {
  extractBracketedPlaceholders,
  getScoreTier,
  replacePlaceholderInResume,
  resumeToPlainText
} from '../utils/atsEngine';
import {
  downloadSuperAtsDocx,
  downloadSuperAtsPdf
} from '../utils/documentExporter';

interface SuperAtsStudioViewProps {
  uploadedFileName: string;
  rawCvText: string;
  audit: AtsAudit;
  resume: SuperAtsResume;
  onUpdateResume: (next: SuperAtsResume) => void;
  onInjectKeyword: (keyword: string) => void;
  onRescanGeneratedResume: () => void;
}

const POWER_VERBS_REGEX =
  /\b(Architected|Spearheaded|Engineered|Optimized|Refactored|Automated|Built|Partnered|Designed|Scaled|Accelerated|Reduced|Increased|Delivered|Developed|Implemented|Led)\b/g;

export const SuperAtsStudioView: React.FC<SuperAtsStudioViewProps> = ({
  uploadedFileName,
  rawCvText,
  audit,
  resume,
  onUpdateResume,
  onInjectKeyword,
  onRescanGeneratedResume
}) => {
  const [viewMode, setViewMode] = useState<StudioViewMode>('preview');
  const [highlightImprovements, setHighlightImprovements] =
    useState<boolean>(true);
  const [fontFamily, setFontFamily] = useState<ResumeFontFamily>('calibri');
  const [copiedCleanText, setCopiedCleanText] = useState<boolean>(false);
  const [isExportingDocx, setIsExportingDocx] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [exportToast, setExportToast] = useState<string | null>(null);
  const [activePlaceholderToken, setActivePlaceholderToken] = useState<
    string | null
  >(null);
  const [placeholderInputVal, setPlaceholderInputVal] = useState<string>('');
  const [isEditingHeader, setIsEditingHeader] = useState<boolean>(false);

  const beforeTier = getScoreTier(audit.overallScore);

  const placeholders = useMemo(
    () => extractBracketedPlaceholders(resume),
    [resume]
  );

  const handleHeaderFieldChange = (
    field: 'fullName' | 'professionalTitle' | 'location' | 'phone' | 'email',
    value: string
  ) => {
    onUpdateResume({
      ...resume,
      contactHeader: {
        ...resume.contactHeader,
        [field]: value
      }
    });
  };

  const handleApplyPlaceholderValue = (token: string, val: string) => {
    if (!val.trim()) return;
    const updated = replacePlaceholderInResume(resume, token, val);
    onUpdateResume(updated);
    setActivePlaceholderToken(null);
    setPlaceholderInputVal('');
  };

  const handleDownloadDocxClick = async () => {
    setIsExportingDocx(true);
    try {
      await downloadSuperAtsDocx(resume);
      setExportToast('Downloaded formatted Word Document (.docx)');
      setTimeout(() => setExportToast(null), 3000);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleDownloadPdfClick = () => {
    setIsExportingPdf(true);
    try {
      downloadSuperAtsPdf(resume);
      setExportToast('Downloaded ATS-Safe PDF Document (.pdf)');
      setTimeout(() => setExportToast(null), 3000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleCopyCleanText = async () => {
    const txt = resumeToPlainText(resume);
    try {
      await navigator.clipboard.writeText(txt);
    } catch {
      const el = document.createElement('textarea');
      el.value = txt;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedCleanText(true);
    setTimeout(() => setCopiedCleanText(false), 2000);
  };

  const renderHighlightedText = (text: string) => {
    if (!highlightImprovements) return text;

    const parts = (text || '').split(/(\[[^\[\]]+\])/g);
    return parts.map((part, idx) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        return (
          <button
            key={`${part}-${idx}`}
            type="button"
            onClick={() => {
              setActivePlaceholderToken(part);
              setPlaceholderInputVal(part.slice(1, -1));
            }}
            title="Click to replace this bracketed metric placeholder with your real number"
            className="ats-upgrade-highlight inline-block px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 font-semibold border border-emerald-300 hover:bg-emerald-200 transition-colors cursor-pointer"
          >
            {part}
          </button>
        );
      }

      const subParts = part.split(POWER_VERBS_REGEX);
      return subParts.map((sub, subIdx) => {
        if (POWER_VERBS_REGEX.test(sub)) {
          POWER_VERBS_REGEX.lastIndex = 0;
          return (
            <span
              key={`${idx}-${subIdx}`}
              className="ats-upgrade-highlight bg-emerald-50 text-emerald-900 font-semibold px-1 rounded"
            >
              {sub}
            </span>
          );
        }
        return <React.Fragment key={`${idx}-${subIdx}`}>{sub}</React.Fragment>;
      });
    });
  };

  const paperFontStyle: React.CSSProperties =
    fontFamily === 'calibri'
      ? { fontFamily: 'Calibri, Carlito, Arial, sans-serif' }
      : fontFamily === 'serif'
        ? { fontFamily: '"Times New Roman", Times, Georgia, serif' }
        : { fontFamily: '"Plus Jakarta Sans", Arial, sans-serif' };

  const fixesAppliedList = resume.fixesApplied || [];
  const missingKeywordsList = audit.missingRecommendedKeywords || [];
  const detectedKeywordsList = audit.detectedKeywords || [];
  const technicalSkillsList = resume.technicalSkills || [];
  const experienceList = resume.experience || [];
  const projectsList = resume.projects || [];
  const educationList = resume.education || [];
  const certificationsList = resume.certifications || [];

  return (
    <section className="max-w-[1400px] mx-auto px-6 py-8">
      {/* Instant Document Preview & Auto-Download Top Banner */}
      <div className="no-print bg-slate-900/85 border border-white/[0.08] rounded-xl p-5 mb-6 space-y-4">
        {/* Row 1: Verified Score Upgrade Banner + Primary DOCX / PDF / Re-Scan Buttons */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-mono tabular-nums">
              <span className={beforeTier.textClass}>
                Original Score: {audit.overallScore}%
              </span>
              <span className="text-slate-500" aria-hidden="true">
                ➔
              </span>
              <span className="text-emerald-400 font-extrabold">
                New Verified Super-ATS Score: {resume.newAtsScore}% (ATS Pass
                Guaranteed)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Compiled for{' '}
              <span className="text-slate-200 font-medium">
                {resume.contactHeader?.fullName || 'Candidate'}
              </span>{' '}
              · Single-column 1-Page Letter/A4 layout · Zero tables or graphics
            </p>
          </div>

          {/* Primary, Secondary, and Tertiary Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={isExportingDocx}
              onClick={handleDownloadDocxClick}
              className="px-4 py-2.5 text-xs font-extrabold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-lg shadow-emerald-500/15"
            >
              <FileText className="w-4 h-4" />
              <span>
                {isExportingDocx
                  ? 'Building .DOCX...'
                  : 'Download Super-ATS Resume (.DOCX)'}
              </span>
            </button>

            <button
              type="button"
              disabled={isExportingPdf}
              onClick={handleDownloadPdfClick}
              className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-lg shadow-indigo-500/15"
            >
              <Download className="w-4 h-4" />
              <span>
                {isExportingPdf
                  ? 'Building .PDF...'
                  : 'Download Super-ATS Resume (.PDF)'}
              </span>
            </button>

            <button
              type="button"
              onClick={onRescanGeneratedResume}
              className="px-3.5 py-2.5 text-xs font-semibold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-scan Generated Resume to Verify 95%+ Score</span>
            </button>
          </div>
        </div>

        {/* Row 2: View Switcher, Highlight Toggle, Edit Header Toggle, Font Selector & Copy Clean Text */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* View Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 border border-white/[0.08] rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'preview'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Full A4 Resume Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'split'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Side-by-Side Comparison (Uploaded vs. Super-ATS)</span>
              </button>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={highlightImprovements}
              onClick={() => setHighlightImprovements((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                highlightImprovements
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-950 border-white/[0.08] text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                Highlight AI Improvements: {highlightImprovements ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditingHeader((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                isEditingHeader
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                  : 'bg-slate-950 border-white/[0.08] text-slate-300 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingHeader ? 'Done Editing Header' : 'Edit Contact Header'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Font Selector */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 border border-white/[0.08] rounded-lg">
              {(
                [
                  { id: 'calibri', label: 'Calibri (ATS Standard)' },
                  { id: 'sans', label: 'Arial / Sans' },
                  { id: 'serif', label: 'Times New Roman' }
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFontFamily(f.id)}
                  className={`px-2.5 py-1 text-xs rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    fontFamily === f.id
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleCopyCleanText}
              className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-950 hover:bg-slate-800 border border-white/[0.1] rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedCleanText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied Clean Text</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Clean Text</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Inline Editable Header Panel */}
        {isEditingHeader && (
          <div className="pt-3 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Candidate Full Name
              </label>
              <input
                type="text"
                value={resume.contactHeader.fullName}
                onChange={(e) =>
                  handleHeaderFieldChange('fullName', e.target.value)
                }
                aria-label="Candidate Full Name"
                className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-white/[0.12] text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Target Role Title
              </label>
              <input
                type="text"
                value={resume.contactHeader.professionalTitle}
                onChange={(e) =>
                  handleHeaderFieldChange('professionalTitle', e.target.value)
                }
                aria-label="Target Role Title"
                className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-white/[0.12] text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Location
              </label>
              <input
                type="text"
                value={resume.contactHeader.location}
                onChange={(e) =>
                  handleHeaderFieldChange('location', e.target.value)
                }
                aria-label="Candidate Location"
                className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-white/[0.12] text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={resume.contactHeader.email}
                onChange={(e) =>
                  handleHeaderFieldChange('email', e.target.value)
                }
                aria-label="Candidate Email"
                className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-white/[0.12] text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={resume.contactHeader.phone}
                onChange={(e) =>
                  handleHeaderFieldChange('phone', e.target.value)
                }
                aria-label="Candidate Phone"
                className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-white/[0.12] text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {exportToast && (
          <div
            role="status"
            className="px-3.5 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportToast}</span>
          </div>
        )}
      </div>

      {/* Main Studio Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel (4 cols): What Was Fixed & Interactive Metric Editor */}
        <aside className="no-print lg:col-span-4 bg-slate-900/75 border border-white/[0.08] rounded-xl p-5 space-y-6">
          {/* 1. Checklist of Problems Resolved */}
          <div>
            <div className="pb-3 mb-3 border-b border-white/[0.06]">
              <h2 className="text-sm font-bold text-white font-display">
                What Was Fixed Automatically
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Upgrades applied to {uploadedFileName}:
              </p>
            </div>
            <ul className="space-y-2">
              {fixesAppliedList.map((fix, idx) => (
                <li
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-950/75 border border-white/[0.06] text-xs text-slate-200 leading-relaxed flex items-start gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{fix}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 2. Quick Metric Fill-In (Interactive Metric Editor) */}
          <div className="pt-4 border-t border-white/[0.06]">
            <div className="mb-3">
              <h2 className="text-sm font-bold text-white font-display">
                Quick Metric Fill-In ({placeholders.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Click any `[X%]` placeholder below to type your real number and
                watch your Super-ATS document update live before downloading:
              </p>
            </div>

            {placeholders.length === 0 ? (
              <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                All bracketed metric placeholders have been customized with your
                exact numbers!
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {placeholders.map((ph) => {
                  const isEditing = activePlaceholderToken === ph.token;
                  return (
                    <div
                      key={ph.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        isEditing
                          ? 'bg-slate-950 border-emerald-500/50'
                          : 'bg-slate-950/70 border-white/[0.08] hover:border-white/[0.16]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {ph.token}
                        </span>
                        <span className="text-[11px] text-slate-500 truncate max-w-[155px]">
                          {ph.sectionLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                        {ph.contextSnippet}
                      </p>

                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={placeholderInputVal}
                            onChange={(e) =>
                              setPlaceholderInputVal(e.target.value)
                            }
                            aria-label={`Replace metric ${ph.token}`}
                            placeholder="Enter real number (e.g. 42%)"
                            className="flex-1 px-2.5 py-1.5 rounded bg-slate-900 border border-emerald-500/40 text-xs text-white font-mono focus:outline-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleApplyPlaceholderValue(
                                  ph.token,
                                  placeholderInputVal
                                );
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleApplyPlaceholderValue(
                                ph.token,
                                placeholderInputVal
                              )
                            }
                            className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs whitespace-nowrap cursor-pointer"
                          >
                            Apply
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setActivePlaceholderToken(ph.token);
                            setPlaceholderInputVal(ph.innerLabel);
                          }}
                          className="text-xs font-medium text-emerald-300 hover:text-emerald-200 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Fill In Real Metric</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Optional Missing Recommended Keywords Quick-Add */}
          {missingKeywordsList.length > 0 && (
            <div className="pt-4 border-t border-white/[0.06]">
              <p className="text-xs font-semibold text-slate-300 mb-2">
                Add Recommended Domain Keywords ({missingKeywordsList.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missingKeywordsList.map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => onInjectKeyword(kw)}
                    className="px-2 py-1 text-[11px] font-mono bg-rose-500/10 hover:bg-emerald-500/20 border border-rose-500/30 hover:border-emerald-500/40 text-rose-300 hover:text-emerald-200 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{kw}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Right Panel (8 cols): Side-by-Side Comparison or Full A4 Resume Preview */}
        <div className="lg:col-span-8">
          {viewMode === 'split' && (
            <div className="no-print mb-6 bg-slate-900/75 border border-white/[0.08] rounded-xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-white/[0.06]">
                <div>
                  <h2 className="text-sm font-bold text-rose-300 font-display">
                    UPLOADED CV ({uploadedFileName} — {audit.overallScore}% Score)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Original extracted text containing{' '}
                    {(audit.problems || []).length} ATS parsing & ranking flaws
                  </p>
                </div>
                <span className="text-xs font-mono text-emerald-400">
                  Rebuilt Single-Column Super-ATS Sheet below ↓
                </span>
              </div>
              <pre className="max-h-52 overflow-y-auto p-4 rounded-lg bg-slate-950 border border-rose-500/20 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                {rawCvText}
              </pre>
            </div>
          )}

          {/* Live Single-Column Super-ATS Resume Sheet */}
          <div
            id="super-ats-resume-sheet"
            style={paperFontStyle}
            className="print-only-sheet bg-white text-slate-950 rounded-sm shadow-2xl border border-slate-200 p-8 sm:p-11 max-w-[850px] mx-auto"
          >
            {/* 18pt Bold Candidate Name Centered at Top + Single Centered Contact Line */}
            <header className="border-b-2 border-slate-900 pb-3 mb-4 text-center">
              <h1 className="text-2xl sm:text-[24px] font-bold tracking-tight text-slate-950 uppercase">
                {resume.contactHeader?.fullName}
              </h1>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {resume.contactHeader?.professionalTitle}
              </p>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                {[
                  resume.contactHeader?.location,
                  resume.contactHeader?.phone,
                  resume.contactHeader?.email,
                  ...(resume.contactHeader?.links || [])
                ]
                  .filter(Boolean)
                  .join('  |  ')}
              </p>
            </header>

            {/* 1. PROFESSIONAL SUMMARY */}
            <section className="mb-4">
              <h2 className="text-[12px] font-bold tracking-wider uppercase text-slate-950 border-b border-slate-400 pb-1 mb-2">
                PROFESSIONAL SUMMARY
              </h2>
              <p className="text-[13.5px] text-slate-900 leading-[1.45]">
                {renderHighlightedText(resume.professionalSummary)}
              </p>
            </section>

            {/* 2. TECHNICAL SKILLS */}
            <section className="mb-4">
              <h2 className="text-[12px] font-bold tracking-wider uppercase text-slate-950 border-b border-slate-400 pb-1 mb-2">
                TECHNICAL SKILLS
              </h2>
              <div className="space-y-1 text-[13.5px] text-slate-900 leading-[1.4]">
                {technicalSkillsList.map((group, idx) => (
                  <div key={idx}>
                    <span className="font-bold text-slate-950">
                      {group.category}:{' '}
                    </span>
                    <span>
                      {(group.skills || []).map((skill, i) => (
                        <React.Fragment key={skill}>
                          {i > 0 && ', '}
                          <span
                            className={
                              highlightImprovements &&
                              detectedKeywordsList.includes(skill)
                                ? 'ats-upgrade-highlight bg-emerald-50 text-emerald-950 px-1 rounded'
                                : ''
                            }
                          >
                            {skill}
                          </span>
                        </React.Fragment>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* 3. PROFESSIONAL EXPERIENCE */}
            <section className="mb-4">
              <h2 className="text-[12px] font-bold tracking-wider uppercase text-slate-950 border-b border-slate-400 pb-1 mb-2.5">
                PROFESSIONAL EXPERIENCE
              </h2>
              <div className="space-y-3.5">
                {experienceList.map((exp, idx) => (
                  <div key={idx}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <span className="text-[14px] font-bold text-slate-950">
                          {exp.role}
                        </span>
                        <span className="text-[13.5px] font-semibold text-slate-800">
                          {exp.company ? ` — ${exp.company}` : ''}
                          {exp.location ? ` (${exp.location})` : ''}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-800 tabular-nums shrink-0">
                        {exp.dates}
                      </span>
                    </div>
                    <ul className="mt-1.5 space-y-1 pl-4 list-disc text-[13.5px] text-slate-900 leading-[1.42]">
                      {(exp.bullets || []).slice(0, 3).map((bullet, bIdx) => (
                        <li key={bIdx}>{renderHighlightedText(bullet)}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* 4. PROJECTS */}
            {projectsList.length > 0 && (
              <section className="mb-4">
                <h2 className="text-[12px] font-bold tracking-wider uppercase text-slate-950 border-b border-slate-400 pb-1 mb-2">
                  PROJECTS
                </h2>
                <div className="space-y-2.5">
                  {projectsList.slice(0, 2).map((proj, idx) => (
                    <div key={idx}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                          <span className="text-[14px] font-bold text-slate-950">
                            {proj.title}
                          </span>
                          {proj.techStack && (
                            <span className="text-xs text-slate-700">
                              {' '}
                              | {proj.techStack}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-800 tabular-nums shrink-0">
                          {proj.dates}
                        </span>
                      </div>
                      <ul className="mt-1 space-y-1 pl-4 list-disc text-[13.5px] text-slate-900 leading-[1.42]">
                        {(proj.bullets || []).slice(0, 2).map((b, bIdx) => (
                          <li key={bIdx}>{renderHighlightedText(b)}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 5. EDUCATION */}
            <section className="mb-4">
              <h2 className="text-[12px] font-bold tracking-wider uppercase text-slate-950 border-b border-slate-400 pb-1 mb-2">
                EDUCATION
              </h2>
              <div className="space-y-2">
                {educationList.map((edu, idx) => (
                  <div key={idx}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <span className="text-[14px] font-bold text-slate-950">
                          {edu.degree}
                        </span>
                        <span className="text-[13.5px] text-slate-800">
                          {edu.institution ? ` — ${edu.institution}` : ''}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-800 tabular-nums shrink-0">
                        {edu.dates}
                      </span>
                    </div>
                    {edu.details && (
                      <p className="text-xs text-slate-700 mt-0.5">
                        {edu.details}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* 6. CERTIFICATIONS & ACHIEVEMENTS */}
            {certificationsList.length > 0 && (
              <section>
                <h2 className="text-[12px] font-bold tracking-wider uppercase text-slate-950 border-b border-slate-400 pb-1 mb-1.5">
                  CERTIFICATIONS & ACHIEVEMENTS
                </h2>
                <p className="text-[13.5px] text-slate-900">
                  {certificationsList.join('  •  ')}
                </p>
              </section>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
