import React from 'react';
import { FileText, RotateCcw } from 'lucide-react';
import type { WorkflowStep } from '../types/ats';

interface NavbarProps {
  activeStep: WorkflowStep;
  onSelectStep: (step: WorkflowStep) => void;
  uploadedFileName: string | null;
  onReuploadNewCv: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeStep,
  onSelectStep,
  uploadedFileName,
  onReuploadNewCv
}) => {
  return (
    <header className="no-print sticky top-0 z-40 w-full bg-slate-950/85 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element Brand Identity */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectStep('upload');
          }}
          className="text-lg font-bold tracking-tight text-white font-display whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
        >
          ATS Forge AI
        </a>

        {/* Zone 2: 3-Step Segmented Navigation */}
        <nav
          aria-label="ATS Forge Workflow"
          className="flex items-center gap-1 p-1 bg-slate-900/90 border border-white/[0.08] rounded-lg overflow-x-auto"
        >
          <button
            type="button"
            onClick={() => onSelectStep('upload')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeStep === 'upload'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Upload CV
          </button>
          <button
            type="button"
            onClick={() => onSelectStep('audit')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeStep === 'audit'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            ATS Score & Audit (Tool 1)
          </button>
          <button
            type="button"
            onClick={() => onSelectStep('studio')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeStep === 'studio'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Super-ATS Rebuilder (Tool 2)
          </button>
        </nav>

        {/* Zone 3: Uploaded Filename + Re-upload New CV Button */}
        <div className="flex items-center gap-3 shrink-0">
          {uploadedFileName && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono text-slate-300 truncate max-w-[190px]">
              <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{uploadedFileName}</span>
            </span>
          )}
          <button
            type="button"
            onClick={onReuploadNewCv}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Re-upload New CV</span>
          </button>
        </div>
      </div>
    </header>
  );
};
