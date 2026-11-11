import type { AtsAnalysisResponse } from '../types/ats';

export const SAMPLE_NON_ATS_FILENAME = 'Sample_Non_ATS_CV.pdf';

export const SAMPLE_WEAK_CV_TEXT = `======================================================================
   ALEXANDER J. MERCER  |  Passionate Coding Ninja & Web Enthusiast
   San Francisco Bay Area   ||   alex.mercer.dev@email.com
   Cell: (415) 891-4420     ||   linkedin.com/in/alexmercer-dev
======================================================================

[ ABOUT ME & CAREER OBJECTIVE ]
Hard-working, detail-oriented developer looking for a challenging role where I can grow my skills and contribute to a great team. I have worked on multiple web apps and enjoy solving problems with modern tools.

----------------------------------------------------------------------
| MY TOOLBOX (Column 1)          | RATING / LEVEL (Column 2)         |
| React, JS, HTML/CSS            | ***** (5/5 Stars)                 |
| Node, Express, Mongo           | ****  (4/5 Stars)                 |
| Git, Docker, AWS               | ***   (3/5 Stars)                 |
----------------------------------------------------------------------

[ WHERE I'VE BEEN (WORK HISTORY) ]

Senior Frontend / Fullstack Developer @ FinStream Technologies
Dates: Summer 2022 - Current  |  San Francisco, CA
* Worked on building the frontend of the customer billing web app and fixed bugs.
* Responsible for migrating legacy pages over to React and helping junior devs with code reviews.
* Helped the backend team with API endpoints and database queries when traffic got slow.
* Attended daily standups and worked closely with product managers on sprint tickets.

Software Developer @ BrightPath Digital Agency
Dates: 2020 to Mid 2022  |  Oakland, CA
* Built client websites and internal dashboards using JavaScript and React.
* Tasked with maintaining existing REST APIs and handling customer support bug reports.
* Participated in deployment tasks and updated server configurations.

[ COOL STUFF I BUILT ]
- CryptoTracker Dashboard (2022): Made a web app that shows live coin prices using React and an external API.
- TaskFlow App (2021): Created a kanban board app with Node.js and MongoDB for team task tracking.

[ ACADEMIC BACKGROUND ]
B.S. in Computer Science — University of California, Davis (Graduated Spring 2020)
`;

