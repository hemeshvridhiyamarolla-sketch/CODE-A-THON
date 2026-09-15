/**
 * HIREMIND AI - Front-end Controller & Interactive Visualizer
 */

document.addEventListener('DOMContentLoaded', () => {
  // ================================================================
  // DOM ELEMENT REFERENCES
  // ================================================================
  
  // Navigation & Mode Tabs
  const modeTabs = document.querySelectorAll('.mode-tab');
  const candidateModeSection = document.getElementById('candidateModeSection');
  const recruiterModeSection = document.getElementById('recruiterModeSection');
  const quickDemoBtn = document.getElementById('quickDemoBtn');
  const aiStatusPill = document.getElementById('aiStatusPill');
  const aiStatusText = document.getElementById('aiStatusText');

  // Candidate Mode Inputs
  const resumeDropzone = document.getElementById('resumeDropzone');
  const resumeFileInput = document.getElementById('resumeFileInput');
  const filePreviewContainer = document.getElementById('filePreviewContainer');
  const previewFileName = document.getElementById('previewFileName');
  const previewFileSize = document.getElementById('previewFileSize');
  const removeFileBtn = document.getElementById('removeFileBtn');
  const togglePasteResumeBtn = document.getElementById('togglePasteResumeBtn');
  const pasteResumeContainer = document.getElementById('pasteResumeContainer');
  const pastedResumeText = document.getElementById('pastedResumeText');

  const jobDescriptionInput = document.getElementById('jobDescriptionInput');
  const jobCharCount = document.getElementById('jobCharCount');
  const sampleJobPython = document.getElementById('sampleJobPython');

  // Action Buttons & Loaders
  const analyzeBtn = document.getElementById('analyzeBtn');
  const loadDemoBtn = document.getElementById('loadDemoBtn');
  const analysisLoading = document.getElementById('analysisLoading');
  const loadingStatusStep = document.getElementById('loadingStatusStep');
  const loadingProgressBar = document.getElementById('loadingProgressBar');
  const notificationBanner = document.getElementById('notificationBanner');
  const notificationMessage = document.getElementById('notificationMessage');
  const closeNotificationBtn = document.getElementById('closeNotificationBtn');

  // Results Dashboard Elements
  const resultsDashboard = document.getElementById('resultsDashboard');
  const resCandidateName = document.getElementById('resCandidateName');
  const resJobTitle = document.getElementById('resJobTitle');
  const resEngineBadge = document.getElementById('resEngineBadge');
  const printReportBtn = document.getElementById('printReportBtn');

  const overallScoreCircle = document.getElementById('overallScoreCircle');
  const overallScoreValue = document.getElementById('overallScoreValue');
  const matchLabelBadge = document.getElementById('matchLabelBadge');
  const scoringFormulaCaption = document.getElementById('scoringFormulaCaption');

  const skillsScoreVal = document.getElementById('skillsScoreVal');
  const skillsMeterBar = document.getElementById('skillsMeterBar');
  const expScoreVal = document.getElementById('expScoreVal');
  const expMeterBar = document.getElementById('expMeterBar');
  const eduScoreVal = document.getElementById('eduScoreVal');
  const eduMeterBar = document.getElementById('eduMeterBar');
  const relevanceScoreVal = document.getElementById('relevanceScoreVal');
  const relevanceMeterBar = document.getElementById('relevanceMeterBar');

  const atsScoreValue = document.getElementById('atsScoreValue');
  const atsVerdictText = document.getElementById('atsVerdictText');
  const aiSummaryText = document.getElementById('aiSummaryText');

  const matchingSkillsContainer = document.getElementById('matchingSkillsContainer');
  const missingSkillsContainer = document.getElementById('missingSkillsContainer');
  const strengthsList = document.getElementById('strengthsList');
  const skillGapTableContainer = document.getElementById('skillGapTableContainer');
  const roadmapContainer = document.getElementById('roadmapContainer');

  const atsStrengthsList = document.getElementById('atsStrengthsList');
  const atsImprovementsList = document.getElementById('atsImprovementsList');

  const interviewTabs = document.querySelectorAll('.interview-tab');
  const interviewQuestionsContainer = document.getElementById('interviewQuestionsContainer');
  const refreshInterviewBtn = document.getElementById('refreshInterviewBtn');

  // Recruiter Mode Elements
  const recruiterJobInput = document.getElementById('recruiterJobInput');
  const recruiterDropzone = document.getElementById('recruiterDropzone');
  const recruiterFilesInput = document.getElementById('recruiterFilesInput');
  const recruiterFileCountNotice = document.getElementById('recruiterFileCountNotice');
  const runRecruiterBatchBtn = document.getElementById('runRecruiterBatchBtn');
  const loadRecruiterDemoBtn = document.getElementById('loadRecruiterDemoBtn');
  const recruiterLoading = document.getElementById('recruiterLoading');
  const recruiterResultsContainer = document.getElementById('recruiterResultsContainer');
  const totalRankedCount = document.getElementById('totalRankedCount');
  const recruiterLeaderboardBody = document.getElementById('recruiterLeaderboardBody');

  // Global State
  let selectedFile = null;
  let currentAnalysisData = null;
  let activeInterviewCategory = 'technical';

  // ================================================================
  // INITIALIZATION & HEALTH CHECK
  // ================================================================
  checkSystemHealth();

  async function checkSystemHealth() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        if (data.live_ai_available) {
          aiStatusText.textContent = `Live AI (${data.provider})`;
          aiStatusPill.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        } else {
          aiStatusText.textContent = 'Demo Engine Ready';
          aiStatusPill.style.borderColor = 'rgba(6, 182, 212, 0.4)';
        }
      }
    } catch (e) {
      aiStatusText.textContent = 'Offline (Demo Mode)';
    }
  }

  // ================================================================
  // TAB NAVIGATION
  // ================================================================
  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      modeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.dataset.tab;
      if (target === 'candidate-mode') {
        candidateModeSection.classList.add('active');
        recruiterModeSection.classList.remove('active');
      } else {
        candidateModeSection.classList.remove('active');
        recruiterModeSection.classList.add('active');
      }
    });
  });

  // ================================================================
  // DRAG & DROP AND FILE UPLOAD
  // ================================================================
  resumeDropzone.addEventListener('click', () => resumeFileInput.click());

  ['dragenter', 'dragover'].forEach(eventName => {
    resumeDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      resumeDropzone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    resumeDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      resumeDropzone.classList.remove('drag-over');
    });
  });

  resumeDropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelected(files[0]);
    }
  });

  resumeFileInput.addEventListener('change', () => {
    if (resumeFileInput.files && resumeFileInput.files.length > 0) {
      handleFileSelected(resumeFileInput.files[0]);
    }
  });

  function handleFileSelected(file) {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const validExts = ['.pdf', '.docx', '.txt'];
    if (!validExts.includes(ext)) {
      showNotification('Please upload a PDF (.pdf), Word (.docx), or text (.txt) file.');
      return;
    }

    selectedFile = file;
    previewFileName.textContent = file.name;
    previewFileSize.textContent = formatBytes(file.size);

    resumeDropzone.classList.add('hidden');
    filePreviewContainer.classList.remove('hidden');
    hideNotification();
  }

  removeFileBtn.addEventListener('click', () => {
    selectedFile = null;
    resumeFileInput.value = '';
    filePreviewContainer.classList.add('hidden');
    resumeDropzone.classList.remove('hidden');
  });

  // Toggle Paste Resume Text Area
  togglePasteResumeBtn.addEventListener('click', () => {
    const isHidden = pasteResumeContainer.classList.contains('hidden');
    if (isHidden) {
      pasteResumeContainer.classList.remove('hidden');
      togglePasteResumeBtn.textContent = 'hide paste box';
    } else {
      pasteResumeContainer.classList.add('hidden');
      togglePasteResumeBtn.textContent = 'or paste text';
    }
  });

  // Job Description Character Counter
  jobDescriptionInput.addEventListener('input', () => {
    const len = jobDescriptionInput.value.length;
    jobCharCount.textContent = `${len.toLocaleString()} characters`;
  });

  // Sample Job Button
  sampleJobPython.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/demo-data');
      if (res.ok) {
        const data = await res.json();
        jobDescriptionInput.value = data.job_description;
        jobCharCount.textContent = `${data.job_description.length.toLocaleString()} characters`;
      }
    } catch (e) {
      showNotification('Could not load sample job description.');
    }
  });

  // ================================================================
  // QUICK DEMO & TEST RUN HANDLERS
  // ================================================================
  quickDemoBtn.addEventListener('click', () => runDemoMode(true));
  loadDemoBtn.addEventListener('click', () => runDemoMode(false));

  async function runDemoMode(autoScroll = true) {
    hideNotification();
    try {
      const res = await fetch('/api/demo-data');
      if (res.ok) {
        const data = await res.json();
        // Populate form inputs
        pastedResumeText.value = data.resume_text;
        pasteResumeContainer.classList.remove('hidden');
        togglePasteResumeBtn.textContent = 'hide paste box';

        jobDescriptionInput.value = data.job_description;
        jobCharCount.textContent = `${data.job_description.length.toLocaleString()} characters`;

        // Execute analysis with force_demo
        await executeAnalysis(true, autoScroll);
      }
    } catch (e) {
      showNotification('Unable to initialize demo data.');
    }
  }

  // ================================================================
  // MAIN ANALYZE ACTION
  // ================================================================
  analyzeBtn.addEventListener('click', () => executeAnalysis(false, true));

  async function executeAnalysis(forceDemo = false, autoScroll = true) {
    hideNotification();

    const jobText = jobDescriptionInput.value.trim();
    const resumePasted = pastedResumeText.value.trim();

    if (!selectedFile && !resumePasted) {
      showNotification('Please upload a resume file (PDF/DOCX) or paste candidate text.');
      return;
    }

    if (!jobText) {
      showNotification('Please provide a target job description to match against.');
      return;
    }

    // Build Form Data
    const formData = new FormData();
    formData.append('job_description', jobText);
    formData.append('force_demo', forceDemo ? 'true' : 'false');

    if (selectedFile) {
      formData.append('resume_file', selectedFile);
    } else {
      formData.append('resume_text', resumePasted);
    }

    // Show animated agentic loader
    showLoadingProgress();

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to complete resume analysis.');
      }

      // Complete progress and render
      stopLoadingProgress();
      currentAnalysisData = result.data;
      renderAnalysisResults(result.data);

      if (autoScroll) {
        setTimeout(() => {
          resultsDashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }

    } catch (err) {
      stopLoadingProgress();
      showNotification(err.message || 'Analysis error occurred. You can click "Load Demo" for instant demonstration.');
    }
  }

  // ================================================================
  // PROGRESS ANIMATION ENGINE
  // ================================================================
  let progressInterval = null;

  function showLoadingProgress() {
    resultsDashboard.classList.add('hidden');
    analysisLoading.classList.remove('hidden');
    analyzeBtn.disabled = true;
    loadDemoBtn.disabled = true;

    const steps = [
      { pct: 15, text: "Parsing document structure & extracting verified competencies..." },
      { pct: 40, text: "Cross-referencing candidate projects against role requirements..." },
      { pct: 68, text: "Synthesizing semantic fit & calculating calibrated match scores..." },
      { pct: 88, text: "Generating personalized career roadmap & interview prep..." },
      { pct: 95, text: "Finalizing recruiter dossier & ATS compatibility audit..." }
    ];

    let currentStepIdx = 0;
    loadingProgressBar.style.width = '10%';
    loadingStatusStep.textContent = steps[0].text;

    progressInterval = setInterval(() => {
      if (currentStepIdx < steps.length) {
        loadingProgressBar.style.width = `${steps[currentStepIdx].pct}%`;
        loadingStatusStep.textContent = steps[currentStepIdx].text;
        currentStepIdx++;
      }
    }, 450);
  }

  function stopLoadingProgress() {
    clearInterval(progressInterval);
    loadingProgressBar.style.width = '100%';
    setTimeout(() => {
      analysisLoading.classList.add('hidden');
      analyzeBtn.disabled = false;
      loadDemoBtn.disabled = false;
    }, 300);
  }

  // ================================================================
  // RENDER RESULTS DASHBOARD
  // ================================================================
  function renderAnalysisResults(data) {
    resultsDashboard.classList.remove('hidden');

    // Header Dossier Badges
    const candidateName = data.resume_metadata?.filename || "Alex Morgan (Demo Candidate)";
    resCandidateName.textContent = `Candidate: ${candidateName}`;
    resEngineBadge.textContent = data.is_demo_mode ? "Engine: Demo Fallback" : `Engine: ${data.provider_used || 'Live AI'}`;

    // Overall Score & Circular SVG Gauge
    const score = data.overall_match_score || 0;
    animateCircularScore(score);

    // Match Label & Badges
    const label = data.match_label || getMatchLabel(score);
    matchLabelBadge.textContent = label;
    matchLabelBadge.className = 'match-badge ' + getBadgeClass(score);

    if (data.scoring_formula) {
      scoringFormulaCaption.textContent = `Formula: ${data.scoring_formula}`;
    }

    // Dimension Meters
    animateMeterBar(skillsMeterBar, skillsScoreVal, data.skills_match_score || 0);
    animateMeterBar(expMeterBar, expScoreVal, data.experience_match_score || 0);
    animateMeterBar(eduMeterBar, eduScoreVal, data.education_match_score || 0);
    animateMeterBar(relevanceMeterBar, relevanceScoreVal, data.relevance_match_score || 0);

    // ATS Summary
    atsScoreValue.textContent = data.ats_score || 80;
    atsVerdictText.textContent = (data.ats_score >= 80) ? "ATS Optimized" : "Needs Optimization";

    // AI Reasoning Summary
    aiSummaryText.textContent = data.ai_summary || "Candidate demonstrates strong background alignment.";

    // Matching Skills
    matchingSkillsContainer.innerHTML = '';
    const matching = data.matching_skills || [];
    if (matching.length === 0) {
      matchingSkillsContainer.innerHTML = '<span class="hint-text">No direct technical skill matches identified.</span>';
    } else {
      matching.forEach(skill => {
        const tag = document.createElement('span');
        tag.className = 'skill-tag-match';
        tag.innerHTML = `✓ ${escapeHtml(skill)}`;
        matchingSkillsContainer.appendChild(tag);
      });
    }

    // Missing Skills / Gaps
    missingSkillsContainer.innerHTML = '';
    const missing = data.missing_skills || [];
    if (missing.length === 0) {
      missingSkillsContainer.innerHTML = '<span class="hint-text">No major skill deficiencies identified for this role!</span>';
    } else {
      missing.forEach(item => {
        const div = document.createElement('div');
        div.className = 'missing-skill-item';

        const priority = (item.priority || 'MEDIUM').toUpperCase();
        const pClass = priority === 'HIGH' ? 'priority-high' : (priority === 'LOW' ? 'priority-low' : 'priority-medium');

        div.innerHTML = `
          <div class="missing-skill-header">
            <span class="missing-skill-name">⚠ ${escapeHtml(item.skill)}</span>
            <span class="priority-badge ${pClass}">${escapeHtml(priority)} PRIORITY</span>
          </div>
          <p class="missing-skill-reason">${escapeHtml(item.reason || 'Required by target job specification.')}</p>
        `;
        missingSkillsContainer.appendChild(div);
      });
    }

    // Candidate Strengths
    strengthsList.innerHTML = '';
    const strengths = data.strengths || [];
    strengths.forEach(str => {
      const li = document.createElement('li');
      li.className = 'strength-item';
      li.innerHTML = `<span class="strength-bullet">★</span><span>${escapeHtml(str)}</span>`;
      strengthsList.appendChild(li);
    });

    // Skill Gap Visualizer
    renderSkillGapTable(data.skill_gap_analysis || []);

    // Career Roadmap
    renderCareerRoadmap(data.career_roadmap || []);

    // ATS Audit Lists
    renderBulletList(atsStrengthsList, data.ats_strengths || []);
    renderBulletList(atsImprovementsList, data.ats_improvements || []);

    // Interview Preparation
    renderInterviewQuestions(data.interview_questions || {});
  }

  // Circular Score Animation
  function animateCircularScore(targetScore) {
    let current = 0;
    overallScoreValue.textContent = '0%';
    overallScoreCircle.setAttribute('stroke-dasharray', '0, 100');

    const duration = 1200;
    const stepTime = 20;
    const increment = targetScore / (duration / stepTime);

    const timer = setInterval(() => {
      current += increment;
      if (current >= targetScore) {
        current = targetScore;
        clearInterval(timer);
      }
      overallScoreValue.textContent = `${Math.round(current)}%`;
      overallScoreCircle.setAttribute('stroke-dasharray', `${Math.round(current)}, 100`);
    }, stepTime);
  }

  function animateMeterBar(barElem, valElem, score) {
    valElem.textContent = `${score}%`;
    barElem.style.width = '0%';
    setTimeout(() => {
      barElem.style.width = `${score}%`;
    }, 150);
  }

  // Skill Gap Visualization Table
  function renderSkillGapTable(gaps) {
    skillGapTableContainer.innerHTML = '';
    if (!gaps || gaps.length === 0) {
      skillGapTableContainer.innerHTML = '<p class="hint-text">No skill comparison data available.</p>';
      return;
    }

    gaps.forEach(item => {
      const pct = item.match_percentage !== undefined ? item.match_percentage : 50;
      let colorClass = 'gap-fill-green';
      let statusBadge = '<span class="chip chip-blue">✓ Matched</span>';

      if (pct < 35) {
        colorClass = 'gap-fill-red';
        statusBadge = '<span class="chip chip-purple" style="border-color: rgba(239,68,68,0.4); color:#fca5a5;">✕ Gap</span>';
      } else if (pct < 75) {
        colorClass = 'gap-fill-amber';
        statusBadge = '<span class="chip chip-purple" style="border-color: rgba(245,158,11,0.4); color:#fcd34d;">⚠ Partial</span>';
      }

      const row = document.createElement('div');
      row.className = 'gap-row';
      row.innerHTML = `
        <div class="gap-skill-title">${escapeHtml(item.skill)}</div>
        <div class="gap-progress-wrap">
          <div class="gap-progress-bar">
            <div class="gap-fill ${colorClass}" style="width: ${pct}%;"></div>
          </div>
          <span class="gap-pct">${pct}%</span>
        </div>
        <div class="gap-evidence">${escapeHtml(item.candidate_evidence || 'Direct evidence identified')}</div>
        <div class="gap-status-badge">${statusBadge}</div>
      `;
      skillGapTableContainer.appendChild(row);
    });
  }

  // Career Roadmap Timeline
  function renderCareerRoadmap(roadmap) {
    roadmapContainer.innerHTML = '';
    if (!roadmap || roadmap.length === 0) {
      roadmapContainer.innerHTML = '<p class="hint-text">Candidate already meets all target requirements!</p>';
      return;
    }

    roadmap.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'roadmap-card';
      card.innerHTML = `
        <div>
          <div class="roadmap-card-header">
            <span class="roadmap-step-pill">${item.step || (idx + 1)}</span>
            <span class="roadmap-timeframe">${escapeHtml(item.timeframe || '1-2 Weeks')}</span>
          </div>
          <h4 class="roadmap-title">${escapeHtml(item.title)}</h4>
          <p class="roadmap-action">${escapeHtml(item.action)}</p>
        </div>
        <div class="roadmap-target">
          Target Competency: <strong>${escapeHtml(item.target_gap || 'Core Architecture')}</strong>
        </div>
      `;
      roadmapContainer.appendChild(card);
    });
  }

  function renderBulletList(container, items) {
    container.innerHTML = '';
    if (!items || items.length === 0) {
      container.innerHTML = '<li>No specific items detected.</li>';
      return;
    }
    items.forEach(text => {
      const li = document.createElement('li');
      li.textContent = text;
      container.appendChild(li);
    });
  }

  // Interview Questions Tabs & Accordions
  interviewTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      interviewTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeInterviewCategory = tab.dataset.category;
      if (currentAnalysisData) {
        renderInterviewQuestions(currentAnalysisData.interview_questions || {});
      }
    });
  });

  function renderInterviewQuestions(questionsObj) {
    interviewQuestionsContainer.innerHTML = '';
    const questions = questionsObj[activeInterviewCategory] || [];

    if (questions.length === 0) {
      interviewQuestionsContainer.innerHTML = '<p class="hint-text">No specific questions available for this category.</p>';
      return;
    }

    questions.forEach((q, idx) => {
      const qText = typeof q === 'string' ? q : q.question;
      const qContext = typeof q === 'object' && q.context ? q.context : "Assesses alignment between candidate background and job requirements.";

      const item = document.createElement('div');
      item.className = 'accordion-item' + (idx === 0 ? ' open' : '');

      item.innerHTML = `
        <button type="button" class="accordion-header">
          <span>Q${idx + 1}: ${escapeHtml(qText)}</span>
          <span class="accordion-arrow">▼</span>
        </button>
        <div class="accordion-body" style="${idx === 0 ? 'display: block;' : 'display: none;'}">
          <span class="context-tag">Agent Evaluation Rationale</span>
          <p>${escapeHtml(qContext)}</p>
        </div>
      `;

      const header = item.querySelector('.accordion-header');
      const body = item.querySelector('.accordion-body');

      header.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        if (isOpen) {
          item.classList.remove('open');
          body.style.display = 'none';
        } else {
          item.classList.add('open');
          body.style.display = 'block';
        }
      });

      interviewQuestionsContainer.appendChild(item);
    });
  }

  refreshInterviewBtn.addEventListener('click', () => {
    if (currentAnalysisData) {
      showNotification('Interview questions refreshed with tailored target role scenarios.');
      renderInterviewQuestions(currentAnalysisData.interview_questions || {});
    }
  });

  // Print / Export Report
  printReportBtn.addEventListener('click', () => {
    window.print();
  });

  // ================================================================
  // RECRUITER MODE BATCH CONTROLLER
  // ================================================================
  recruiterDropzone.addEventListener('click', () => recruiterFilesInput.click());

  recruiterFilesInput.addEventListener('change', () => {
    const count = recruiterFilesInput.files.length;
    recruiterFileCountNotice.textContent = count > 0 ? `${count} resume file(s) queued for batch ranking` : 'Or leave empty to rank sample candidates';
  });

  loadRecruiterDemoBtn.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/demo-data');
      if (res.ok) {
        const data = await res.json();
        recruiterJobInput.value = data.job_description;
      }
      runRecruiterBatch();
    } catch (e) {
      showNotification('Failed to load recruiter sample data.');
    }
  });

  runRecruiterBatchBtn.addEventListener('click', runRecruiterBatch);

  async function runRecruiterBatch() {
    hideNotification();
    const jobText = recruiterJobInput.value.trim();
    if (!jobText) {
      showNotification('Please provide a job description for recruiter candidate ranking.');
      return;
    }

    const formData = new FormData();
    formData.append('job_description', jobText);

    if (recruiterFilesInput.files && recruiterFilesInput.files.length > 0) {
      for (let i = 0; i < recruiterFilesInput.files.length; i++) {
        formData.append('resume_files', recruiterFilesInput.files[i]);
      }
    }

    recruiterResultsContainer.classList.add('hidden');
    recruiterLoading.classList.remove('hidden');

    try {
      const response = await fetch('/api/recruiter-batch', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to process recruiter batch.');
      }

      recruiterLoading.classList.add('hidden');
      renderRecruiterLeaderboard(result.rankings || []);
      recruiterResultsContainer.classList.remove('hidden');

    } catch (err) {
      recruiterLoading.classList.add('hidden');
      showNotification(err.message || 'Recruiter batch scoring encountered an issue.');
    }
  }

  function renderRecruiterLeaderboard(rankings) {
    totalRankedCount.textContent = rankings.length;
    recruiterLeaderboardBody.innerHTML = '';

    if (rankings.length === 0) {
      recruiterLeaderboardBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No candidates processed.</td></tr>';
      return;
    }

    rankings.forEach((cand, idx) => {
      const tr = document.createElement('tr');
      const score = cand.overall_match_score || 0;
      const bClass = getBadgeClass(score);

      const topStrengths = (cand.strengths || []).slice(0, 2).join(' • ') || 'Good baseline fit';
      const gaps = (cand.missing_skills || []).map(m => m.skill).slice(0, 2).join(', ') || 'None';

      tr.innerHTML = `
        <td><strong style="font-size:1.1rem; color: #fff;">#${idx + 1}</strong></td>
        <td>
          <div style="font-weight:700; color:#fff;">${escapeHtml(cand.candidate_name || `Candidate ${idx+1}`)}</div>
          <span style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(cand.match_label || 'Evaluated')}</span>
        </td>
        <td>
          <span class="match-badge ${bClass}" style="font-size:0.875rem;">${score}%</span>
        </td>
        <td>
          <span style="color:var(--accent-cyan); font-weight:700;">${cand.skills_match_score || 0}%</span>
        </td>
        <td style="max-width:260px; font-size:0.8125rem; color:var(--text-secondary);">${escapeHtml(topStrengths)}</td>
        <td style="font-size:0.8125rem; color:#fca5a5;">${escapeHtml(gaps)}</td>
        <td>
          <button type="button" class="btn btn-secondary btn-sm inspect-cand-btn">
            View Dossier
          </button>
        </td>
      `;

      // Click to load into main candidate mode
      const inspectBtn = tr.querySelector('.inspect-cand-btn');
      inspectBtn.addEventListener('click', () => {
        currentAnalysisData = cand;
        renderAnalysisResults(cand);
        // Switch to candidate mode tab
        modeTabs[0].click();
        setTimeout(() => {
          resultsDashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      });

      recruiterLeaderboardBody.appendChild(tr);
    });
  }

  // ================================================================
  // UTILITY HELPERS
  // ================================================================
  function getMatchLabel(score) {
    if (score >= 85) return 'Strong Match';
    if (score >= 70) return 'Good Match';
    if (score >= 50) return 'Moderate Match';
    return 'Low Match';
  }

  function getBadgeClass(score) {
    if (score >= 85) return 'badge-strong';
    if (score >= 70) return 'badge-good';
    if (score >= 50) return 'badge-moderate';
    return 'badge-low';
  }

  function showNotification(msg) {
    notificationMessage.textContent = msg;
    notificationBanner.classList.remove('hidden');
    notificationBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideNotification() {
    notificationBanner.classList.add('hidden');
  }

  closeNotificationBtn.addEventListener('click', hideNotification);

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
