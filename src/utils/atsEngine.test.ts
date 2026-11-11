import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getScoreTier,
  getCategoryBadge,
  calculateWeightedAtsScore,
  filterProblems,
  extractBracketedPlaceholders,
  replacePlaceholderInResume,
  injectMissingKeywordIntoState,
  resumeToPlainText,
  evaluateCalibratedRubric,
  computeDeterministicAnalysis,
  calibrateAnalysisResponse
} from './atsEngine';
import {
  SAMPLE_PRECOMPUTED_ANALYSIS,
  SAMPLE_WEAK_CV_TEXT
} from './sampleData';

test('getScoreTier maps scores to exact 4 Master Specification pass thresholds', () => {
  assert.equal(getScoreTier(92).label, 'Optimal (Guaranteed ATS Pass)');
  assert.equal(getScoreTier(85).label, 'Optimal (Guaranteed ATS Pass)');
  assert.equal(getScoreTier(76).label, 'Good to Pass (Minor Fixes Needed)');
  assert.equal(getScoreTier(58).label, 'High Risk (Fails Strict ATS Filters)');
  assert.equal(getScoreTier(42).label, 'Critical Failure (Not ATS Friendly)');
});

test('getCategoryBadge returns GOOD TO PASS, NEEDS FIX, and FAILING badges accurately', () => {
  assert.equal(getCategoryBadge(82).badge, 'GOOD TO PASS');
  assert.equal(getCategoryBadge(65).badge, 'NEEDS FIX');
  assert.equal(getCategoryBadge(48).badge, 'FAILING');
});

test('evaluateCalibratedRubric never gives a normal CV a bogus 32% score and scores it realistically (58%-84%)', () => {
  const normalReadableCv = `
    DAVID KIM
    San Jose, CA | (408) 555-0199 | david.kim@email.com | linkedin.com/in/davidkim
    Summary
    Full-Stack Developer with 3 years of experience building web applications.
    Skills
    React, TypeScript, JavaScript, Node.js, PostgreSQL, Docker, AWS, Git, REST APIs, Python
    Experience
    Software Engineer @ CloudScale Inc (Jan 2022 - Present)
    - Built customer dashboard pages using React and TypeScript.
    - Responsible for backend REST APIs and PostgreSQL queries.
    Education
    B.S. in Computer Science — San Jose State University (2018 - 2022)
  `;
  const rubric = evaluateCalibratedRubric(normalReadableCv);
  assert.equal(
    rubric.overallScore >= 60 && rubric.overallScore <= 88,
    true,
    `Expected score between 60 and 88, got ${rubric.overallScore}`
  );
  assert.equal(rubric.hasContactEmail, true);
  assert.equal(rubric.detectedSections.includes('Experience'), true);
  assert.equal(rubric.detectedSections.includes('Education'), true);
});

test('re-scanning a generated Super-ATS Resume verifies a 95%+ score', () => {
  const generatedText = resumeToPlainText(
    SAMPLE_PRECOMPUTED_ANALYSIS.superAtsResume
  );
  const rescanAnalysis = computeDeterministicAnalysis(
    generatedText,
    'Super_ATS_Verified.pdf'
  );
  assert.equal(
    rescanAnalysis.audit.overallScore >= 95,
    true,
    `Expected re-scanned Super-ATS score >= 95, got ${rescanAnalysis.audit.overallScore}`
  );
  assert.equal(rescanAnalysis.fileMetadata.isAtsFriendly, true);
});

