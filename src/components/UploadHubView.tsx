import React, { useRef, useState } from 'react';
import {
  Upload,
  FileText,
  Sparkles,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { SAMPLE_NON_ATS_FILENAME } from '../utils/sampleData';

interface UploadHubViewProps {
  onFileSelected: (file: File) => void;
  onTrySampleFile: () => void;
  isUploading: boolean;
  uploadProgress: number;
  uploadStageLabel: string;
  activeFileName: string | null;
  errorMessage: string | null;
}

export const UploadHubView: React.FC<UploadHubViewProps> = ({
  onFileSelected,
  onTrySampleFile,
  isUploading,
  uploadProgress,
  uploadStageLabel,
  activeFileName,
  errorMessage
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };

  return (
    <section className="max-w-[960px] mx-auto px-6 py-12 sm:py-16">
      {/* Centered Hero Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <p className="text-xs font-mono text-emerald-400 tracking-wide mb-2.5">
          Single-Click File Upload ATS Scanner & Super-ATS Rebuilder
        </p>
        <h1
          className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white font-display leading-[1.12] mb-4"
          style={{ textWrap: 'balance' }}
        >
          Upload your CV file for an instant ATS audit and 95%+ rebuild
        </h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          Drop your existing resume file below. ATS Forge AI automatically
          extracts your layout and career history, infers your target role,
          scores your CV across 4 universal ATS pillars, and generates a
          single-column Super-ATS version.
        </p>
      </div>

      {/* Centered Glassmorphic File Upload Card */}
      <div className="bg-slate-900/75 border border-white/[0.08] rounded-2xl p-6 sm:p-10 shadow-2xl">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!isUploading) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative rounded-xl border-2 border-dashed transition-all duration-200 p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[300px] ${
            isDragging
              ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
              : isUploading
                ? 'border-emerald-500/40 bg-slate-950/80'
                : 'border-white/[0.14] bg-slate-950/60 hover:border-emerald-500/40 hover:bg-slate-950/80'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            aria-label="Upload CV File"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onFileSelected(file);
              }
              e.target.value = '';
            }}
          />

          {isUploading ? (
            /* State 2: Uploading & Multi-Stage Parsing Animation */
            <div className="w-full max-w-lg mx-auto space-y-5 py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <Sparkles className="w-7 h-7 animate-spin" />
              </div>

              <div>
                <p className="text-base font-bold text-white font-display mb-1">
                  Analyzing {activeFileName || 'Uploaded CV'}...
                </p>
                <p
                  role="status"
                  className="text-xs font-mono text-emerald-400"
                >
                  {uploadStageLabel}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-white/[0.08]">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>

              {/* 3 Stage Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-left text-[11px] font-mono">
                <div
                  className={`p-2.5 rounded-lg border ${
                    uploadProgress >= 20
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-900/60 border-white/[0.06] text-slate-500'
                  }`}
                >
                  01. Extracting layout & metadata
                </div>
                <div
                  className={`p-2.5 rounded-lg border ${
                    uploadProgress >= 55
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-900/60 border-white/[0.06] text-slate-500'
                  }`}
                >
                  02. Workday/Taleo parser simulation
                </div>
                <div
                  className={`p-2.5 rounded-lg border ${
                    uploadProgress >= 85
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-900/60 border-white/[0.06] text-slate-500'
                  }`}
                >
                  03. Scoring & rebuilding Super-ATS
                </div>
              </div>
            </div>
          ) : (
            /* State 1: Idle Upload Dropzone */
            <>
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-white/[0.1] flex items-center justify-center text-emerald-400 mb-5 shadow-inner">
                <Upload className="w-7 h-7" />
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white font-display mb-2">
                Drag & drop your CV file here
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6">
                Our client-side parser extracts your document structure,
                automatically detects your target role, and audits against
                Workday, Taleo, Greenhouse, and Lever standards.
              </p>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm tracking-tight shadow-lg shadow-emerald-500/20 transition-all inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <FileText className="w-4 h-4" />
                <span>Browse Files</span>
              </button>

              {/* Supported file formats metadata line */}
              <div className="mt-6 flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
                <span>Supported formats:</span>
                <span className="text-slate-200 font-semibold">PDF</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-200 font-semibold">DOCX</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-200 font-semibold">DOC</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-200 font-semibold">TXT</span>
                <span aria-hidden="true">·</span>
                <span>Max 10MB</span>
              </div>
            </>
          )}
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Subtle "Try with Sample Non-ATS CV.pdf" button underneath the upload box */}
        <div className="mt-6 pt-5 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Zero manual typing required — automatic role inference & instant
              Super-ATS rebuild
            </span>
          </div>

          <button
            type="button"
            disabled={isUploading}
            onClick={onTrySampleFile}
            className="px-4 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-white/[0.1] hover:border-emerald-500/40 text-xs font-mono text-emerald-300 transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>Try with {SAMPLE_NON_ATS_FILENAME}</span>
          </button>
        </div>
      </div>
    </section>
  );
};