export const SAMPLE_PRECOMPUTED_ANALYSIS: AtsAnalysisResponse = {
  fileMetadata: {
    detectedCandidateName: 'Alexander J. Mercer',
    inferredTargetRole: 'Senior Full-Stack Software Engineer',
    isAtsFriendly: false
  },
  audit: {
    overallScore: 58,
    passStatus: 'High Risk (Fails Strict ATS Filters)',
    executiveSummary:
      'Detected Target Role: Senior Full-Stack Software Engineer. Your uploaded CV contains strong engineering history, but fails automated Workday and Taleo screening due to multi-column ASCII skill tables, non-standard section headers, and unquantified passive bullet points.',
    categories: [
      {
        id: 'parseability',
        name: 'Parseability & File Formatting',
        score: 60,
        weight: 25,
        status: 'Needs Fix',
        feedback:
          'Multi-column table layout in skills, star rating graphics (*****), and seasonal dates ("Summer 2022", "Mid 2022") break chronological tokenization.'
      },
      {
        id: 'structure',
        name: 'Section Structure & Completeness',
        score: 74,
        weight: 25,
        status: 'Needs Fix',
        feedback:
          'Essential sections exist, but creative labels ("[ WHERE I\'VE BEEN ]", "[ MY TOOLBOX ]", "[ COOL STUFF I BUILT ]") fail standard ATS section mapping.'
      },
      {
        id: 'keywords',
        name: 'Keywords & Technical Taxonomy',
        score: 52,
        weight: 25,
        status: 'Failing',
        feedback:
          'Missing 9 core Senior Full-Stack taxonomy keywords (TypeScript, Next.js, PostgreSQL, CI/CD, Redis, GraphQL, Kubernetes) and uses informal shorthand ("JS", "Mongo").'
      },
      {
        id: 'impact',
        name: 'Impact & Quantification',
        score: 45,
        weight: 25,
        status: 'Failing',
        feedback:
          '100% of experience bullets open with weak passive phrasing ("Worked on", "Responsible for", "Helped", "Tasked with") with zero measurable metrics.'
      }
    ],
    problems: [
      {
        id: 'prob-1',
        severity: 'CRITICAL BLOCKER',
        category: 'Parseability & Formatting',
        detectedInUploadedCv:
          '| MY TOOLBOX (Column 1) | RATING / LEVEL (Column 2) | ***** (5/5 Stars) |',
        whyNotAtsFriendly:
          'Workday, Taleo, and iCIMS read multi-column pipe tables left-to-right across the row, scrambling skill names with arbitrary star ratings ("*****") and discarding the block.',
        howToFix:
          'Remove all tables, columns, and star ratings; replace with a single-column categorized TECHNICAL SKILLS block using standard comma separation.'
      },
      {
        id: 'prob-2',
        severity: 'CRITICAL BLOCKER',
        category: 'Impact & Quantification',
        detectedInUploadedCv:
          'Worked on building the frontend of the customer billing web app and fixed bugs.',
        whyNotAtsFriendly:
          'Opens with passive filler ("Worked on") and lacks technical stack specificity or measurable outcomes, scoring near zero on semantic impact ranking.',
        howToFix:
          'Rewrite using the Google XYZ formula: "Architected modular customer billing workflows in React and TypeScript, reducing checkout error rates by [38%] and accelerating page load speed by [1.4s]."'
      },
      {
        id: 'prob-3',
        severity: 'CRITICAL BLOCKER',
        category: 'Keywords & Skill Taxonomy',
        detectedInUploadedCv: 'React, JS, HTML/CSS | Node, Express, Mongo',
        whyNotAtsFriendly:
          'Uses colloquial shorthand ("JS", "Mongo") without canonical terms ("JavaScript (ES6+)", "MongoDB") and omits core Senior Full-Stack keywords (TypeScript, PostgreSQL, CI/CD).',
        howToFix:
          'Pair canonical full terms with acronyms and inject core domain keywords (TypeScript, Next.js, PostgreSQL, Redis, REST APIs, CI/CD).'
      },
      {
        id: 'prob-4',
        severity: 'MAJOR ISSUE',
        category: 'Section Structure & Completeness',
        detectedInUploadedCv:
          '[ WHERE I\'VE BEEN (WORK HISTORY) ] & [ COOL STUFF I BUILT ]',
        whyNotAtsFriendly:
          'Enterprise ATS parsers rely on strict lexical dictionaries to map sections. Non-standard headers cause your work history to be dumped into unstructured notes.',
        howToFix:
          'Standardize headers strictly to canonical ATS taxonomy: PROFESSIONAL SUMMARY, TECHNICAL SKILLS, PROFESSIONAL EXPERIENCE, PROJECTS, EDUCATION.'
      },
      {
        id: 'prob-5',
        severity: 'MAJOR ISSUE',
        category: 'Parseability & Formatting',
        detectedInUploadedCv:
          'Dates: Summer 2022 - Current | Dates: 2020 to Mid 2022',
        whyNotAtsFriendly:
          'Parsers cannot compute exact Years-of-Experience (YoE) tenure from seasonal modifiers ("Summer", "Mid"), often defaulting role duration to 0 months.',
        howToFix:
          'Standardize all employment and education dates to strict "MMM YYYY – MMM YYYY" or "MMM YYYY – Present" format (e.g., "Jun 2022 – Present").'
      },
      {
        id: 'prob-6',
        severity: 'MAJOR ISSUE',
        category: 'Impact & Quantification',
        detectedInUploadedCv:
          'Responsible for migrating legacy pages over to React and helping junior devs with code reviews.',
        whyNotAtsFriendly:
          '"Responsible for" describes a job description rather than an accomplishment, hiding leadership impact and architectural scale from ranking algorithms.',
        howToFix:
          'Convert to quantified XYZ statement: "Spearheaded migration of [28+] legacy views to React 18 and TypeScript while mentoring [5] engineers via PR reviews, cutting release regressions by [42%]."'
      },
      {
        id: 'prob-7',
        severity: 'MINOR TWEAK',
        category: 'Section Structure & Completeness',
        detectedInUploadedCv: 'Passionate Coding Ninja & Web Enthusiast',
        whyNotAtsFriendly:
          'Informal buzzword titles ("Coding Ninja") fail recruiter boolean title searches for "Senior Full-Stack Software Engineer".',
        howToFix:
          'Replace headline with canonical target role title: "Senior Full-Stack Software Engineer".'
      }
    ],
    detectedKeywords: [
      'React',
      'JavaScript',
      'Node.js',
      'Express.js',
      'MongoDB',
      'REST APIs',
      'Docker',
      'AWS',
      'Git'
    ],
    missingRecommendedKeywords: [
      'TypeScript',
      'Next.js',
      'PostgreSQL',
      'Redis',
      'GraphQL',
      'CI/CD',
      'Kubernetes',
      'Performance Optimization',
      'Playwright',
      'Agile/Scrum'
    ]
  },
  superAtsResume: {
    newAtsScore: 96,
    fixesApplied: [
      'Converted 7 weak passive job duties ("Worked on", "Responsible for", "Helped") into quantified Google XYZ impact bullets.',
      'Eliminated the 2-column ASCII pipe table and star ratings; rebuilt into a single-column categorized Technical Skills taxonomy.',
      'Standardized all section headings to canonical Workday/Taleo headers (PROFESSIONAL SUMMARY, TECHNICAL SKILLS, PROFESSIONAL EXPERIENCE, PROJECTS, EDUCATION).',
      'Normalized vague seasonal dates ("Summer 2022", "Mid 2022") into strict MMM YYYY – MMM YYYY chronological format.',
      'Grouped skills into structured domain clusters and injected 10 missing Senior Full-Stack keywords.'
    ],
    contactHeader: {
      fullName: 'ALEXANDER J. MERCER',
      professionalTitle: 'Senior Full-Stack Software Engineer',
      location: 'San Francisco, CA',
      email: 'alex.mercer.dev@email.com',
      phone: '(415) 891-4420',
      links: ['linkedin.com/in/alexmercer-dev', 'github.com/alexmercer-dev']
    },
    professionalSummary:
      'Senior Full-Stack Software Engineer with [4+ years] of experience architecting scalable cloud-native web applications, distributed REST and GraphQL APIs, and responsive frontend systems using React, TypeScript, Next.js, and Node.js. Proven track record of driving Performance Optimization, automated CI/CD delivery on AWS, and PostgreSQL/Redis data layer tuning to cut system latency by [40%] and elevate engineering velocity in Agile/Scrum environments.',
    technicalSkills: [
      {
        category: 'Languages',
        skills: [
          'TypeScript',
          'JavaScript (ES6+)',
          'SQL (PostgreSQL)',
          'HTML5',
          'CSS3',
          'Bash'
        ]
      },
      {
        category: 'Frameworks & Libraries',
        skills: [
          'React 18',
          'Next.js',
          'Node.js',
          'Express.js',
          'Tailwind CSS',
          'GraphQL',
          'REST APIs',
          'Jest & Playwright'
        ]
      },
      {
        category: 'Developer Tools & Cloud',
        skills: [
          'AWS (EC2, S3, RDS, Lambda)',
          'Docker',
          'Kubernetes',
          'PostgreSQL',
          'MongoDB',
          'Redis Caching',
          'CI/CD (GitHub Actions)',
          'Git'
        ]
      },
      {
        category: 'Core Competencies',
        skills: [
          'System Design',
          'Microservices Architecture',
          'Performance Optimization',
          'Agile/Scrum'
        ]
      }
    ],
    experience: [
      {
        role: 'Senior Full-Stack Software Engineer',
        company: 'FinStream Technologies',
        location: 'San Francisco, CA',
        dates: 'Jun 2022 – Present',
        bullets: [
          'Architected and scaled the core customer billing web application using React, TypeScript, and Next.js, increasing checkout completion rates by [34%] and reducing client-side error incidence by [48%].',
          'Spearheaded the migration of [28+] legacy monolithic views into modular React and TypeScript micro-frontends while mentoring [5] engineers via structured code reviews, cutting release regressions by [42%].',
          'Optimized high-throughput Node.js, GraphQL, and REST APIs backed by PostgreSQL and Redis caching, decreasing p95 query latency by [62%] during peak billing cycles of [120,000+ daily requests].'
        ]
      },
      {
        role: 'Full-Stack Software Engineer',
        company: 'BrightPath Digital Agency',
        location: 'Oakland, CA',
        dates: 'May 2020 – May 2022',
        bullets: [
          'Engineered [14+] production web portals and real-time analytics dashboards using React, JavaScript (ES6+), and REST APIs, improving average client Core Web Vitals scores by [39%].',
          'Refactored legacy Node.js and Express.js backend services with automated unit testing and structured error handling, reducing customer-reported production defects by [55%].',
          'Automated containerized application deployments using Docker, AWS, and GitHub Actions CI/CD workflows, cutting manual release overhead by [6 hours/week].'
        ]
      }
    ],
    projects: [
      {
        title: 'CryptoTracker Real-Time Telemetry Platform',
        techStack: 'React, TypeScript, Node.js, WebSockets, Redis, REST APIs',
        dates: 'Oct 2022',
        bullets: [
          'Engineered a low-latency market telemetry dashboard streaming live pricing across [250+ digital assets], achieving sub-[150ms] UI update rendering via WebSocket throttling and memoized state selectors.'
        ]
      },
      {
        title: 'TaskFlow Collaborative Workflow Engine',
        techStack: 'React, Node.js, Express.js, MongoDB, Docker, JWT Auth',
        dates: 'Nov 2021',
        bullets: [
          'Built a multi-tenant Kanban task orchestration platform supporting real-time drag-and-drop state synchronization and role-based access control for [500+ concurrent test users].'
        ]
      }
    ],
    education: [
      {
        degree: 'Bachelor of Science in Computer Science',
        institution: 'University of California, Davis',
        dates: 'Sep 2016 – Jun 2020',
        details:
          'Relevant Coursework: Data Structures & Algorithms, Distributed Systems, Database Systems, Operating Systems'
      }
    ],
    certifications: [
      'AWS Certified Developer – Associate',
      'Meta Front-End Developer Professional Certificate'
    ]
  }
};
