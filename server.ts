import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mammoth from 'mammoth';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  calibrateAnalysisResponse,
  computeDeterministicAnalysis
} from './src/utils/atsEngine.ts';
import { cleanUploadedResumeText } from './src/utils/fileExtractor.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extracts 100% of real text from a PDF or DOCX buffer on the server using
 * pdfjs-dist (legacy Node build) and mammoth.
 */
async function extractTextOnServer(
  base64Data: string,
  fileName: string,
  mimeType: string
): Promise<string> {
  if (!base64Data) return '';
  const buf = Buffer.from(base64Data, 'base64');
  const lowerName = (fileName || '').toLowerCase();

  // 1. DOCX extraction via mammoth
  if (
    lowerName.endsWith('.docx') ||
    mimeType.includes('officedocument.wordprocessingml.document')
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer: buf });
      if (result?.value && result.value.trim().length > 10) {
        return cleanUploadedResumeText(result.value);
      }
    } catch (err) {
      console.warn('Server mammoth extraction warning:', err);
    }
  }

  // 2. PDF extraction via pdfjs-dist/legacy/build/pdf.mjs
  if (lowerName.endsWith('.pdf') || mimeType === 'application/pdf') {
    try {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buf),
        useSystemFonts: true,
        disableFontFace: true,
        verbosity: 0
      });
      const pdf = await loadingTask.promise;
      const pageTexts: string[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        let lastY: number | null = null;
        const lines: string[] = [];
        let currentLine = '';

        for (const item of textContent.items) {
          if ('str' in item && typeof item.str === 'string') {
            const y = Array.isArray(item.transform) ? item.transform[5] : null;
            if (lastY !== null && y !== null && Math.abs(y - lastY) > 3.5) {
              if (currentLine.trim()) {
                lines.push(currentLine.trim());
              }
              currentLine = item.str;
            } else {
              currentLine +=
                (currentLine &&
                !currentLine.endsWith(' ') &&
                !item.str.startsWith(' ')
                  ? ' '
                  : '') + item.str;
            }
            if (y !== null) {
              lastY = y;
            }
          }
        }
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }
        if (lines.length > 0) {
          pageTexts.push(lines.join('\n'));
        }
      }

      const fullPdfText = cleanUploadedResumeText(pageTexts.join('\n\n'));
      if (fullPdfText.length > 15) {
        return fullPdfText;
      }
    } catch (err) {
      console.warn('Server pdfjs-dist extraction warning:', err);
    }
  }

  // 3. Plain text / HTML-based .doc fallback if UTF-8 readable
  const utf8 = buf.toString('utf8');
  const printableCount = (utf8.match(/[\x20-\x7E\r\n\t]/g) || []).length;
  if (utf8.length > 0 && printableCount / utf8.length > 0.85) {
    return cleanUploadedResumeText(utf8);
  }

  return '';
}

function isLikelyRawPdfBinaryLeak(text: string): boolean {
  if (!text || text.trim().length < 25) return true;
  if (/^%PDF-\d/i.test(text.trim())) return true;
  const pdfSyntaxMatches =
    text.match(/\b(endobj|endstream|FlateDecode|xref|startxref|MediaBox)\b/g) ||
    [];
  return pdfSyntaxMatches.length >= 2;
}

