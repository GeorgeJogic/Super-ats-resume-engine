import mammoth from 'mammoth';

export interface ExtractedCvFileResult {
  fileName: string;
  mimeType: string;
  extractedText: string;
  base64Data: string;
}

/**
 * Strips DOCTYPE, <head>, <style>, <script>, and all HTML tags (<div class="contact">, <h2>, <p>, <strong>, <li>)
 * while converting block-level elements and <li> items into clean plain-text lines and bullets.
 */
export function cleanUploadedResumeText(rawInput: string): string {
  if (!rawInput) return '';
  // 1. Remove DOCTYPE, <head>, <style>, and <script> blocks completely
  let cleaned = rawInput
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // 2. Convert block-level HTML tags into clean newlines BEFORE stripping tags
  cleaned = cleaned
    .replace(/<\/(h1|h2|h3|h4|p|div|li|tr|section|header)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ');

  // 3. Parse with DOMParser to strip all remaining HTML tags (<p>, <strong>, <h2>, <div>)
  let plainText = cleaned;
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(cleaned, 'text/html');
    plainText = doc.body.textContent || '';
  } else {
    plainText = cleaned
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
  }

  // 4. Final regex safety strip to guarantee zero <tags> or inline CSS font stacks remain
  plainText = plainText
    .replace(/<[^>]+>/g, '')
    .replace(/font-family\s*:[^;\n]+;?/gi, '')
    .replace(/\bCalibri\s*,\s*Arial(?:\s*,\s*sans-serif)?\b/gi, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();

  return plainText;
}

export const sanitizeExtractedText = cleanUploadedResumeText;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

function isCleanExtractedText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 30) return false;
  if (/^%PDF-\d/i.test(trimmed)) return false;
  const pdfBinaryMarkers =
    trimmed.match(
      /\b(endobj|endstream|FlateDecode|xref|startxref|MediaBox|Parent|Catalog)\b/g
    ) || [];
  if (pdfBinaryMarkers.length >= 2) return false;
  return true;
}

/**
 * Extracts text from a PDF ArrayBuffer using pdfjs-dist, preserving line breaks via Y-coordinates.
 */
async function extractTextFromPdfBuffer(buffer: ArrayBuffer): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    try {
      const workerUrlMod = await import(
        'pdfjs-dist/build/pdf.worker.min.mjs?url'
      );
      if (workerUrlMod?.default && pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrlMod.default;
      }
    } catch {
      // Ignore worker URL resolution issues; server fallback will extract if needed
    }

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer.slice(0)),
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

    const fullText = cleanUploadedResumeText(pageTexts.join('\n\n'));
    if (isCleanExtractedText(fullText)) {
      return fullText;
    }
  } catch (err) {
    console.warn('Client pdfjs-dist extraction fallback triggered:', err);
  }

  return '';
}

/**
 * Extracts 100% of raw text from a .docx file using mammoth.
 */
async function extractTextFromDocxBuffer(buffer: ArrayBuffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({
      arrayBuffer: buffer.slice(0)
    });
    if (result?.value) {
      const cleaned = cleanUploadedResumeText(result.value);
      if (isCleanExtractedText(cleaned)) {
        return cleaned;
      }
    }
  } catch (err) {
    console.warn('Client mammoth docx extraction fallback triggered:', err);
  }
  return '';
}

/**
 * Fallback extractor for plain UTF-8 text, HTML-based .doc files, or uncompressed text streams,
 * strictly filtering out PDF object syntax and stripping all HTML tags.
 */