test('computeDeterministicAnalysis preserves real candidate name, email, companies, and education from custom CV', () => {
  const customCv = `
    ELENA ROSTOVA
    Seattle, WA | (206) 555-0144 | elena.rostova@devmail.io | github.com/erostova
    EXPERIENCE
    Backend Software Engineer @ Nimbus Payments
    Dates: Mar 2021 - Present | Seattle, WA
    * Worked on payment settlement microservices using Node.js, TypeScript, PostgreSQL, and Redis.
    * Helped reduce transaction failures and maintained Docker containers on AWS.
    EDUCATION
    M.S. in Computer Science — University of Washington | 2019 - 2021
  `;
  const analysis = computeDeterministicAnalysis(customCv, 'elena_cv.pdf');
  assert.equal(analysis.fileMetadata.detectedCandidateName, 'ELENA ROSTOVA');
  assert.equal(
    analysis.superAtsResume.contactHeader.email,
    'elena.rostova@devmail.io'
  );
  assert.equal(
    analysis.superAtsResume.experience[0].company.includes('Nimbus Payments'),
    true
  );
  assert.equal(
    analysis.superAtsResume.education[0].institution.includes(
      'University of Washington'
    ),
    true
  );
  assert.equal(analysis.superAtsResume.newAtsScore >= 95, true);
});

test('calibrateAnalysisResponse prevents uncalibrated low 32% AI score on a valid CV', () => {
  const validCv = SAMPLE_WEAK_CV_TEXT;
  const bogusAiResponse = {
    ...SAMPLE_PRECOMPUTED_ANALYSIS,
    audit: {
      ...SAMPLE_PRECOMPUTED_ANALYSIS.audit,
      overallScore: 32
    }
  };
  const calibrated = calibrateAnalysisResponse(
    bogusAiResponse,
    validCv,
    'resume.pdf'
  );
  assert.equal(
    calibrated.audit.overallScore >= 58,
    true,
    `Expected calibrated score >= 58, got ${calibrated.audit.overallScore}`
  );
});

test('filterProblems and placeholder replacement work accurately', () => {
  const problems = SAMPLE_PRECOMPUTED_ANALYSIS.audit.problems;
  assert.equal(filterProblems(problems, 'All Issues').length, problems.length);

  const placeholders = extractBracketedPlaceholders(
    SAMPLE_PRECOMPUTED_ANALYSIS.superAtsResume
  );
  const firstToken = placeholders[0].token;
  const updated = replacePlaceholderInResume(
    SAMPLE_PRECOMPUTED_ANALYSIS.superAtsResume,
    firstToken,
    '7+ years'
  );
  assert.equal(updated.professionalSummary.includes('7+ years'), true);

  const injected = injectMissingKeywordIntoState(
    SAMPLE_PRECOMPUTED_ANALYSIS,
    'TypeScript'
  );
  assert.equal(injected.audit.detectedKeywords.includes('TypeScript'), true);
  assert.equal(
    calculateWeightedAtsScore(SAMPLE_PRECOMPUTED_ANALYSIS.audit.categories),
    58
  );
  assert.equal(
    SAMPLE_PRECOMPUTED_ANALYSIS.superAtsResume.technicalSkills[0].category,
    'Languages'
  );
});

test('cleanUploadedResumeText strips all HTML tags and computeDeterministicAnalysis never emits hardcoded [32%] boilerplate', async () => {
  const { cleanUploadedResumeText } = await import('./fileExtractor');
  const htmlCv = `<!DOCTYPE html>
  <html>
  <head><style>body { font-family: Arial; }</style><script>console.log(1);</script></head>
  <body>
    <h1>SOPHIA CHEN</h1>
    <div class="contact">New York, NY | (212) 555-0188 | sophia.chen@email.com | linkedin.com/in/sophiachen</div>
    <h2>PROFESSIONAL SUMMARY</h2>
    <p>Senior Engineer with <strong>6 years</strong> of experience building distributed web applications.</p>
    <h2>TECHNICAL SKILLS</h2>
    <p><strong>Languages:</strong> TypeScript, Python, Go, SQL</p>
    <h2>PROFESSIONAL EXPERIENCE</h2>
    <p>Lead Software Engineer @ Vertex Cloud | Jan 2021 - Present</p>
    <ul>
      <li>Worked on high-throughput payment microservices using TypeScript, Node.js, and PostgreSQL.</li>
      <li>Responsible for automating Kubernetes deployments and CI/CD pipelines on AWS.</li>
    </ul>
    <h2>EDUCATION</h2>
    <p>B.S. in Computer Science — Columbia University | 2016 - 2020</p>
  </body>
  </html>`;

  const cleaned = cleanUploadedResumeText(htmlCv);
  assert.equal(/<[^>]+>/.test(cleaned), false, 'Expected zero HTML tags in cleaned output');
  assert.equal(cleaned.includes('• Worked on high-throughput payment microservices'), true);

  const analysis = computeDeterministicAnalysis(htmlCv, 'sophia_chen.doc');
  const serialized = resumeToPlainText(analysis.superAtsResume);

  assert.equal(/<[^>]+>/.test(serialized), false, 'Expected zero HTML tags in rebuilt resume');
  assert.equal(
    serialized.includes('Architected and executed'),
    false,
    'Expected zero hardcoded Architected and executed strings'
  );
  assert.equal(
    serialized.includes('improving performance efficiency by [32%]'),
    false,
    'Expected zero hardcoded [32%] strings'
  );
  assert.equal(
    serialized.includes('reducing turnaround latency by [25%]'),
    false,
    'Expected zero hardcoded [25%] strings'
  );
  assert.equal(
    analysis.superAtsResume.experience[0].bullets.some((b) =>
      /PROFESSIONAL SUMMARY|TECHNICAL SKILLS|Languages:/i.test(b)
    ),
    false,
    'Section headings and skill categories must never be turned into bullets'
  );
});

