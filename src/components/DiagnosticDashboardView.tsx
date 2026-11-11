import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Search,
  Sparkles,
  Plus,
  ArrowRight,
  SlidersHorizontal
} from 'lucide-react';
import type {
  AtsAudit,
  FileMetadata,
  ProblemFilter
} from '../types/ats';
import {
  filterProblems,
  getCategoryBadge,
  getScoreTier
} from '../utils/atsEngine';

interface DiagnosticDashboardViewProps {
  fileMetadata: FileMetadata;
  uploadedFileName: string;
  audit: AtsAudit;
  newAtsScore: number;
  onConvertToSuperAts: () => void;
  onInjectKeyword: (keyword: string) => void;
  onReupload: () => void;
}

const PROBLEM_FILTER_TABS: ProblemFilter[] = [
  'All Issues',
  'Critical Blockers',
  'Formatting Traps',
  'Weak Bullets',
  'Keyword Gaps'
];

export const DiagnosticDashboardView: React.FC<
  DiagnosticDashboardViewProps
> = ({
  fileMetadata,
  uploadedFileName,
  audit,
  newAtsScore,
  onConvertToSuperAts,
  onInjectKeyword,
  onReupload
}) => {
  const [selectedFilter, setSelectedFilter] =
    useState<ProblemFilter>('All Issues');
  const [searchQuery, setSearchQuery] = useState('');

  const scoreTier = getScoreTier(audit.overallScore);
  const filteredProblems = filterProblems(
    audit.problems,
    selectedFilter,
    searchQuery
  );

  // SVG Circular Gauge math
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, audit.overallScore));
  const strokeDashoffset =
    circumference - (clampedScore / 100) * circumference;

  const criticalCount = audit.problems.filter((p) =>
    p.severity.toUpperCase().includes('CRITICAL')
  ).length;
  const majorCount = audit.problems.filter((p) =>
    p.severity.toUpperCase().includes('MAJOR')
  ).length;

  return (
    <section className="max-w-[1400px] mx-auto px-6 py-8 pb-28">
      {/* Top Contextual Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400 mb-1">
            <span className="text-emerald-400">
              Tool 1 · ATS Diagnostic & Scoring Engine
            </span>
            <span aria-hidden="true">·</span>
            <span>File: {uploadedFileName}</span>
            <span aria-hidden="true">·</span>
            <span>Candidate: {fileMetadata.detectedCandidateName}</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-200">
              Inferred Role: {fileMetadata.inferredTargetRole}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
            ATS Diagnostic & Scoring Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onReupload}
            className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-white/[0.08] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Re-upload CV File
          </button>
          <button
            type="button"
            onClick={onConvertToSuperAts}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Open Super-ATS Rebuilder ({newAtsScore}%)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bento Row 1: Overall ATS Score Hero Card (5 cols) + Category Score Breakdown Grid (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 items-stretch">
        {/* 1. Overall ATS Score Hero Card */}
        <div className="lg:col-span-5 bg-slate-900/75 border border-white/[0.08] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-6">
              <span className="text-xs font-mono text-slate-400">
                OVERALL ATS SCORE (OUT OF 100%)
              </span>
              <span className={`text-xs font-semibold ${scoreTier.textClass}`}>
                {scoreTier.label}
              </span>
            </div>

            {/* Circular Gauge + Verdict Split */}
            <div className="flex flex-col sm:flex-row items-center gap-6 my-2">
              <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
                <svg
                  className="w-40 h-40 -rotate-90"
                  viewBox="0 0 160 160"
                  role="img"
                  aria-label={`Overall ATS Score ${clampedScore} percent`}
                >
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="transparent"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="12"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="transparent"
                    stroke={scoreTier.colorHex}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-4xl font-extrabold text-white font-display tabular-nums">
                    {clampedScore}%
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 mt-0.5">
                    {fileMetadata.isAtsFriendly ? 'ATS PASS' : 'NOT ATS FRIENDLY'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs text-slate-400 font-mono">
                  <span>{criticalCount} Critical Blockers</span>
                  <span className="mx-2" aria-hidden="true">
                    ·
                  </span>
                  <span>{majorCount} Major Issues</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {audit.executiveSummary}
                </p>
              </div>
            </div>
          </div>

          {/* Threshold Legend */}
          <div className="mt-6 pt-4 border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono tabular-nums text-slate-400">
            <div>
              <span className="text-emerald-400 font-semibold">85-100%</span> · Optimal
            </div>
            <div>
              <span className="text-sky-400 font-semibold">70-84%</span> · Good to Pass
            </div>
            <div>
              <span className="text-amber-400 font-semibold">50-69%</span> · High Risk
            </div>
            <div>
              <span className="text-rose-400 font-semibold">0-49%</span> · Critical
            </div>
          </div>
        </div>

        {/* 2. Category Score Breakdown Grid (4 Pillars in %) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {audit.categories.map((cat) => {
            const badgeMeta = getCategoryBadge(cat.score);
            return (
              <div
                key={cat.id}
                className="bg-slate-900/75 border border-white/[0.08] rounded-xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h2 className="text-sm font-bold text-white font-display">
                      {cat.name}
                    </h2>
                    <span
                      className={`text-xs font-mono font-semibold shrink-0 ${badgeMeta.textClass}`}
                    >
                      {badgeMeta.badge}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 font-mono tabular-nums mb-3">
                    <span>{cat.weight}% Weight</span>
                    <span className="mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    <span>Score: {cat.score}%</span>
                  </div>

                  {/* Horizontal Progress Bar + Exact % */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden border border-white/[0.06]">
                      <div
                        className={`h-full ${badgeMeta.barClass} transition-all duration-500`}
                        style={{
                          width: `${Math.max(0, Math.min(100, cat.score))}%`
                        }}
                      />
                    </div>
                    <span className="text-lg font-extrabold text-white font-mono tabular-nums shrink-0">
                      {cat.score}%
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {cat.feedback}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bento Row 2: "Why Your CV Is Not ATS Friendly" Problem Highlighter (8 cols) + Keyword Coverage (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 3. "Why Your CV Is Not ATS Friendly" Problem Highlighter */}
        <div className="lg:col-span-8 bg-slate-900/75 border border-white/[0.08] rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-white/[0.06]">
            <div>
              <h2 className="text-lg font-bold text-white font-display">
                Why Your CV Is Not ATS Friendly
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Showing {filteredProblems.length} of {audit.problems.length}{' '}
                specific issues detected in {uploadedFileName}
              </p>
            </div>

            {/* Search input */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search detected issues..."
                aria-label="Search detected issues"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-white/[0.1] focus:border-emerald-500 focus:outline-none text-xs text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Interactive Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-white/[0.08] rounded-lg mb-5 overflow-x-auto">
            {PROBLEM_FILTER_TABS.map((tab) => {
              const count = filterProblems(audit.problems, tab).length;
              const isActive = selectedFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSelectedFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab} ({count})
                </button>
              );
            })}
          </div>

          {/* Problem Cards List */}
          {filteredProblems.length === 0 ? (
            <div className="py-12 text-center bg-slate-950/50 border border-white/[0.06] rounded-xl p-6">
              <SlidersHorizontal className="w-6 h-6 text-slate-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white mb-1">
                No issues match this filter
              </p>
              <p className="text-xs text-slate-400 mb-4">
                Switch back to &ldquo;All Issues&rdquo; or clear the search
                query.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedFilter('All Issues');
                  setSearchQuery('');
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-lg cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProblems.map((problem) => {
                const sevUpper = problem.severity.toUpperCase();
                const severityColor = sevUpper.includes('CRITICAL')
                  ? 'text-rose-400'
                  : sevUpper.includes('MAJOR')
                    ? 'text-amber-400'
                    : 'text-sky-400';

                return (
                  <article
                    key={problem.id}
                    className="bg-slate-950/75 border border-white/[0.08] rounded-xl p-5 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <AlertTriangle
                          className={`w-3.5 h-3.5 ${severityColor} shrink-0`}
                        />
                        <span className={`font-bold ${severityColor}`}>
                          {problem.severity}
                        </span>
                        <span className="text-slate-600" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-slate-300">
                          {problem.category}
                        </span>
                      </div>
                      <span className="text-slate-500">
                        Resolved in Super-ATS
                      </span>
                    </div>

                    {/* Detected in Your CV */}
                    <div className="p-3 rounded-lg bg-slate-900/90 border border-white/[0.06]">
                      <p className="text-[11px] font-mono text-slate-400 mb-1">
                        Detected in Your CV:
                      </p>
                      <p className="text-xs font-mono text-rose-200 break-words">
                        &ldquo;{problem.detectedInUploadedCv}&rdquo;
                      </p>
                    </div>

                    {/* Why It Fails ATS + Recommended Fix */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <div>
                        <p className="text-xs font-semibold text-slate-300 mb-1">
                          Why It Fails ATS:
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {problem.whyNotAtsFriendly}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-emerald-400 mb-1">
                          Recommended Fix:
                        </p>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {problem.howToFix}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Industry Taxonomy & Keyword Coverage */}
        <div className="lg:col-span-4 bg-slate-900/75 border border-white/[0.08] rounded-xl p-6 space-y-6">
          <div className="pb-4 border-b border-white/[0.06]">
            <h2 className="text-lg font-bold text-white font-display">
              Industry Keyword Coverage
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Benchmarked against {fileMetadata.inferredTargetRole} ATS
              standards
            </p>
          </div>

          {/* Detected Keywords */}
          <div>
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="font-semibold text-emerald-400 inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Detected Keywords</span>
              </span>
              <span className="font-mono tabular-nums text-slate-400">
                {audit.detectedKeywords.length} found
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {audit.detectedKeywords.map((kw) => (
                <span
                  key={kw}
                  className="px-2.5 py-1 text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-md whitespace-nowrap"
                >
                  ✓ {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Missing Recommended Keywords */}
          <div className="pt-4 border-t border-white/[0.06]">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-rose-400">
                Missing Recommended Keywords
              </span>
              <span className="font-mono tabular-nums text-slate-400">
                {audit.missingRecommendedKeywords.length} missing
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Click any missing keyword below to inject it into your Super-ATS
              Technical Skills clusters:
            </p>

            {audit.missingRecommendedKeywords.length === 0 ? (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                All recommended domain keywords are now included in your
                Super-ATS Resume!
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {audit.missingRecommendedKeywords.map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => onInjectKeyword(kw)}
                    title={`Click to add "${kw}" to your Super-ATS Resume`}
                    className="px-2.5 py-1 text-xs font-mono bg-rose-500/10 hover:bg-emerald-500/20 border border-rose-500/30 hover:border-emerald-500/40 text-rose-300 hover:text-emerald-200 rounded-md transition-colors inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{kw}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Floating Bottom CTA Bar (Bridge to Tool 2) */}
      <div className="no-print fixed bottom-0 left-0 right-0 z-30 bg-slate-950/90 backdrop-blur-xl border-t border-white/[0.1] py-3 px-6">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs sm:text-sm text-slate-300 font-mono tabular-nums">
            <span>Uploaded CV Score: {audit.overallScore}%</span>
            <span className="mx-2 text-slate-500" aria-hidden="true">
              ➔
            </span>
            <span className="text-emerald-400 font-semibold">
              Super-ATS Rebuild: {newAtsScore}% (ATS Pass Guaranteed)
            </span>
          </div>

          <button
            type="button"
            onClick={onConvertToSuperAts}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm tracking-tight shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              Convert Uploaded CV to Super-ATS Friendly Resume (95%+ Score)
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
