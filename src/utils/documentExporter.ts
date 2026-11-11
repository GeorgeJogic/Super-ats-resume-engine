import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TabStopPosition,
  TabStopType,
  TextRun
} from 'docx';
import { jsPDF } from 'jspdf';
import saveAs from 'file-saver';
import type { SuperAtsResume } from '../types/ats';
import { cleanUploadedResumeText } from './fileExtractor';

function sanitizeFilename(name: string): string {
  return (
    cleanUploadedResumeText(name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'candidate'
  );
}

function cleanField(val: string | undefined | null): string {
  if (!val) return '';
  return cleanUploadedResumeText(String(val)).replace(/\s+/g, ' ').trim();
}

function createSectionHeadingParagraph(title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 140, after: 60 },
    border: {
      bottom: {
        color: '1E293B',
        space: 2,
        style: BorderStyle.SINGLE,
        size: 6
      }
    },
    children: [
      new TextRun({
        text: cleanField(title).toUpperCase(),
        bold: true,
        font: 'Calibri',
        size: 21, // 10.5pt
        color: '0F172A'
      })
    ]
  });
}

/**
 * Generates and downloads a genuine OpenXML Word Document (.docx) formatted to strict single-column 1-page Super-ATS standards.
 */
export async function downloadSuperAtsDocx(
  resume: SuperAtsResume
): Promise<void> {
  const { contactHeader } = resume;
  const fullName = cleanField(contactHeader.fullName) || 'CANDIDATE NAME';
  const professionalTitle = cleanField(contactHeader.professionalTitle);
  const contactItems = [
    cleanField(contactHeader.location),
    cleanField(contactHeader.phone),
    cleanField(contactHeader.email),
    ...(contactHeader.links || []).map((l) => cleanField(l))
  ].filter(Boolean);

  const children: Paragraph[] = [];

  // 16pt Bold Candidate Name centered at the top
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [
        new TextRun({
          text: fullName.toUpperCase(),
          bold: true,
          font: 'Calibri',
          size: 32, // 16pt
          color: '000000'
        })
      ]
    })
  );

  // Professional Title centered below name
  if (professionalTitle) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 35 },
        children: [
          new TextRun({
            text: professionalTitle,
            bold: true,
            font: 'Calibri',
            size: 21, // 10.5pt
            color: '1E293B'
          })
        ]
      })
    );
  }

  // Contact Line centered below title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 110 },
      border: {
        bottom: {
          color: '0F172A',
          space: 3,
          style: BorderStyle.SINGLE,
          size: 10
        }
      },
      children: [
        new TextRun({
          text: contactItems.join('  |  '),
          font: 'Calibri',
          size: 19, // 9.5pt
          color: '334155'
        })
      ]
    })
  );

  // 1. PROFESSIONAL SUMMARY
  const summaryText = cleanField(resume.professionalSummary);
  if (summaryText) {
    children.push(createSectionHeadingParagraph('PROFESSIONAL SUMMARY'));
    children.push(
      new Paragraph({
        spacing: { after: 80, line: 245 },
        children: [
          new TextRun({
            text: summaryText,
            font: 'Calibri',
            size: 19, // 9.5pt
            color: '0F172A'
          })
        ]
      })
    );
  }

  // 2. TECHNICAL SKILLS
  if (resume.technicalSkills && resume.technicalSkills.length > 0) {
    children.push(createSectionHeadingParagraph('TECHNICAL SKILLS'));
    for (const cluster of resume.technicalSkills) {
      const catLabel = cleanField(cluster.category);
      const skillsList = (cluster.skills || [])
        .map((s) => cleanField(s))
        .filter(Boolean)
        .join(', ');
      if (!skillsList) continue;

      children.push(
        new Paragraph({
          spacing: { after: 40, line: 240 },
          children: [
            new TextRun({
              text: `${catLabel}: `,
              bold: true,
              font: 'Calibri',
              size: 19, // 9.5pt
              color: '000000'
            }),
            new TextRun({
              text: skillsList,
              font: 'Calibri',
              size: 19, // 9.5pt
              color: '0F172A'
            })
          ]
        })
      );
    }
  }

  // 3. PROFESSIONAL EXPERIENCE (Max 3 concise bullets per role for strict 1-page fitting)
  if (resume.experience && resume.experience.length > 0) {
    children.push(createSectionHeadingParagraph('PROFESSIONAL EXPERIENCE'));
    for (const exp of resume.experience) {
      const role = cleanField(exp.role);
      const company = cleanField(exp.company);
      const location = cleanField(exp.location);
      const dates = cleanField(exp.dates);

      children.push(
        new Paragraph({
          spacing: { before: 70, after: 25 },
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: TabStopPosition.MAX
            }
          ],
          children: [
            new TextRun({
              text: role,
              bold: true,
              font: 'Calibri',
              size: 20, // 10pt
              color: '000000'
            }),
            new TextRun({
              text: company
                ? ` — ${company}${location ? ` (${location})` : ''}`
                : '',
              bold: true,
              font: 'Calibri',
              size: 19, // 9.5pt
              color: '1E293B'
            }),
            new TextRun({
              text: `\t${dates}`,
              bold: true,
              font: 'Calibri',
              size: 19, // 9.5pt
              color: '1E293B'
            })
          ]
        })
      );

      for (const rawBullet of (exp.bullets || []).slice(0, 3)) {
        const bullet = cleanField(rawBullet).replace(/^[*•\-–—›]+\s*/, '');
        if (!bullet) continue;
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 35, line: 240 },
            children: [
              new TextRun({
                text: bullet,
                font: 'Calibri',
                size: 19, // 9.5pt
                color: '0F172A'
              })
            ]
          })
        );
      }
    }
  }

  // 4. PROJECTS (Max 2 projects, max 2 bullets per project for 1-page fitting)
  if (resume.projects && resume.projects.length > 0) {
    children.push(createSectionHeadingParagraph('PROJECTS'));
    for (const proj of resume.projects.slice(0, 2)) {
      const title = cleanField(proj.title);
      const techStack = cleanField(proj.techStack);
      const dates = cleanField(proj.dates);

      children.push(
        new Paragraph({
          spacing: { before: 65, after: 25 },
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: TabStopPosition.MAX
            }
          ],
          children: [
            new TextRun({
              text: title,
              bold: true,
              font: 'Calibri',
              size: 20, // 10pt
              color: '000000'
            }),
            new TextRun({
              text: techStack ? `  |  ${techStack}` : '',
              italics: true,
              font: 'Calibri',
              size: 19, // 9.5pt
              color: '334155'
            }),
            new TextRun({
              text: `\t${dates}`,
              bold: true,
              font: 'Calibri',
              size: 19, // 9.5pt
              color: '1E293B'
            })
          ]
        })
      );

      for (const rawBullet of (proj.bullets || []).slice(0, 2)) {
        const bullet = cleanField(rawBullet).replace(/^[*•\-–—›]+\s*/, '');
        if (!bullet) continue;
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 35, line: 240 },
            children: [
              new TextRun({
                text: bullet,
                font: 'Calibri',
                size: 19, // 9.5pt
                color: '0F172A'
              })
            ]
          })
        );
      }
    }
  }

  // 5. EDUCATION
  if (resume.education && resume.education.length > 0) {
    children.push(createSectionHeadingParagraph('EDUCATION'));
    for (const edu of resume.education) {
      const degree = cleanField(edu.degree);
      const institution = cleanField(edu.institution);
      const dates = cleanField(edu.dates);
      const details = cleanField(edu.details);

      children.push(
        new Paragraph({
          spacing: { before: 60, after: 20 },
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: TabStopPosition.MAX
            }
          ],
          children: [
            new TextRun({
              text: degree,
              bold: true,
              font: 'Calibri',
              size: 20, // 10pt
              color: '000000'
            }),
            new TextRun({
              text: institution ? ` — ${institution}` : '',
              font: 'Calibri',
              size: 19, // 9.5pt
              color: '1E293B'
            }),
            new TextRun({
              text: `\t${dates}`,
              bold: true,
              font: 'Calibri',
              size: 19, // 9.5pt
              color: '1E293B'
            })
          ]
        })
      );

      if (details) {
        children.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: details,
                font: 'Calibri',
                size: 19, // 9.5pt
                color: '334155'
              })
            ]
          })
        );
      }
    }
  }

  // 6. CERTIFICATIONS & ACHIEVEMENTS
  if (resume.certifications && resume.certifications.length > 0) {
    const cleanCerts = resume.certifications
      .map((c) => cleanField(c))
      .filter(Boolean);
    if (cleanCerts.length > 0) {
      children.push(
        createSectionHeadingParagraph('CERTIFICATIONS & ACHIEVEMENTS')
      );
      children.push(
        new Paragraph({
          spacing: { after: 50 },
          children: [
            new TextRun({
              text: cleanCerts.join('  •  '),
              font: 'Calibri',
              size: 19, // 9.5pt
              color: '0F172A'
            })
          ]
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 680, // ~0.47 inch (12mm)
              right: 680,
              bottom: 680,
              left: 680
            }
          }
        },
        children
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `${sanitizeFilename(fullName)}_Super_ATS_Resume.docx`;
  saveAs(blob, fileName);
}

/**
 * Builds the single-page ATS-Safe jsPDF instance with 12mm (34pt) margins,
 * 16pt name / 10.5pt headers / 9.5pt body / 1.22 line height (11.6pt),
 * and a 10mm (28pt) gap between left-aligned headers and right-aligned dates.
 */
export function createSuperAtsPdfDocument(resume: SuperAtsResume): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter' // 612 x 792 pt
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 34; // 12mm (~0.47 inch)
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 11.6; // 9.5pt * 1.22 line height
  let y = margin + 10;

  const ensureSpace = (neededPt: number) => {
    if (y + neededPt > pageHeight - margin) {
      doc.addPage();
      y = margin + 12;
    }
  };

  const { contactHeader } = resume;
  const fullName = (
    cleanField(contactHeader.fullName) || 'CANDIDATE NAME'
  ).toUpperCase();
  const professionalTitle = cleanField(contactHeader.professionalTitle);

  // 16pt Bold Candidate Name centered at top
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  const wrappedName = doc.splitTextToSize(fullName, contentWidth);
  for (const nameLine of wrappedName) {
    ensureSpace(16);
    doc.text(nameLine, pageWidth / 2, y, { align: 'center' });
    y += 15;
  }

  // Professional Title (10.5pt)
  if (professionalTitle) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);
    const wrappedTitle = doc.splitTextToSize(professionalTitle, contentWidth);
    for (const titleLine of wrappedTitle) {
      ensureSpace(12.5);
      doc.text(titleLine, pageWidth / 2, y, { align: 'center' });
      y += 12.5;
    }
  }

  // Contact Line (9.5pt)
  const contactLine = [
    cleanField(contactHeader.location),
    cleanField(contactHeader.phone),
    cleanField(contactHeader.email),
    ...(contactHeader.links || []).map((l) => cleanField(l))
  ]
    .filter(Boolean)
    .join('  |  ');

  if (contactLine) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    const wrappedContact = doc.splitTextToSize(contactLine, contentWidth);
    for (const cLine of wrappedContact) {
      ensureSpace(11.5);
      doc.text(cLine, pageWidth / 2, y, { align: 'center' });
      y += 11.5;
    }
  }

  y += 1.5;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(1.0);
  doc.line(margin, y, pageWidth - margin, y);
  y += 11;

  const drawSectionHeader = (title: string) => {
    ensureSpace(24);
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(cleanField(title).toUpperCase(), margin, y);
    y += 3.5;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 11;
  };

  /**
   * Helper to draw a left-aligned bold header and right-aligned date with a minimum 28pt (10mm) gap.
   */
  const drawHeaderWithRightDate = (leftText: string, rightDate: string) => {
    const cleanLeft = cleanField(leftText);
    const cleanDate = cleanField(rightDate);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    const dateColumnWidth = cleanDate ? doc.getTextWidth(cleanDate) + 28 : 0; // 28pt (~10mm) gap

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.8);
    doc.setTextColor(15, 23, 42);
    const maxLeftWidth = Math.max(180, contentWidth - dateColumnWidth);
    const leftLines: string[] = doc.splitTextToSize(cleanLeft, maxLeftWidth);

    ensureSpace(leftLines.length * lineHeight + 2);

    if (cleanDate) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text(cleanDate, pageWidth - margin, y, { align: 'right' });
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.8);
    doc.setTextColor(15, 23, 42);
    for (const lLine of leftLines) {
      ensureSpace(lineHeight);
      doc.text(lLine, margin, y);
      y += lineHeight;
    }
  };

  /**
   * Helper to draw wrapped 9.5pt bullet lines safely within margins.
   */
  const drawWrappedBullet = (rawBullet: string) => {
    const cleanBullet = cleanField(rawBullet).replace(/^[*•\-–—›]+\s*/, '');
    if (!cleanBullet) return;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);

    const bulletLines: string[] = doc.splitTextToSize(
      cleanBullet,
      contentWidth - 14
    );
    ensureSpace(bulletLines.length * lineHeight + 1);

    bulletLines.forEach((bLine, idx) => {
      ensureSpace(lineHeight);
      if (idx === 0) {
        doc.text('•', margin + 2, y);
      }
      doc.text(bLine, margin + 12, y);
      y += lineHeight;
    });
    y += 1;
  };

  // 1. PROFESSIONAL SUMMARY (9.5pt body)
  const summaryText = cleanField(resume.professionalSummary);
  if (summaryText) {
    drawSectionHeader('PROFESSIONAL SUMMARY');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    const lines: string[] = doc.splitTextToSize(summaryText, contentWidth);
    for (const sLine of lines) {
      ensureSpace(lineHeight);
      doc.text(sLine, margin, y);
      y += lineHeight;
    }
    y += 3;
  }

  // 2. TECHNICAL SKILLS (No double-drawing; wraps skills in a dedicated column to the right of the bold category label)
  if (resume.technicalSkills && resume.technicalSkills.length > 0) {
    drawSectionHeader('TECHNICAL SKILLS');
    for (const cluster of resume.technicalSkills) {
      const catLabel = `${cleanField(cluster.category)}: `;
      const skillsStr = (cluster.skills || [])
        .map((s) => cleanField(s))
        .filter(Boolean)
        .join(', ');
      if (!skillsStr) continue;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const labelWidth = doc.getTextWidth(catLabel);

      if (labelWidth < 155) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        const skillLines: string[] = doc.splitTextToSize(
          skillsStr,
          contentWidth - labelWidth - 4
        );
        ensureSpace(skillLines.length * lineHeight + 1);

        skillLines.forEach((sLine, idx) => {
          ensureSpace(lineHeight);
          if (idx === 0) {
            doc.setFont('helvetica', 'bold');
            doc.text(catLabel, margin, y);
            doc.setFont('helvetica', 'normal');
          }
          doc.text(sLine, margin + labelWidth, y);
          y += lineHeight;
        });
        y += 1;
      } else {
        ensureSpace(lineHeight * 2);
        doc.setFont('helvetica', 'bold');
        doc.text(catLabel, margin, y);
        y += lineHeight;
        doc.setFont('helvetica', 'normal');
        const skillLines: string[] = doc.splitTextToSize(
          skillsStr,
          contentWidth - 10
        );
        for (const sLine of skillLines) {
          ensureSpace(lineHeight);
          doc.text(sLine, margin + 10, y);
          y += lineHeight;
        }
        y += 1;
      }
    }
    y += 2;
  }

  // 3. PROFESSIONAL EXPERIENCE (Max 3 concise bullets per role for strict 1-page fitting)
  if (resume.experience && resume.experience.length > 0) {
    drawSectionHeader('PROFESSIONAL EXPERIENCE');
    for (const exp of resume.experience) {
      const role = cleanField(exp.role);
      const company = cleanField(exp.company);
      const location = cleanField(exp.location);
      const leftHeader = `${role}${company ? ` — ${company}` : ''}${location ? ` (${location})` : ''}`;

      drawHeaderWithRightDate(leftHeader, exp.dates || '');
      for (const bullet of (exp.bullets || []).slice(0, 3)) {
        drawWrappedBullet(bullet);
      }
      y += 2.5;
    }
  }

  // 4. PROJECTS (Max 2 projects, max 2 bullets per project)
  if (resume.projects && resume.projects.length > 0) {
    drawSectionHeader('PROJECTS');
    for (const proj of resume.projects.slice(0, 2)) {
      const title = cleanField(proj.title);
      const techStack = cleanField(proj.techStack);
      const projHeader = `${title}${techStack ? ` | ${techStack}` : ''}`;

      drawHeaderWithRightDate(projHeader, proj.dates || '');
      for (const bullet of (proj.bullets || []).slice(0, 2)) {
        drawWrappedBullet(bullet);
      }
      y += 2.5;
    }
  }

  // 5. EDUCATION
  if (resume.education && resume.education.length > 0) {
    drawSectionHeader('EDUCATION');
    for (const edu of resume.education) {
      const degree = cleanField(edu.degree);
      const institution = cleanField(edu.institution);
      const eduHeader = `${degree}${institution ? ` — ${institution}` : ''}`;

      drawHeaderWithRightDate(eduHeader, edu.dates || '');

      const details = cleanField(edu.details);
      if (details) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        const detailLines: string[] = doc.splitTextToSize(
          details,
          contentWidth
        );
        for (const dLine of detailLines) {
          ensureSpace(lineHeight);
          doc.text(dLine, margin, y);
          y += lineHeight;
        }
      }
      y += 2.5;
    }
  }

  // 6. CERTIFICATIONS & ACHIEVEMENTS
  if (resume.certifications && resume.certifications.length > 0) {
    const cleanCerts = resume.certifications
      .map((c) => cleanField(c))
      .filter(Boolean);
    if (cleanCerts.length > 0) {
      drawSectionHeader('CERTIFICATIONS & ACHIEVEMENTS');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const certText = cleanCerts.join('  •  ');
      const certLines: string[] = doc.splitTextToSize(certText, contentWidth);
      for (const cLine of certLines) {
        ensureSpace(lineHeight);
        doc.text(cLine, margin, y);
        y += lineHeight;
      }
    }
  }

  return doc;
}

/**
 * Generates and downloads a real, text-searchable, single-column ATS-Safe PDF (.pdf) using jsPDF
 * with strict line-wrapping, 28pt (10mm) right-date width reservation, and 1-page fitting.
 */
export function downloadSuperAtsPdf(resume: SuperAtsResume): void {
  const fullName =
    cleanField(resume?.contactHeader?.fullName) || 'CANDIDATE NAME';
  const doc = createSuperAtsPdfDocument(resume);
  const fileName = `${sanitizeFilename(fullName)}_Super_ATS_Resume.pdf`;
  doc.save(fileName);
}