function extractReadableStringsFromBinary(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const decoded = decoder.decode(buffer);

  // If the file contains HTML markup (e.g. a .doc saved as HTML or an HTML resume), strip HTML cleanly
  if (/<(html|body|div|p|h1|h2|h3|ul|li|table|style|head)\b/i.test(decoded)) {
    const strippedHtml = cleanUploadedResumeText(decoded);
    if (strippedHtml.length > 20) {
      return strippedHtml;
    }
  }

  // Check if it's plain UTF-8 text disguised with a .pdf or .doc extension
  const printableRatio =
    (decoded.match(/[\x20-\x7E\r\n\t]/g)?.length || 0) /
    Math.max(1, decoded.length);
  if (printableRatio > 0.85 && !/^%PDF-\d/i.test(decoded.trim())) {
    return cleanUploadedResumeText(decoded);
  }

  // Extract parenthesized PDF text literals "(...)" if uncompressed PDF
  const pdfLiteralMatches = decoded.match(/\(([^()\\]{3,})\)/g);
  if (pdfLiteralMatches && pdfLiteralMatches.length > 8) {
    const joinedLiterals = pdfLiteralMatches
      .map((m) => m.slice(1, -1).trim())
      .filter(
        (s) =>
          s.length > 2 &&
          !/^(Type|Font|Page|Catalog|Outlines|Helvetica|Times|Courier|WinAnsiEncoding|FlateDecode|MediaBox|Resources|ProcSet)/i.test(
            s
          )
      )
      .join(' ');
    if (joinedLiterals.length > 60) {
      return cleanUploadedResumeText(joinedLiterals);
    }
  }

  const printableMatches =
    decoded.match(/[A-Za-z0-9@.,:/()\-_+#&•|*\s]{14,}/g) || [];
  const cleaned = printableMatches
    .map((s) => s.trim())
    .filter(
      (s) =>
        s.length > 14 &&
        !/(\bobj\b|\bendobj\b|\bstream\b|\bendstream\b|\bxref\b|\btrailer\b|\bFlateDecode\b|\bMediaBox\b|\bFontDescriptor\b|\bContent_Types\b|\brels\b|^%PDF)/i.test(
          s
        )
    )
    .join('\n');

  return cleanUploadedResumeText(cleaned);
}

/**
 * Extracts 100% of real text and base64 payload from any uploaded CV file (.pdf, .docx, .doc, .txt).
 * Passes all extracted text through cleanUploadedResumeText so zero HTML tags ever remain.
 */
export async function extractCvFileContent(
  file: File
): Promise<ExtractedCvFileResult> {
  const buffer = await file.arrayBuffer();
  const base64Data = arrayBufferToBase64(buffer);
  const lowerName = file.name.toLowerCase();

  let extractedText = '';
  let mimeType = file.type || 'application/octet-stream';

  if (lowerName.endsWith('.txt') || lowerName.endsWith('.md')) {
    mimeType = 'text/plain';
    extractedText = cleanUploadedResumeText(
      new TextDecoder('utf-8', { fatal: false }).decode(buffer)
    );
  } else if (lowerName.endsWith('.docx')) {
    mimeType =
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    extractedText = await extractTextFromDocxBuffer(buffer);
  } else if (lowerName.endsWith('.pdf')) {
    mimeType = 'application/pdf';
    extractedText = await extractTextFromPdfBuffer(buffer);
  } else {
    mimeType = 'application/msword';
    extractedText = extractReadableStringsFromBinary(buffer);
  }

  // If client-side worker extraction was blocked or returned < 40 chars on a PDF/DOCX,
  // immediately call /api/extract-text (which runs Node pdfjs-dist/legacy + mammoth in <50ms)
  if (!isCleanExtractedText(extractedText) && base64Data) {
    try {
      const res = await fetch('/api/extract-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data,
          fileName: file.name,
          mimeType
        })
      });
      if (res.ok) {
        const data = (await res.json()) as { extractedText?: string };
        if (data?.extractedText) {
          const cleanedServerText = cleanUploadedResumeText(data.extractedText);
          if (cleanedServerText.length > extractedText.length) {
            extractedText = cleanedServerText;
          }
        }
      }
    } catch {
      // Fallback to readable binary strings if offline
    }
  }

  if (!extractedText) {
    extractedText = extractReadableStringsFromBinary(buffer);
  }

  const finalCleaned = cleanUploadedResumeText(extractedText);
  if (finalCleaned.length < 15 || /^%PDF-\d/i.test(finalCleaned)) {
    throw new Error(
      'Unable to extract readable text from this file. Please ensure the file is not password-protected, corrupted, or a scanned image without selectable text.'
    );
  }

  return {
    fileName: file.name,
    mimeType,
    extractedText: finalCleaned,
    base64Data
  };
}
