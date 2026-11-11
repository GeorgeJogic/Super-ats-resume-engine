/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type {
  AtsAnalysisResponse,
  SuperAtsResume,
  WorkflowStep
} from './types/ats';
import {
  SAMPLE_NON_ATS_FILENAME,
  SAMPLE_PRECOMPUTED_ANALYSIS,
  SAMPLE_WEAK_CV_TEXT
} from './utils/sampleData';
import {
  computeDeterministicAnalysis,
  injectMissingKeywordIntoState,
  resumeToPlainText
} from './utils/atsEngine';
import { extractCvFileContent } from './utils/fileExtractor';
import { Navbar } from './components/Navbar';
import { UploadHubView } from './components/UploadHubView';
import { DiagnosticDashboardView } from './components/DiagnosticDashboardView';
import { SuperAtsStudioView } from './components/SuperAtsStudioView';

export default function App() {
  const [activeStep, setActiveStep] = useState<WorkflowStep>('upload');
  const [uploadedFileName, setUploadedFileName] = useState<string>(
    SAMPLE_NON_ATS_FILENAME
  );
  const [extractedCvText, setExtractedCvText] =
    useState<string>(SAMPLE_WEAK_CV_TEXT);
  const [analysis, setAnalysis] = useState<AtsAnalysisResponse>(() =>
    JSON.parse(JSON.stringify(SAMPLE_PRECOMPUTED_ANALYSIS))
  );

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStageLabel, setUploadStageLabel] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runUploadAndScanPipeline = async (
    fileName: string,
    cvTextContent: string,
    mimeType = 'text/plain',
    base64Data = ''
  ) => {
    setErrorMessage(null);
    setUploadedFileName(fileName);
    setExtractedCvText(cvTextContent);
    setIsUploading(true);

    // Stage 1
    setUploadProgress(25);
    setUploadStageLabel('Extracting layout & metadata...');
    await new Promise((r) => setTimeout(r, 150));

    // Stage 2
    setUploadProgress(60);
    setUploadStageLabel('Running Workday/Taleo parser simulation...');

    const apiPromise = fetch('/api/analyze-resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(22000),
      body: JSON.stringify({
        cvText: cvTextContent,
        fileName,
        mimeType,
        base64Data
      })
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('API request failed');
        return (await res.json()) as AtsAnalysisResponse;
      })
      .catch(() => computeDeterministicAnalysis(cvTextContent, fileName));

    await new Promise((r) => setTimeout(r, 150));

    // Stage 3
    setUploadProgress(90);
    setUploadStageLabel(
      'Scoring ATS categories & rebuilding Super-ATS version...'
    );

    const result = await apiPromise;
    setUploadProgress(100);

    setAnalysis(result);
    setIsUploading(false);
    setUploadProgress(0);
    setUploadStageLabel('');
    setActiveStep('audit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFileSelected = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File exceeds the 10MB limit. Please upload a smaller CV.');
      return;
    }

    const allowedExt = /\.(pdf|docx|doc|txt)$/i.test(file.name);
    if (!allowedExt) {
      setErrorMessage(
        'Unsupported file format. Please upload a PDF, DOCX, DOC, or TXT file.'
      );
      return;
    }

    try {
      const extracted = await extractCvFileContent(file);
      await runUploadAndScanPipeline(
        extracted.fileName,
        extracted.extractedText,
        extracted.mimeType,
        extracted.base64Data
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Could not read the selected file. Please try again.'
      );
    }
  };

  const handleTrySampleFile = async () => {
    setErrorMessage(null);
    setUploadedFileName(SAMPLE_NON_ATS_FILENAME);
    setExtractedCvText(SAMPLE_WEAK_CV_TEXT);
    setIsUploading(true);
    setUploadProgress(25);
    setUploadStageLabel('Extracting layout & metadata...');
    await new Promise((r) => setTimeout(r, 120));
    setUploadProgress(65);
    setUploadStageLabel('Running Workday/Taleo parser simulation...');
    await new Promise((r) => setTimeout(r, 120));
    setUploadProgress(95);
    setUploadStageLabel('Scoring ATS categories & rebuilding Super-ATS version...');
    const result = computeDeterministicAnalysis(
      SAMPLE_WEAK_CV_TEXT,
      SAMPLE_NON_ATS_FILENAME
    );
    await new Promise((r) => setTimeout(r, 100));
    setAnalysis(result);
    setIsUploading(false);
    setUploadProgress(0);
    setUploadStageLabel('');
    setActiveStep('audit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRescanGeneratedResume = () => {
    const generatedPlainText = resumeToPlainText(analysis.superAtsResume);
    const verifiedFileName = `${analysis.superAtsResume.contactHeader.fullName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')}_Super_ATS_Verified.pdf`;
    const rescanResult = computeDeterministicAnalysis(
      generatedPlainText,
      verifiedFileName
    );
    setUploadedFileName(verifiedFileName);
    setExtractedCvText(generatedPlainText);
    setAnalysis(rescanResult);
    setActiveStep('audit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInjectKeyword = (keyword: string) => {
    setAnalysis((prev) => injectMissingKeywordIntoState(prev, keyword));
  };

  const handleUpdateSuperAtsResume = (nextResume: SuperAtsResume) => {
    setAnalysis((prev) => ({
      ...prev,
      superAtsResume: nextResume
    }));
  };

  return (
    <div
      id="top"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-x-hidden"
    >
      {/* Subtle radial ambient glow (hidden in print) */}
      <div
        aria-hidden="true"
        className="no-print pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div className="absolute -top-40 left-1/4 w-[640px] h-[360px] rounded-full bg-emerald-500/[0.06] blur-3xl" />
        <div className="absolute top-32 right-1/5 w-[520px] h-[320px] rounded-full bg-indigo-500/[0.06] blur-3xl" />
      </div>

      {/* Floating Glassmorphic Dock / Top Navigation Bar */}
      <Navbar
        activeStep={activeStep}
        onSelectStep={(step) => {
          setActiveStep(step);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        uploadedFileName={uploadedFileName}
        onReuploadNewCv={() => {
          setActiveStep('upload');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Main View Viewport */}
      <main className="relative z-10 flex-1">
        <AnimatePresence mode="wait">
          {activeStep === 'upload' && (
            <motion.div
              key="view-upload"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <UploadHubView
                onFileSelected={handleFileSelected}
                onTrySampleFile={handleTrySampleFile}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                uploadStageLabel={uploadStageLabel}
                activeFileName={uploadedFileName}
                errorMessage={errorMessage}
              />
            </motion.div>
          )}

          {activeStep === 'audit' && (
            <motion.div
              key="view-audit"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <DiagnosticDashboardView
                fileMetadata={analysis.fileMetadata}
                uploadedFileName={uploadedFileName}
                audit={analysis.audit}
                newAtsScore={analysis.superAtsResume.newAtsScore}
                onConvertToSuperAts={() => {
                  setActiveStep('studio');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onInjectKeyword={handleInjectKeyword}
                onReupload={() => {
                  setActiveStep('upload');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </motion.div>
          )}

          {activeStep === 'studio' && (
            <motion.div
              key="view-studio"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <SuperAtsStudioView
                uploadedFileName={uploadedFileName}
                rawCvText={extractedCvText}
                audit={analysis.audit}
                resume={analysis.superAtsResume}
                onUpdateResume={handleUpdateSuperAtsResume}
                onInjectKeyword={handleInjectKeyword}
                onRescanGeneratedResume={handleRescanGeneratedResume}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