const SYSTEM_INSTRUCTION = `You are a Senior ATS Algorithm Architect (20+ years of experience with Workday, Taleo, Greenhouse, and Lever) and an Executive Resume Writer.

You will receive the raw text (and/or document attachment) extracted from a user's uploaded CV file.
Automatically infer the candidate's target role/domain from their CV and execute two tasks simultaneously:

TASK 1 (ATS DIAGNOSTIC & SCORING ENGINE — CALIBRATED 0-100% RUBRIC):
- Calculate the score dynamically based on what is actually inside the uploaded CV:
  1. Base Parseability & Formatting (Max 25% weight): Start at 100%. Deduct ONLY if garbled encoding, missing contact info (email/phone/LinkedIn), unreadable symbols, or broken multi-column tables exist. If contact info and clean text are present, score 80%-100%.
  2. Section Structure & Completeness (Max 25% weight): Check for standard headers (Experience/Work History, Education, Skills, Projects, Summary). Award 20% per detected core section.
  3. Keywords & Technical Taxonomy (Max 25% weight): Detect the candidate's domain and count relevant hard skills, tools, frameworks, and certifications. Award 80%-100% if 10+ relevant skills are present; scale proportionally if fewer.
  4. Impact & Quantification (Max 25% weight): Scan bullet points for strong action verbs (Engineered, Built, Developed, Led, Optimized, Designed) and measurable metrics (%, $, numbers, scale).
- CALIBRATION RULE: A normal, readable CV with standard sections MUST score realistically between 58% and 82% (or 85%+ if already well-optimized). NEVER assign a low ~32% score to a readable resume.
- Only flag problems that genuinely exist in the uploaded CV text, quoting the exact weak bullet point or missing element from the user's CV.

TASK 2 (SUPER-ATS RESUME TRANSFORMER):
- Preserve 100% of the candidate's real name, contact details, education, companies, roles, dates, and projects from the uploaded CV. Do NOT invent fake jobs, degrees, or credentials.
- Rewrite weak or passive bullets into high-impact Google XYZ statements ("Accomplished [X] as measured by [Y], by doing [Z]"). Where exact numbers are missing in the uploaded CV, insert clear bracketed placeholders like "[by 35%]" so the user can customize them.
- Organize all skills into clean, ATS-friendly categorized lines (e.g., Languages, Frameworks & Libraries, Tools & Platforms).
- Restructure into a clean single-column hierarchy with standard ATS headers (PROFESSIONAL SUMMARY, TECHNICAL SKILLS, PROFESSIONAL EXPERIENCE, PROJECTS, EDUCATION, CERTIFICATIONS & ACHIEVEMENTS).

Respond STRICTLY in valid JSON matching the schema.`;