test('Phase 1.3 & 3.2 & 4.2: rejects DOCTYPE/CSS font names for candidate name, infers name from email/LinkedIn, enforces 4 skill categories, max 3 bullets per role, and strict 1-page PDF fitting', async () => {
  const { createSuperAtsPdfDocument } = await import('./documentExporter');
  const noisyTopCv = `
    <!DOCTYPE html>
    font-family: Calibri, Arial, sans-serif;
    Resume Page 1
    Austin, TX | (512) 555-0192 | liam.oconnor@cloudops.io | linkedin.com/in/liam-oconnor
    PROFESSIONAL EXPERIENCE
    Senior Cloud Engineer @ Horizon Systems (Jan 2021 - Present)
    * Worked on automating AWS infrastructure with Terraform and Kubernetes.
    * Responsible for building CI/CD pipelines in GitHub Actions.
    * Helped optimize PostgreSQL and Redis cluster latency.
    * Assisted with monitoring dashboards in Grafana and Prometheus.
    * Participated in on-call incident response and security audits.
    EDUCATION
    B.S. in Computer Engineering — University of Texas at Austin | 2016 - 2020
  `;

  const analysis = computeDeterministicAnalysis(noisyTopCv, 'resume_final.pdf');
  assert.equal(
    analysis.fileMetadata.detectedCandidateName,
    'Liam Oconnor',
    `Expected candidate name inferred from LinkedIn/email ("Liam Oconnor"), got "${analysis.fileMetadata.detectedCandidateName}"`
  );
  assert.equal(
    analysis.superAtsResume.experience[0].bullets.length <= 3,
    true,
    'Expected max 3 concise bullets per role'
  );
  assert.deepEqual(
    analysis.superAtsResume.technicalSkills.map((c) => c.category),
    [
      'Languages',
      'Frameworks & Libraries',
      'Developer Tools & Cloud',
      'Core Competencies'
    ]
  );

  // Verify strict 1-page fitting in jsPDF for both Sample Resume and Rebuilt Resume
  const samplePdfDoc = createSuperAtsPdfDocument(
    SAMPLE_PRECOMPUTED_ANALYSIS.superAtsResume
  );
  assert.equal(
    samplePdfDoc.getNumberOfPages(),
    1,
    `Expected Sample Super-ATS PDF to fit strictly on 1 page, got ${samplePdfDoc.getNumberOfPages()} pages`
  );

  const customPdfDoc = createSuperAtsPdfDocument(analysis.superAtsResume);
  assert.equal(
    customPdfDoc.getNumberOfPages(),
    1,
    `Expected Rebuilt Super-ATS PDF to fit strictly on 1 page, got ${customPdfDoc.getNumberOfPages()} pages`
  );
});