const ATS_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    fileMetadata: {
      type: Type.OBJECT,
      properties: {
        detectedCandidateName: { type: Type.STRING },
        inferredTargetRole: { type: Type.STRING },
        isAtsFriendly: { type: Type.BOOLEAN }
      },
      required: ['detectedCandidateName', 'inferredTargetRole', 'isAtsFriendly']
    },
    audit: {
      type: Type.OBJECT,
      properties: {
        overallScore: { type: Type.NUMBER },
        passStatus: { type: Type.STRING },
        executiveSummary: { type: Type.STRING },
        categories: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              score: { type: Type.NUMBER },
              weight: { type: Type.NUMBER },
              status: { type: Type.STRING },
              feedback: { type: Type.STRING }
            },
            required: ['id', 'name', 'score', 'weight', 'status', 'feedback']
          }
        },
        problems: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              severity: { type: Type.STRING },
              category: { type: Type.STRING },
              detectedInUploadedCv: { type: Type.STRING },
              whyNotAtsFriendly: { type: Type.STRING },
              howToFix: { type: Type.STRING }
            },
            required: [
              'id',
              'severity',
              'category',
              'detectedInUploadedCv',
              'whyNotAtsFriendly',
              'howToFix'
            ]
          }
        },
        detectedKeywords: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        missingRecommendedKeywords: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      required: [
        'overallScore',
        'passStatus',
        'executiveSummary',
        'categories',
        'problems',
        'detectedKeywords',
        'missingRecommendedKeywords'
      ]
    },
    superAtsResume: {
      type: Type.OBJECT,
      properties: {
        newAtsScore: { type: Type.NUMBER },
        fixesApplied: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        contactHeader: {
          type: Type.OBJECT,
          properties: {
            fullName: { type: Type.STRING },
            professionalTitle: { type: Type.STRING },
            location: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            links: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: [
            'fullName',
            'professionalTitle',
            'location',
            'email',
            'phone',
            'links'
          ]
        },
        professionalSummary: { type: Type.STRING },
        technicalSkills: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              skills: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['category', 'skills']
          }
        },
        experience: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              role: { type: Type.STRING },
              company: { type: Type.STRING },
              location: { type: Type.STRING },
              dates: { type: Type.STRING },
              bullets: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['role', 'company', 'location', 'dates', 'bullets']
          }
        },
        projects: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              techStack: { type: Type.STRING },
              dates: { type: Type.STRING },
              bullets: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['title', 'techStack', 'dates', 'bullets']
          }
        },
        education: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              degree: { type: Type.STRING },
              institution: { type: Type.STRING },
              dates: { type: Type.STRING },
              details: { type: Type.STRING }
            },
            required: ['degree', 'institution', 'dates', 'details']
          }
        },
        certifications: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      required: [
        'newAtsScore',
        'fixesApplied',
        'contactHeader',
        'professionalSummary',
        'technicalSkills',
        'experience',
        'projects',
        'education',
        'certifications'
      ]
    }
  },
  required: ['fileMetadata', 'audit', 'superAtsResume']
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));

  // Dedicated server-side PDF/DOCX text extraction endpoint
  app.post('/api/extract-text', async (req, res) => {
    try {
      const { base64Data = '', fileName = '', mimeType = '' } = req.body || {};
      const extractedText = await extractTextOnServer(
        base64Data,
        fileName,
        mimeType
      );
      res.json({ extractedText });
    } catch {
      res.json({ extractedText: '' });
    }
  });

  app.post('/api/analyze-resume', async (req, res) => {
    try {
      const {
        cvText = '',
        fileName = 'Uploaded_CV.pdf',
        mimeType = '',
        base64Data = '',
        preferDeterministic = false
      } = req.body || {};

      let resolvedText = typeof cvText === 'string' ? cvText.trim() : '';

      // Always run server-side pdfjs-dist / mammoth extraction if base64Data is present
      // and client text is short or looks like raw PDF syntax
      if (base64Data && (resolvedText.length < 120 || isLikelyRawPdfBinaryLeak(resolvedText))) {
        const serverExtracted = await extractTextOnServer(
          base64Data,
          fileName,
          mimeType
        );
        if (serverExtracted && serverExtracted.length > resolvedText.length) {
          resolvedText = serverExtracted;
        }
      }

      if (!resolvedText && !base64Data) {
        res
          .status(400)
          .json({ error: 'Uploaded CV file yielded no readable text.' });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      const isSampleWeakCv = resolvedText.includes(
        'ALEXANDER J. MERCER | Passionate Coding Ninja'
      );
      const isSuperAtsRescan =
        /PROFESSIONAL SUMMARY/i.test(resolvedText) &&
        /TECHNICAL SKILLS/i.test(resolvedText) &&
        /PROFESSIONAL EXPERIENCE/i.test(resolvedText);

      const hasValidKey =
        Boolean(apiKey) &&
        apiKey !== 'MY_GEMINI_API_KEY' &&
        !preferDeterministic &&
        !isSampleWeakCv &&
        !isSuperAtsRescan;

      if (!hasValidKey) {
        const fallbackResult = computeDeterministicAnalysis(
          resolvedText,
          fileName
        );
        res.json(fallbackResult);
        return;
      }

      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });

        const parts: Array<
          | { text: string }
          | { inlineData: { mimeType: string; data: string } }
        > = [];

        if (
          base64Data &&
          (mimeType === 'application/pdf' ||
            fileName.toLowerCase().endsWith('.pdf'))
        ) {
          parts.push({
            inlineData: {
              mimeType: 'application/pdf',
              data: base64Data
            }
          });
        }

        parts.push({
          text: [
            `UPLOADED CV FILE NAME: ${fileName}`,
            resolvedText
              ? `EXTRACTED CV TEXT:\n"""\n${resolvedText}\n"""`
              : 'Extract all candidate details, work history, education, projects, and skills directly from the attached PDF.'
          ].join('\n\n')
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: { parts },
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: ATS_RESPONSE_SCHEMA,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
          }
        });

        const rawJson = (response.text ?? '').trim();
        if (!rawJson) {
          throw new Error('Empty response from Gemini model');
        }

        const parsed = JSON.parse(rawJson);
        const calibrated = calibrateAnalysisResponse(
          parsed,
          resolvedText,
          fileName
        );
        res.json(calibrated);
      } catch {
        const fallbackResult = computeDeterministicAnalysis(
          resolvedText,
          fileName
        );
        res.json(fallbackResult);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unexpected server error during ATS scan.';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ATS Forge AI server listening on http://localhost:${PORT}`);
  });
}

startServer();
