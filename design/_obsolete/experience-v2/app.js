/* Auriva Experience v2 Prototype Engine */

// ==========================================
// 1. MOCK STATE & DATA MODELS
// ==========================================

const mockDoctors = [
  { id: 'doc-sarah', name: 'Dr. Sarah Smith', role: 'doctor', email: 'sarah.smith@aegis.com', specialty: 'General Practice', initials: 'SS' },
  { id: 'doc-elena', name: 'Dr. Elena Patel', role: 'doctor', email: 'elena.patel@aegis.com', specialty: 'Dentistry', initials: 'EP' }
];

const mockStaff = [
  { id: 'staff-nina', name: 'Nina Torres', role: 'receptionist', email: 'nina.torres@aegis.com', initials: 'NT', provMode: 'Managed' },
  { id: 'staff-assistant', name: 'Aman Verma', role: 'nurse', email: 'aman.verma@aegis.com', initials: 'AV', provMode: 'Self-Invite' }
];

// Active Queue database state
let queuePatients = [
  {
    id: 'pat-12',
    token: 12,
    name: 'Priya Sharma',
    phone: '+91 98765 43210',
    age: 28,
    sex: 'Female',
    bloodGroup: 'O+',
    allergies: 'Penicillin',
    doctor: 'doc-elena',
    service: 'Root Canal Consult',
    fee: 500,
    status: 'In Chamber', // Waiting, In Chamber, Serviced, Unpaid
    preConsultPaid: true,
    elapsed: 8,
    checkinTime: '09:12 AM',
    vitals: { bp: '120/80', hr: '78 bpm', temp: '98.6 °F', spo2: '99%' },
    history: [
      { date: '12 May 2026', type: 'Prescription', details: 'Root canal assessment. Prescribed Ibuprofen 400mg.', signer: 'Dr. Elena Patel' },
      { date: '15 Mar 2025', type: 'Lab Report', details: 'Bacterial swab - Negative.', signer: 'Aegis Labs' }
    ],
    recommendedProcedures: [
      { name: 'Root Canal Irrigation', fee: 1200, selected: true },
      { name: 'Composite Dental Filling', fee: 800, selected: true }
    ],
    invoiceSettled: false
  },
  {
    id: 'pat-13',
    token: 13,
    name: 'Aarav Patel',
    phone: '+91 91234 56789',
    age: 34,
    sex: 'Male',
    bloodGroup: 'A+',
    allergies: 'None',
    doctor: 'doc-sarah',
    service: 'General Consultation',
    fee: 500,
    status: 'Waiting',
    preConsultPaid: true,
    elapsed: 15,
    checkinTime: '09:05 AM',
    vitals: { bp: '130/85', hr: '82 bpm', temp: '99.1 °F', spo2: '98%' },
    history: [
      { date: '20 Apr 2026', type: 'Prescription', details: 'Acute bronchitis. Prescribed Azithromycin.', signer: 'Dr. Sarah Smith' }
    ],
    recommendedProcedures: [
      { name: 'Bilateral Chest X-Ray', fee: 650, selected: true }
    ],
    invoiceSettled: false
  },
  {
    id: 'pat-14',
    token: 14,
    name: 'Nina Gupta',
    phone: '+91 82345 67890',
    age: 32,
    sex: 'Female',
    bloodGroup: 'B-',
    allergies: 'Aspirin',
    doctor: 'doc-sarah',
    service: 'OPD Consultation',
    fee: 500,
    status: 'Unpaid', // Check-in done, but consult fee collection pending
    preConsultPaid: false,
    elapsed: 2,
    checkinTime: '09:40 AM',
    vitals: { bp: '118/76', hr: '72 bpm', temp: '98.4 °F', spo2: '99%' },
    history: [],
    recommendedProcedures: [],
    invoiceSettled: false
  }
];

let globalTenants = [
  { id: 'TEN-001', name: 'Aegis Family Clinic', owner: 'Dr. Sarah Smith', specialty: 'General Practice', tier: 'Professional', status: 'Active' },
  { id: 'TEN-002', name: 'Apex Orthopedic Group', owner: 'Dr. Alan Miller', specialty: 'Physiotherapy', tier: 'Group Enterprise', status: 'Active' },
  { id: 'TEN-003', name: 'Pine Dental Chambers', owner: 'Dr. Roy Vance', specialty: 'Dentistry', tier: 'Solo Free', status: 'Suspended' }
];

let activeClinicRole = 'owner'; // owner, pm, receptionist, doctor, nurse
let activeClinicPanel = 'queue';
let selectedQueuePatientId = null;
let activeEncounterPatientId = null; // Locked patient context in COS
let isOfflineMode = false;
let queueSchedulingMode = 'token'; // token vs slot
let selectedSettingsSubtab = 'practice';
let selectedProvisioningMode = 'managed';

// ==========================================
// 2. ROUTING ENGINE
// ==========================================

function switchView(viewName) {
  document.querySelectorAll('.role-bar .role-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.screen-view').forEach(view => view.classList.remove('active'));
  
  const clinicRoleSelector = document.getElementById('clinic-role-selector');
  clinicRoleSelector.style.display = 'none';

  if (viewName === 'marketing') {
    document.getElementById('btn-view-marketing').classList.add('active');
    document.getElementById('viewport-marketing').classList.add('active');
  } else if (viewName === 'clinic') {
    document.getElementById('btn-view-clinic').classList.add('active');
    document.getElementById('viewport-clinic').classList.add('active');
    clinicRoleSelector.style.display = 'flex';
    syncRoleNavigation();
    renderRoster();
    renderQueue();
  } else if (viewName === 'patient') {
    document.getElementById('btn-view-patient').classList.add('active');
    document.getElementById('viewport-patient').classList.add('active');
    syncMobileAppHome();
  } else if (viewName === 'admin') {
    document.getElementById('btn-view-admin').classList.add('active');
    document.getElementById('viewport-admin').classList.add('active');
    renderAdminTenants();
  }
  dispatchToast('info', `Switched viewport context to ${viewName.toUpperCase()}`);
}

function switchMarketingTab(tabName) {
  document.querySelectorAll('.marketing-nav-link').forEach(link => link.classList.remove('active'));
  document.querySelectorAll('.marketing-tab').forEach(tab => tab.style.display = 'none');
  
  const mnavLink = document.getElementById(`mnav-m-${tabName}`);
  if (mnavLink) mnavLink.classList.add('active');
  
  const targetTab = document.getElementById(`m-tab-${tabName}`);
  if (targetTab) targetTab.style.display = 'block';
}

function switchClinicPanel(panelName) {
  activeClinicPanel = panelName;
  document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));
  document.querySelectorAll('.panel-view').forEach(panel => panel.classList.remove('active-panel'));
  
  const slink = document.getElementById(`slink-${panelName}`);
  if (slink) slink.classList.add('active');
  
  const panel = document.getElementById(`panel-${panelName}`);
  if (panel) {
    panel.classList.add('active-panel');
    panel.style.display = 'flex';
  }

  // Trigger special initializations per panel load
  if (panelName === 'clinical') {
    renderClinicalEMR();
  } else if (panelName === 'reception') {
    renderReceptionDrawerPanel();
  } else if (panelName === 'billing') {
    renderBillingLedgerTable();
  } else if (panelName === 'reports') {
    renderReportsAnalytics();
  } else if (panelName === 'calendar') {
    renderCalendarSlots();
  }
}

// ==========================================
// 3. ROLE-BASED ACCESS CONTROL CONTROLLER
// ==========================================

function switchRole(roleName) {
  activeClinicRole = roleName;
  document.querySelectorAll('#clinic-role-selector .role-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`btn-role-${roleName}`).classList.add('active');

  // Update profile label in header
  const nameLabel = document.getElementById('active-user-name');
  const roleLabel = document.getElementById('active-user-role');
  const avatarLabel = document.getElementById('active-user-avatar');

  if (roleName === 'owner') {
    nameLabel.textContent = 'Dr. Sarah Smith';
    roleLabel.textContent = 'Managing Owner';
    avatarLabel.textContent = 'SS';
  } else if (roleName === 'pm') {
    nameLabel.textContent = 'Marcus Vance';
    roleLabel.textContent = 'Practice Manager';
    avatarLabel.textContent = 'MV';
  } else if (roleName === 'receptionist') {
    nameLabel.textContent = 'Nina Torres';
    roleLabel.textContent = 'Billing receptionist';
    avatarLabel.textContent = 'NT';
  } else if (roleName === 'doctor') {
    nameLabel.textContent = 'Dr. Elena Patel';
    roleLabel.textContent = 'Doctor (Dentistry)';
    avatarLabel.textContent = 'EP';
  } else if (roleName === 'nurse') {
    nameLabel.textContent = 'Aman Verma';
    roleLabel.textContent = 'Assisting Nurse';
    avatarLabel.textContent = 'AV';
  }

  syncRoleNavigation();
  dispatchToast('success', `Rerouted user navigation for ${roleName.toUpperCase()}`);
}

function syncRoleNavigation() {
  // Hide all sections by default
  const consultSection = document.getElementById('sgroup-consultation');
  const opsSection = document.getElementById('sgroup-operations');
  
  consultSection.style.display = 'none';
  opsSection.style.display = 'none';

  // Adjust sidebar groups based on roles
  if (activeClinicRole === 'owner' || activeClinicRole === 'pm') {
    consultSection.style.display = 'block';
    opsSection.style.display = 'block';
  } else if (activeClinicRole === 'receptionist') {
    opsSection.style.display = 'block';
    if (activeClinicPanel === 'clinical' || activeClinicPanel === 'templates' || activeClinicPanel === 'prescriptions') {
      switchClinicPanel('queue');
    }
  } else if (activeClinicRole === 'doctor' || activeClinicRole === 'nurse') {
    consultSection.style.display = 'block';
    if (activeClinicPanel === 'reception' || activeClinicPanel === 'billing' || activeClinicPanel === 'reports') {
      switchClinicPanel('queue');
    }
  }
}

// ==========================================
// 4. RECEPTION OPERATING SYSTEM (ROS) QUEUE
// ==========================================

function renderQueue() {
  const container = document.getElementById('queue-cards-container');
  const subtext = document.getElementById('queue-count-subtext');
  container.innerHTML = '';
  
  subtext.textContent = `${queuePatients.length} patients active`;

  if (queuePatients.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:40px 10px; color:var(--color-ink-soft);">
        <span>🎟️</span>
        <p style="font-size:11px; margin-top:8px;">No patients checked in today.</p>
      </div>
    `;
    return;
  }

  queuePatients.forEach(p => {
    const docObj = mockDoctors.find(d => d.id === p.doctor);
    const doctorName = docObj ? docObj.name : 'Unassigned';
    
    // Choose status badge colors
    let badgeClass = 'background:var(--color-primary-soft); color:var(--color-primary);';
    if (p.status === 'In Chamber') badgeClass = 'background:var(--color-success-soft); color:var(--color-success); font-weight:bold;';
    if (p.status === 'Unpaid') badgeClass = 'background:var(--color-danger-soft); color:var(--color-danger);';
    if (p.status === 'Waiting') badgeClass = 'background:var(--color-warning-soft); color:var(--color-warning);';

    const card = document.createElement('div');
    card.className = `premium-card ${selectedQueuePatientId === p.id ? 'active' : ''}`;
    card.style.padding = '12px';
    card.style.cursor = 'pointer';
    card.onclick = () => selectQueuePatient(p.id);

    // Dynamic queue strategy label: Token number vs Slot time
    const indexLabel = queueSchedulingMode === 'token' ? `#${p.token}` : p.checkinTime;

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-family:var(--font-heading); font-size:16px; font-weight:bold; color:var(--color-primary);">${indexLabel}</span>
          <div>
            <strong style="font-size:12px; display:block;">${p.name}</strong>
            <span style="font-size:10px; color:var(--color-ink-soft);">${p.service} · ${doctorName}</span>
          </div>
        </div>
        <span style="font-size:9px; padding:2px 6px; border-radius:4px; text-transform:uppercase; ${badgeClass}">${p.status}</span>
      </div>
      <div style="display:flex; justify-content:space-between; border-top:1px solid var(--color-border); padding-top:8px; font-size:10px; color:var(--color-ink-soft);">
        <span>Fee: <strong>${p.preConsultPaid ? 'Paid' : 'Pending'}</strong></span>
        <span>Elapsed: <strong>${p.elapsed} mins</strong></span>
      </div>
    `;
    container.appendChild(card);
  });
}

function selectQueuePatient(id) {
  selectedQueuePatientId = id;
  renderQueue();
  renderActiveQueueDetail();
  renderPOSCheckout();
}

function renderActiveQueueDetail() {
  const container = document.getElementById('active-queue-detail');
  const patient = queuePatients.find(p => p.id === selectedQueuePatientId);

  if (!patient) {
    container.innerHTML = `
      <div class="premium-card" style="padding:32px; text-align:center; color:var(--color-ink-soft); display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%;">
        <span>🎟️</span>
        <p style="margin-top:12px; font-weight:500;">Select a patient card in the queue to manage check-in or upfront billing actions.</p>
      </div>
    `;
    document.getElementById('selected-patient-id-tag').textContent = 'ID: -';
    return;
  }

  document.getElementById('selected-patient-id-tag').textContent = `ID: ${patient.id.toUpperCase()}`;

  const docObj = mockDoctors.find(d => d.id === patient.doctor);
  const doctorName = docObj ? docObj.name : 'Unassigned';

  let billingTriggerBtn = '';
  if (!patient.preConsultPaid) {
    billingTriggerBtn = `
      <div style="background:var(--color-warning-soft); padding:12px; border-radius:var(--radius-md); border:1px solid var(--color-warning); margin-bottom:12px;">
        <p style="font-size:11px; color:var(--color-warning-deep); margin-bottom:8px;"><strong>Consultation Upfront Fee Outstanding:</strong> ₹${patient.fee} is required to check-in this patient.</p>
        <button class="btn btn-honey" onclick="collectPreConsultPayment('${patient.id}')" style="width:100%; font-size:11px;">Collect Consult Fee (₹${patient.fee})</button>
      </div>
    `;
  } else {
    billingTriggerBtn = `
      <div style="background:var(--color-primary-soft); padding:12px; border-radius:var(--radius-md); border:1px solid var(--color-primary-border); margin-bottom:12px; text-align:center;">
        <p style="font-size:11px; color:var(--color-primary); font-weight:bold;">✓ Upfront Consultation Fee Paid</p>
      </div>
    `;
  }

  // Next action nudging (Principle 6)
  let actionNudge = '';
  if (patient.status === 'Unpaid') {
    actionNudge = `<button class="btn btn-honey" onclick="collectPreConsultPayment('${patient.id}')" style="width:100%;">Nudge: Collect Consultation Payment</button>`;
  } else if (patient.status === 'Waiting') {
    actionNudge = `<button class="btn btn-primary" onclick="routeToClinicalChamber('${patient.id}')" style="width:100%;">Nudge: Route to Doctor Chamber</button>`;
  } else if (patient.status === 'In Chamber') {
    actionNudge = `
      <div style="text-align:center; padding:12px; border:1px dashed var(--color-border); border-radius:8px;">
        <span style="font-size:16px;">🩺</span>
        <p style="font-size:11px; color:var(--color-ink-muted); margin-top:4px;">Patient currently undergoing EMR SOAP entry with ${doctorName}.</p>
      </div>
    `;
  } else if (p.status === 'Serviced') {
    actionNudge = `<button class="btn btn-honey" onclick="switchClinicPanel('billing')" style="width:100%;">Nudge: Complete Checkout &amp; Settle Cart</button>`;
  }

  container.innerHTML = `
    <div class="premium-card" style="padding:16px; background:#FFFFFF;">
      <h4 class="text-h4" style="font-size:15px; margin-bottom:12px; border-bottom:1px solid var(--color-border); padding-bottom:8px;">Demographics</h4>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:12px; margin-bottom:12px;">
        <div><span style="color:var(--color-ink-soft);">Full Name:</span> <strong style="display:block;">${patient.name}</strong></div>
        <div><span style="color:var(--color-ink-soft);">Phone:</span> <strong style="display:block;">${patient.phone}</strong></div>
        <div><span style="color:var(--color-ink-soft);">Age / Sex:</span> <strong style="display:block;">${patient.age}y / ${patient.sex}</strong></div>
        <div><span style="color:var(--color-ink-soft);">Blood Group:</span> <strong style="display:block;">${patient.bloodGroup}</strong></div>
      </div>
      <div style="font-size:12px; border-top:1px dashed var(--color-border); padding-top:8px;">
        <span style="color:var(--color-danger); font-weight:bold;">Allergies:</span>
        <p style="font-size:12px; font-weight:600; color:var(--color-danger);">${patient.allergies}</p>
      </div>
    </div>

    ${billingTriggerBtn}

    <div class="premium-card" style="padding:16px; background:#FFFFFF;">
      <h4 class="text-h4" style="font-size:12px; margin-bottom:8px;">Primary Check-in Parameters</h4>
      <div style="font-size:12px; display:flex; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:space-between;"><span>Scheduled Slot:</span> <strong>09:30 AM (Hybrid prioritised)</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>Assigned Doctor:</span> <strong>${doctorName}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>OPD Token Roster:</span> <strong style="color:var(--color-primary);">Token #${patient.token}</strong></div>
      </div>
    </div>

    <div style="margin-top:auto;">
      ${actionNudge}
    </div>
  `;
}

function collectPreConsultPayment(id) {
  const patient = queuePatients.find(p => p.id === id);
  if (!patient) return;

  // Simulate payment processing
  patient.preConsultPaid = true;
  if (patient.status === 'Unpaid') {
    patient.status = 'Waiting';
  }
  
  renderQueue();
  renderActiveQueueDetail();
  renderPOSCheckout();
  
  dispatchToast('success', `Upfront Fee Collected for ${patient.name}. Issued Token #${patient.token}.`);
}

function toggleQueueSchedulingMode() {
  queueSchedulingMode = queueSchedulingMode === 'token' ? 'slot' : 'token';
  const btn = document.getElementById('btn-toggle-sched-mode');
  btn.textContent = queueSchedulingMode === 'token' ? 'Tokens' : 'Slot Times';
  renderQueue();
  dispatchToast('info', `Switched queue representation to ${queueSchedulingMode.toUpperCase()}`);
}

function routeToClinicalChamber(id) {
  // If another consultation is active, verify lock
  if (activeEncounterPatientId && activeEncounterPatientId !== id) {
    triggerEncounterSwitchBlock(id);
    return;
  }
  
  const patient = queuePatients.find(p => p.id === id);
  if (!patient) return;

  patient.status = 'In Chamber';
  activeEncounterPatientId = id;
  
  renderQueue();
  renderActiveQueueDetail();
  switchClinicPanel('clinical');
  dispatchToast('success', `Chamber consulting session activated for ${patient.name}`);
}

// ==========================================
// 5. CLINICAL WORKSPACE (COS CHAMBER)
// ==========================================

function renderClinicalEMR() {
  const timeline = document.getElementById('emr-history-timeline');
  const nameLabel = document.getElementById('clinical-patient-name-label');
  const tokenBadge = document.getElementById('clinical-token-badge');
  const idTag = document.getElementById('emr-patient-id-tag');

  const patient = queuePatients.find(p => p.id === activeEncounterPatientId);

  if (!patient) {
    nameLabel.textContent = 'No Active Consultation';
    tokenBadge.textContent = '-';
    idTag.textContent = 'Select Patient';
    timeline.innerHTML = '<div style="text-align:center; color:var(--color-ink-soft); margin-top:40px;">No active patient context loaded in COS.</div>';
    
    // Clear inputs
    document.getElementById('soap-s').value = '';
    document.getElementById('soap-o').value = '';
    document.getElementById('soap-p').value = '';
    document.getElementById('clinical-diagnosis-chips-list').innerHTML = '';
    document.getElementById('clinical-rx-items-list').innerHTML = '';
    document.getElementById('clinical-procedure-referrals-list').innerHTML = '';
    return;
  }

  nameLabel.textContent = `${patient.name} (${patient.age}y / ${patient.sex})`;
  tokenBadge.textContent = `#${patient.token}`;
  idTag.textContent = `ID: ${patient.id.toUpperCase()}`;

  // Fill vitals from patient object
  document.getElementById('vitals-bp').value = patient.vitals.bp;
  document.getElementById('vitals-hr').value = patient.vitals.hr;
  document.getElementById('vitals-temp').value = patient.vitals.temp;
  document.getElementById('vitals-spo2').value = patient.vitals.spo2;

  // Render EMR history timeline
  timeline.innerHTML = '';
  patient.history.forEach(item => {
    const div = document.createElement('div');
    div.className = 'premium-card';
    div.style.padding = '10px';
    div.style.fontSize = '11px';
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-weight:bold; color:var(--color-primary);">
        <span>${item.type}</span>
        <span style="color:var(--color-ink-soft); font-weight:normal;">${item.date}</span>
      </div>
      <p style="color:var(--color-ink-muted);">${item.details}</p>
      <span style="font-size:9px; color:var(--color-ink-soft); display:block; margin-top:4px;">Signed: ${item.signer}</span>
    `;
    timeline.appendChild(div);
  });

  // Render diagnosis chips
  renderClinicalDiagnosisChips();

  // Render Rx drugs
  renderClinicalRxItems();

  // Render procedure referrals list
  renderClinicalProcedureReferrals();
}

function applyClinicalTemplate(type) {
  const patient = queuePatients.find(p => p.id === activeEncounterPatientId);
  if (!patient) return;

  if (type === 'tonsillitis') {
    document.getElementById('soap-s').value = 'Severe sore throat for 3 days. Pain increases during swallowing. Fever peak of 100.5F.';
    document.getElementById('soap-o').value = 'Pharyngeal walls erythematous. Swollen tonsils with white follicles. Tender submandibular glands.';
    document.getElementById('soap-p').value = 'Gargle warm saline 3 times daily. Rest. Return check if symptoms persist 5 days.';
    
    patient.diagnosisTags = ['Acute Tonsillitis', 'Pharyngitis'];
    patient.rxItems = [
      { name: 'Tab. Amoxicillin 500mg', freq: '1-0-1 (BID)', duration: '5 Days' },
      { name: 'Tab. Paracetamol 650mg', freq: '1-0-1 (PRN)', duration: '3 Days' }
    ];
    patient.recommendedProcedures = [
      { name: 'Throat Swab Culture', fee: 350, selected: true },
      { name: 'CBC Test (Lab)', fee: 450, selected: true }
    ];
  } else if (type === 'dental') {
    document.getElementById('soap-s').value = 'Severe throbbing pain in upper left quadrant. Sensitive to hot/cold.';
    document.getElementById('soap-o').value = 'Deep dental caries in tooth #14. Tenderness to percussion.';
    document.getElementById('soap-p').value = 'Tooth extraction procedure scheduled. Avoid chewing left side.';
    
    patient.diagnosisTags = ['Dental Caries', 'Pulpitis'];
    patient.rxItems = [
      { name: 'Tab. Ibuprofen 400mg', freq: '1-0-1 (BID)', duration: '3 Days' }
    ];
    patient.recommendedProcedures = [
      { name: 'Dental Caries Extraction', fee: 1500, selected: true }
    ];
  }

  renderClinicalEMR();
  dispatchToast('success', `Applied template guidelines for ${type.toUpperCase()}`);
}

function renderClinicalDiagnosisChips() {
  const list = document.getElementById('clinical-diagnosis-chips-list');
  list.innerHTML = '';
  const patient = queuePatients.find(p => p.id === activeEncounterPatientId);
  if (!patient || !patient.diagnosisTags) return;

  patient.diagnosisTags.forEach(tag => {
    const span = document.createElement('span');
    span.style.background = 'var(--color-primary-soft)';
    span.style.color = 'var(--color-primary)';
    span.style.border = '1px solid var(--color-primary-border)';
    span.style.padding = '2px 8px';
    span.style.borderRadius = '20px';
    span.style.fontSize = '10px';
    span.style.fontWeight = '600';
    span.style.display = 'inline-flex';
    span.style.alignItems = 'center';
    span.style.gap = '4px';
    span.innerHTML = `
      <span>${tag}</span>
      <button onclick="removeClinicalDiagnosisTag('${tag}')" style="background:none; border:none; cursor:pointer; font-weight:bold; color:var(--color-danger);">×</button>
    `;
    list.appendChild(span);
  });
}

function addClinicalDiagnosisTag() {
  const input = document.getElementById('input-clinical-diagnosis');
  const val = input.value.trim();
  const patient = queuePatients.find(p => p.id === activeEncounterPatientId);
  if (!patient || !val) return;

  if (!patient.diagnosisTags) patient.diagnosisTags = [];
  if (!patient.diagnosisTags.includes(val)) {
    patient.diagnosisTags.push(val);
  }
  input.value = '';
  renderClinicalDiagnosisChips();
}

function handleClinicalDiagnosisKeypress(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    addClinicalDiagnosisTag();
  }
}

function removeClinicalDiagnosisTag(tag) {
  const patient = queuePatients.find(p => p.id === activeEncounterPatientId);
  if (!patient || !patient.diagnosisTags) return;
  patient.diagnosisTags = patient.diagnosisTags.filter(t => t !== tag);
  renderClinicalDiagnosisChips();
}

function renderClinicalRxItems() {
  const container = document.getElementById('clinical-rx-items-list');
  container.innerHTML = '';
  const patient = queuePatients.find(p => p.id === activeEncounterPatientId);
  if (!patient) return;

  if (!patient.rxItems || patient.rxItems.length === 0) {
    container.innerHTML = '<p style="font-size:10px; color:var(--color-ink-soft); text-align:center;">No medications added yet.</p>';
    return;
  }

  patient.rxItems.forEach(item => {
    const div = document.createElement('div');
    div.style.background = 'var(--bg-secondary)';
    div.style.border = '1px solid var(--color-border)';
    div.style.padding = '8px';
    div.style.borderRadius = '6px';
    div.style.fontSize = '11px';
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; font-weight:bold;">
        <span>${item.name}</span>
        <button onclick="removeClinicalRxItem('${item.name}')" style="background:none; border:none; color:var(--color-danger); cursor:pointer;">×</button>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--color-ink-soft); margin-top:4px;">
        <span>Freq: ${item.freq}</span>
        <span>Duration: ${item.duration}</span>
      </div>
    `;
    container.appendChild(div);
  });
}

function addClinicalRxItem() {
  const nameInput = document.getElementById('input-rx-search');
  const freqInput = document.getElementById('input-rx-freq');
  const durInput = document.getElementById('input-rx-duration');

  const patient = queuePatients.find(p => p.id === activeEncounterPatientId);
  if (!patient || !nameInput.value.trim()) return;

  if (!patient.rxItems) patient.rxItems = [];
  patient.rxItems.push({
    name: nameInput.value.trim(),
    freq: freqInput.value.trim() || '1-0-1 (PRN)',
    duration: durInput.value.trim() || '5 Days'
  });

  nameInput.value = '';
  freqInput.value = '';
  durInput.value = '';

  renderClinicalRxItems();
}

function removeClinicalRxItem(name) {
  const patient = queuePatients.find(p => p.id === activeEncounterPatientId);
  if (!patient || !patient.rxItems) return;
  patient.rxItems = patient.rxItems.filter(i => i.name !== name);
  renderClinicalRxItems();
}

function handleRxSearchAutocomplete() {
  const val = document.getElementById('input-rx-search').value.toLowerCase();
  const box = document.getElementById('rx-autocomplete-suggestions');
  box.innerHTML = '';
  if (!val) {
    box.style.display = 'none';
    return;
  }

  const commonDrugs = ['Paracetamol 650mg', 'Amoxicillin 500mg', 'Ibuprofen 400mg', 'Azithromycin 250mg', 'Cetirizine 10mg'];
  const matches = commonDrugs.filter(d => d.toLowerCase().includes(val));

  if (matches.length === 0) {
    box.style.display = 'none';
    return;
  }

  box.style.display = 'block';
  matches.forEach(m => {
    const div = document.createElement('div');
    div.style.padding = '4px 12px';
    div.style.cursor = 'pointer';
    div.style.fontSize = '11px';
    div.className = 'autocomplete-row';
    div.textContent = m;
    div.onclick = () => {
      document.getElementById('input-rx-search').value = m;
      box.style.display = 'none';
    };
    box.appendChild(div);
  });
}

function renderClinicalProcedureReferrals() {
  const container = document.getElementById('clinical-procedure-referrals-list');
  container.innerHTML = '';
  const patient = queuePatients.find(p => p.id === activeEncounterPatientId);
  if (!patient) return;

  const defaultProcedures = [
    { name: 'CBC Test (Lab)', fee: 450 },
    { name: 'Throat Swab Culture', fee: 350 },
    { name: 'Dental Caries Extraction', fee: 1500 },
    { name: 'Bilateral Chest X-Ray', fee: 650 }
  ];

  defaultProcedures.forEach(proc => {
    const isSelected = patient.recommendedProcedures.some(p => p.name === proc.name);
    const label = document.createElement('label');
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.gap = '8px';
    label.style.fontSize = '11px';
    label.style.cursor = 'pointer';
    label.innerHTML = `
      <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleClinicalProcedure('${proc.name}', ${proc.fee}, this.checked)"/>
      <span>${proc.name} (₹${proc.fee})</span>
    `;
    container.appendChild(label);
  });
}

function toggleClinicalProcedure(name, fee, checked) {
  const patient = queuePatients.find(p => p.id === activeEncounterPatientId);
  if (!patient) return;

  if (checked) {
    if (!patient.recommendedProcedures.some(p => p.name === name)) {
      patient.recommendedProcedures.push({ name, fee, selected: true });
    }
  } else {
    patient.recommendedProcedures = patient.recommendedProcedures.filter(p => p.name !== name);
  }
}

function triggerClinicalAutosave() {
  const indicator = document.getElementById('clinical-autosave-indicator');
  indicator.textContent = 'Autosaving...';
  
  // Simulate debounce
  setTimeout(() => {
    const patient = queuePatients.find(p => p.id === activeEncounterPatientId);
    if (patient) {
      patient.vitals.bp = document.getElementById('vitals-bp').value;
      patient.vitals.hr = document.getElementById('vitals-hr').value;
      patient.vitals.temp = document.getElementById('vitals-temp').value;
      patient.vitals.spo2 = document.getElementById('vitals-spo2').value;
    }
    indicator.textContent = 'Draft Saved';
  }, 600);
}

function voidClinicalSession() {
  if (!activeEncounterPatientId) return;
  const patient = queuePatients.find(p => p.id === activeEncounterPatientId);
  if (patient) {
    patient.status = 'Waiting';
  }
  activeEncounterPatientId = null;
  switchClinicPanel('queue');
  dispatchToast('info', 'Chamber consultation draft suspended. Context released.');
}

function signClinicalConsultation() {
  const patient = queuePatients.find(p => p.id === activeEncounterPatientId);
  if (!patient) return;

  // Invariant check: Rule 3
  if (!patient.rxItems || patient.rxItems.length === 0) {
    dispatchToast('danger', 'Rule Invariant: Consultation cannot complete without medication details.');
    return;
  }

  // Create signed E-Rx log item
  const dateStr = '14 Jul 2026';
  patient.history.unshift({
    date: dateStr,
    type: 'Prescription',
    details: `Diagnosed: ${patient.diagnosisTags ? patient.diagnosisTags.join(', ') : 'Unspecified'}. Vitals stable. Signed E-Rx dispatched.`,
    signer: document.getElementById('active-user-name').textContent
  });

  patient.status = 'Serviced';
  activeEncounterPatientId = null;
  
  dispatchToast('success', `Signed E-Rx successfully for ${patient.name}. visit completed.`);
  
  // Clear search selectors and load queue
  switchClinicPanel('queue');
  renderQueue();
}

// ==========================================
// 6. POS BILLING & CHECKOUT (ROS)
// ==========================================

function renderPOSCheckout() {
  const container = document.getElementById('pos-checkout-body');
  const badge = document.getElementById('badge-checkout-status');
  const patient = queuePatients.find(p => p.id === selectedQueuePatientId);

  if (!patient) {
    container.innerHTML = `
      <div style="text-align:center; color:var(--color-ink-soft); margin-top:60px;">
        <span>💳</span>
        <p style="font-size:12px; margin-top:8px;">No patient selected in the queue.</p>
      </div>
    `;
    badge.textContent = 'Clear';
    badge.style.background = 'var(--color-primary-soft)';
    badge.style.color = 'var(--color-primary)';
    return;
  }

  // Calculate items
  let itemsHTML = '';
  let subtotal = 0;

  // 1. Consultation fee
  subtotal += patient.fee;
  itemsHTML += `
    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-secondary); padding:8px; border-radius:6px; font-size:11px;">
      <div>
        <strong>OPD Consultation Fee</strong>
        <span style="font-size:9px; color:var(--color-ink-soft); display:block;">Upfront OPD Roster</span>
      </div>
      <div style="text-align:right;">
        <strong>₹${patient.fee}</strong>
        <span style="display:block; font-size:8px; color:var(--color-success); font-weight:bold;">${patient.preConsultPaid ? 'Paid' : 'Unpaid'}</span>
      </div>
    </div>
  `;

  // 2. Recommended procedures/tests
  patient.recommendedProcedures.forEach(proc => {
    subtotal += proc.fee;
    itemsHTML += `
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-secondary); padding:8px; border-radius:6px; font-size:11px; margin-top:6px;">
        <div>
          <strong>${proc.name}</strong>
          <span style="font-size:9px; color:var(--color-ink-soft); display:block;">Clinical recommendation</span>
        </div>
        <div style="text-align:right;">
          <strong>₹${proc.fee}</strong>
          <span style="display:block; font-size:8px; color:var(--color-danger); font-weight:bold;">Unpaid</span>
        </div>
      </div>
    `;
  });

  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  if (patient.status === 'Unpaid' || (patient.status === 'Waiting' && patient.recommendedProcedures.length === 0)) {
    badge.textContent = 'Consult Paid';
    badge.style.background = 'var(--color-success-soft)';
    badge.style.color = 'var(--color-success)';
  } else {
    badge.textContent = 'Encounter Bill';
    badge.style.background = 'var(--color-warning-soft)';
    badge.style.color = 'var(--color-honey)';
  }

  // Draw checkout content
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:12px; flex:1;">
      <p style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--color-ink-soft); letter-spacing:0.05em; margin-bottom:4px;">Checkout Ledger Summary</p>
      
      <div style="display:flex; flex-direction:column; gap:6px;">
        ${itemsHTML}
      </div>

      <div style="border-top:1px solid var(--color-border); padding-top:10px; display:flex; flex-direction:column; gap:4px; font-size:11px;">
        <div style="display:flex; justify-content:space-between; color:var(--color-ink-muted);">
          <span>Encounter Subtotal:</span>
          <span>₹${subtotal}</span>
        </div>
        <div style="display:flex; justify-content:space-between; color:var(--color-ink-muted);">
          <span>Taxes &amp; GST (5%):</span>
          <span>₹${tax}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:13px; color:var(--color-primary); border-top:1px dashed var(--color-border); padding-top:6px; margin-top:4px;">
          <span>Total Balance Due:</span>
          <span>₹${total}</span>
        </div>
      </div>

      <!-- UPI QR Simulation code -->
      <div class="premium-card" style="padding:12px; background:var(--bg-background); display:flex; flex-direction:column; align-items:center; gap:8px;">
        <span style="font-size:9px; font-weight:bold; color:var(--color-ink-soft); text-transform:uppercase;">Scan UPI Code</span>
        <div style="width:100px; height:100px; background:#FFF; border:1px solid var(--color-border); padding:6px; display:flex; align-items:center; justify-content:center;">
          <svg viewBox="0 0 100 100" style="width:100%; height:100%; color:var(--color-primary);">
            <path fill="currentColor" d="M10,10 h30 v30 h-30 z M15,15 h20 v20 h-20 z M10,60 h30 v30 h-30 z M15,65 h20 v20 h-20 z M60,10 h30 v30 h-30 z M65,15 h20 v20 h-20 z M20,20 h10 v10 h-10 z M20,70 h10 v10 h-10 z M70,20 h10 v10 h-10 z M50,50 h10 v10 h-10 z M60,60 h10 v10 h-10 z M70,70 h15 v15 h-15 z M80,60 h10 v10 h-10 z" />
          </svg>
        </div>
        <span style="font-size:8px; color:var(--color-ink-muted);">QR linked to Aegis Merchant ledger</span>
      </div>
    </div>

    <div style="display:flex; flex-direction:column; gap:8px; border-top:1px solid var(--color-border); padding-top:12px;">
      <button class="btn btn-honey" onclick="settlePOSCheckout('${patient.id}', ${total})" style="width:100%;">Collect Payment (₹${total})</button>
      <button class="btn btn-secondary" onclick="printThermalReceiptMock('${patient.id}')" style="width:100%; font-size:10px;">Print Thermal Roll</button>
    </div>
  `;
}

function settlePOSCheckout(id, total) {
  const patient = queuePatients.find(p => p.id === id);
  if (!patient) return;

  patient.invoiceSettled = true;
  patient.preConsultPaid = true;
  patient.status = 'Serviced';

  // Add payments log metrics
  const statBox = document.getElementById('stat-collections');
  const prevVal = parseInt(statBox.textContent.replace('₹', '').replace(',', ''));
  statBox.textContent = `₹${(prevVal + total).toLocaleString()}`;

  renderQueue();
  renderActiveQueueDetail();
  renderPOSCheckout();

  dispatchToast('success', `Collected balance ₹${total} for ${patient.name}. Encounter settled.`);
}

function printThermalReceiptMock(id) {
  const patient = queuePatients.find(p => p.id === id);
  if (!patient) return;

  const w = window.open('', '_blank', 'width=350,height=500');
  
  let itemsHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
      <span>OPD Consultation</span>
      <span>₹${patient.fee}</span>
    </div>
  `;

  let subtotal = patient.fee;
  patient.recommendedProcedures.forEach(p => {
    subtotal += p.fee;
    itemsHTML += `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span>${p.name}</span>
        <span>₹${p.fee}</span>
      </div>
    `;
  });

  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  w.document.write(`
    <html>
      <head>
        <title>Thermal Receipt</title>
        <style>
          body { font-family: monospace; font-size: 12px; padding: 20px; line-height: 1.4; color: #000; }
          .center { text-align: center; }
          .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
          .flex { display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="center">
          <h3>AEGIS FAMILY CLINIC</h3>
          <p>Sector V, Salt Lake, Kolkata<br>GSTIN: 19AAHCA98317A1</p>
        </div>
        <div class="divider"></div>
        <div>
          Date: 14 Jul 2026<br>
          Token: #${patient.token}<br>
          Patient: ${patient.name}
        </div>
        <div class="divider"></div>
        ${itemsHTML}
        <div class="divider"></div>
        <div class="flex"><span>Subtotal:</span><span>₹${subtotal}</span></div>
        <div class="flex"><span>GST (5%):</span><span>₹${tax}</span></div>
        <div class="flex" style="font-weight:bold;"><span>Total Paid:</span><span>₹${total}</span></div>
        <div class="divider"></div>
        <div class="center" style="margin-top:20px;">
          <p>Thank you for choosing Aegis.<br>Get well soon!</p>
        </div>
        <script>window.print();</script>
      </body>
    </html>
  `);
  w.document.close();
}

// ==========================================
// 7. CALENDAR & ROSTER
// ==========================================

function renderCalendarSlots() {
  const grid = document.getElementById('calendar-mock-slots');
  grid.innerHTML = '';

  const hours = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];
  
  hours.forEach((h, idx) => {
    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '80px 1fr';
    row.style.alignItems = 'center';
    row.style.borderBottom = '1px solid var(--color-border)';
    row.style.height = '50px';

    // Time cell
    const timeCell = document.createElement('span');
    timeCell.style.fontSize = '10px';
    timeCell.style.color = 'var(--color-ink-soft)';
    timeCell.textContent = h;
    row.appendChild(timeCell);

    // Grid block cell
    const blockCell = document.createElement('div');
    blockCell.style.position = 'relative';
    blockCell.style.height = '100%';
    blockCell.style.width = '100%';

    // Mock slot cards (Priya Sharma at 9am, Aarav at 11am)
    if (idx === 0) {
      blockCell.innerHTML = `
        <div class="premium-card" style="position:absolute; top:2px; bottom:2px; left:0; right:20px; background:var(--color-primary-soft); border-left:4px solid var(--color-primary); display:flex; align-items:center; padding:0 12px; font-size:11px; z-index:5;">
          <strong>Priya Sharma</strong> (OPD consultation with Dr. Elena Patel)
        </div>
      `;
    } else if (idx === 2) {
      blockCell.innerHTML = `
        <div class="premium-card" style="position:absolute; top:2px; bottom:2px; left:0; right:40px; background:var(--color-honey-soft); border-left:4px solid var(--color-honey); display:flex; align-items:center; padding:0 12px; font-size:11px; z-index:5;">
          <strong>Aarav Patel</strong> (Follow-up consultation with Dr. Sarah Smith)
        </div>
      `;
    }

    row.appendChild(blockCell);
    grid.appendChild(row);
  });

  // Render doctors filter listing
  const docList = document.getElementById('calendar-doctor-filter-list');
  docList.innerHTML = '';
  mockDoctors.forEach(doc => {
    const label = document.createElement('label');
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.gap = '8px';
    label.style.fontSize = '11px';
    label.innerHTML = `
      <input type="checkbox" checked/>
      <span>${doc.name} (${doc.specialty})</span>
    `;
    docList.appendChild(label);
  });
}

function triggerMockRosterBlock() {
  dispatchToast('info', 'Simulated blocking active chamber calendar roster for 14:00 - 15:00.');
}

// ==========================================
// 8. PATIENT DIRECTORY
// ==========================================

function filterPatientDirectoryList() {
  const q = document.getElementById('input-patient-search-dir').value.toLowerCase();
  renderPatientDirectoryTable(q);
}

function renderPatientDirectoryTable(query = '') {
  const tbody = document.getElementById('patient-dir-tbody');
  tbody.innerHTML = '';

  const list = queuePatients.filter(p => p.name.toLowerCase().includes(query) || p.phone.includes(query));

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--color-ink-soft);">No patients match search index filter.</td></tr>`;
    return;
  }

  list.forEach(p => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--color-border)';
    tr.innerHTML = `
      <td style="padding:10px; font-weight:600; color:var(--color-primary);">${p.id.toUpperCase()}</td>
      <td style="padding:10px; font-weight:600;">${p.name}</td>
      <td style="padding:10px;">${p.phone}</td>
      <td style="padding:10px;">${p.bloodGroup}</td>
      <td style="padding:10px; color:var(--color-danger); font-weight:500;">${p.allergies}</td>
      <td style="padding:10px; font-weight:600;">₹${p.invoiceSettled ? '0' : '500'}</td>
      <td style="padding:10px; text-align:right;">
        <button class="btn btn-secondary" onclick="switchClinicPanel('queue'); selectQueuePatient('${p.id}');" style="padding:2px 8px; font-size:10px;">Load Queue Check-In</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================
// 9. RECEPTION DRAWER CLOSINGS
// ==========================================

let drawerClosedLogs = [
  { time: '13 Jul 2026, 08:00 PM', receptionist: 'Nina Torres', physical: 1450, expected: 1450, notes: 'Balanced perfectly.' },
  { time: '12 Jul 2026, 08:00 PM', receptionist: 'Nina Torres', physical: 1200, expected: 1250, notes: '₹50 short discrepancy logged.' }
];

function renderReceptionDrawerPanel() {
  const table = document.getElementById('drawer-shift-audit-logs');
  table.innerHTML = '';

  drawerClosedLogs.forEach(log => {
    const card = document.createElement('div');
    card.className = 'premium-card';
    card.style.padding = '10px';
    card.style.fontSize = '11px';
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; font-weight:bold; margin-bottom:4px;">
        <span>${log.receptionist}</span>
        <span style="color:var(--color-ink-soft); font-weight:normal;">${log.time}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:10px; color:var(--color-ink-muted);">
        <span>Physical Cash: <strong>₹${log.physical}</strong></span>
        <span>Expected Ledger: <strong>₹${log.expected}</strong></span>
      </div>
      <p style="font-size:10px; color:var(--color-danger); font-weight:500;">${log.notes}</p>
    `;
    table.appendChild(card);
  });
}

function handleDrawerSettleAction(event) {
  event.preventDefault();
  const physVal = parseInt(document.getElementById('drawer-physical-input').value);
  const notes = document.getElementById('drawer-notes-input').value.trim();

  const expected = 1500; // Mock expected cash total
  const mismatchStr = physVal !== expected ? `₹${expected - physVal} Cash Mismatch logged.` : 'Drawer balanced perfectly.';

  drawerClosedLogs.unshift({
    time: '14 Jul 2026, 08:00 PM (Today)',
    receptionist: document.getElementById('active-user-name').textContent,
    physical: physVal,
    expected: expected,
    notes: `${mismatchStr} ${notes}`
  });

  renderReceptionDrawerPanel();
  document.getElementById('drawer-physical-input').value = '';
  document.getElementById('drawer-notes-input').value = '';

  dispatchToast('success', `Cash Drawer reconciled: ${mismatchStr}`);
}

// ==========================================
// 10. BILLING LEDGERS
// ==========================================

function renderBillingLedgerTable() {
  const tbody = document.getElementById('billing-ledger-tbody');
  tbody.innerHTML = '';

  queuePatients.forEach(p => {
    let statusBadge = p.invoiceSettled 
      ? '<span class="inline-flex" style="background:var(--color-success-soft); color:var(--color-success); font-size:9px; font-weight:bold; padding:2px 6px; border-radius:4px;">Settled</span>'
      : '<span class="inline-flex" style="background:var(--color-danger-soft); color:var(--color-danger); font-size:9px; font-weight:bold; padding:2px 6px; border-radius:4px;">Balance Due</span>';
    
    let subtotal = p.fee;
    p.recommendedProcedures.forEach(proc => subtotal += proc.fee);
    const total = subtotal + Math.round(subtotal * 0.05);

    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--color-border)';
    tr.innerHTML = `
      <td style="padding:10px; font-weight:600; color:var(--color-primary);">INV-${p.token}982</td>
      <td style="padding:10px; font-weight:600;">${p.name}</td>
      <td style="padding:10px;">14 Jul 2026</td>
      <td style="padding:10px; font-weight:bold;">₹${total}</td>
      <td style="padding:10px;">₹${p.invoiceSettled ? total : p.preConsultPaid ? p.fee : 0}</td>
      <td style="padding:10px;">${statusBadge}</td>
      <td style="padding:10px; text-align:right;">
        <button class="btn btn-secondary" onclick="switchClinicPanel('queue'); selectQueuePatient('${p.id}');" style="padding:2px 8px; font-size:10px;">Open Checkout POS</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================
// 11. REPORTS & CHARTS
// ==========================================

function renderReportsAnalytics() {
  const chart = document.getElementById('reports-mock-bar-chart');
  chart.innerHTML = '';

  const chartData = [
    { label: '09:00', height: 40, value: '₹2,500' },
    { label: '10:00', height: 75, value: '₹4,800' },
    { label: '11:00', height: 110, value: '₹6,400' },
    { label: '12:00', height: 95, value: '₹5,200' },
    { label: '01:00', height: 30, value: '₹1,800' },
    { label: '02:00', height: 50, value: '₹3,000' }
  ];

  chartData.forEach(item => {
    const col = document.createElement('div');
    col.style.display = 'flex';
    col.style.flexDirection = 'column';
    col.style.alignItems = 'center';
    col.style.flex = '1';
    col.innerHTML = `
      <span style="font-size:9px; font-weight:bold; color:var(--color-primary); margin-bottom:4px;">${item.value}</span>
      <div style="width:100%; height:${item.height}px; background:var(--color-primary); border-top-left-radius:4px; border-top-right-radius:4px;"></div>
      <span style="font-size:9px; color:var(--color-ink-soft); margin-top:4px;">${item.label}</span>
    `;
    chart.appendChild(col);
  });
}

// ==========================================
// 12. CLINIC SETTINGS & PROVISIONING
// ==========================================

function switchSettingsSubtab(tab) {
  selectedSettingsSubtab = tab;
  document.getElementById('settings-subtab-btn-practice').style.borderBottomColor = tab === 'practice' ? 'var(--color-primary)' : 'transparent';
  document.getElementById('settings-subtab-btn-team').style.borderBottomColor = tab === 'team' ? 'var(--color-primary)' : 'transparent';

  document.getElementById('settings-subpanel-practice').style.display = tab === 'practice' ? 'block' : 'none';
  document.getElementById('settings-subpanel-team').style.display = tab === 'team' ? 'block' : 'none';

  if (tab === 'team') {
    renderTeamProvisioningTable();
  }
}

function renderTeamProvisioningTable() {
  const tbody = document.getElementById('settings-team-tbody');
  tbody.innerHTML = '';

  const fullList = [...mockDoctors, ...mockStaff];

  fullList.forEach(m => {
    const isDoc = m.role === 'doctor';
    const roleLabel = isDoc ? 'Clinician' : m.role === 'nurse' ? 'Nurse' : m.role === 'receptionist' ? 'Receptionist' : 'Practice Manager';
    const provStr = m.provMode || 'Managed';
    
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--color-border)';
    tr.innerHTML = `
      <td style="padding:10px; font-weight:600;">${m.name}</td>
      <td style="padding:10px; text-transform:capitalize;">${roleLabel}</td>
      <td style="padding:10px;">${m.email}</td>
      <td style="padding:10px; font-size:11px; color:var(--color-ink-soft); font-weight:500;">${provStr}</td>
      <td style="padding:10px;"><span style="background:var(--color-success-soft); color:var(--color-success); font-size:9px; font-weight:bold; padding:2px 6px; border-radius:4px; text-transform:uppercase;">Active</span></td>
      <td style="padding:10px; text-align:right;">
        <button class="btn btn-secondary" onclick="suspendStaffProfileMock('${m.name}')" style="padding:2px 6px; font-size:10px; color:var(--color-danger);">Suspend</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function suspendStaffProfileMock(name) {
  dispatchToast('info', `Suspended profile account credentials for ${name}`);
}

function savePracticeConfig(event) {
  event.preventDefault();
  const name = document.getElementById('setting-practice-name').value;
  const mode = document.getElementById('setting-booking-mode').value;
  
  document.getElementById('label-clinic-brand').textContent = name;
  document.getElementById('badge-scheduling-mode').textContent = mode === 'token' ? 'Token Queue Mode' : mode === 'appointment' ? 'Appointment Mode' : 'Hybrid Mode';
  
  dispatchToast('success', 'Practice settings configuration updated and synced.');
}

// ==========================================
// 13. PATIENT MOBILE WORKSPACE
// ==========================================

let caretakerProfileContext = 'self';

function switchMobileNavTab(tabName) {
  document.querySelectorAll('.mobile-nav-item').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.mobile-tab-view').forEach(view => view.style.display = 'none');
  
  const mnavItem = document.getElementById(`mnav-${tabName}`);
  if (mnavItem) mnavItem.classList.add('active');
  
  const targetView = document.getElementById(`m-tab-patient-${tabName}`);
  if (targetView) targetView.style.display = 'flex';

  if (tabName === 'home') {
    syncMobileAppHome();
  } else if (tabName === 'vault') {
    renderMobileVaultTimeline();
  } else if (tabName === 'book') {
    renderMobileBookingDoctors();
  }
}

function handleCaretakerProfileChange() {
  caretakerProfileContext = document.getElementById('patient-caretaker-dependent-selector').value;
  const avatar = document.getElementById('patient-avatar-badge');
  avatar.textContent = caretakerProfileContext === 'self' ? 'PS' : 'AS';
  
  syncMobileAppHome();
  renderMobileVaultTimeline();
  dispatchToast('info', `Switched app profile to ${caretakerProfileContext === 'self' ? 'Priya Sharma' : 'Aarav Sharma'}`);
}

function syncMobileAppHome() {
  const card = document.getElementById('mobile-appointment-status-card');
  const reminders = document.getElementById('mobile-medication-reminders-list');

  const pSelf = queuePatients.find(p => p.id === 'pat-12');
  const pChild = queuePatients.find(p => p.id === 'pat-13'); // Aarav Patel in queue
  
  const activeUser = caretakerProfileContext === 'self' ? pSelf : pChild;

  if (activeUser && activeUser.status !== 'Serviced') {
    // Determine token display
    const label = activeUser.status === 'In Chamber' ? 'Active Consultation' : 'Waiting in Queue';
    card.innerHTML = `
      <p style="font-size:10px; opacity:0.8; text-transform:uppercase; font-weight:bold;">${label}</p>
      <h4 style="font-size:18px; color:#FFF; margin:6px 0;">Token #${activeUser.token}</h4>
      <p style="font-size:11px; opacity:0.9;">Doctor: Elena Patel · Status: ${activeUser.status}</p>
    `;
    card.style.background = 'var(--color-primary)';
  } else {
    card.innerHTML = `
      <p style="font-size:10px; opacity:0.8; text-transform:uppercase; font-weight:bold;">Next Appointment</p>
      <h4 style="font-size:14px; color:#FFF; margin:6px 0;">No active visits scheduled</h4>
      <button class="btn btn-honey" onclick="switchMobileNavTab('book')" style="width:100%; border:none; margin-top:8px;">Schedule Visit Slot</button>
    `;
    card.style.background = 'var(--color-ink-muted)';
  }

  // Sync reminders
  reminders.innerHTML = '';
  if (activeUser && activeUser.rxItems && activeUser.rxItems.length > 0) {
    activeUser.rxItems.forEach(med => {
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.justifyContent = 'space-between';
      div.style.background = 'var(--bg-secondary)';
      div.style.padding = '8px';
      div.style.borderRadius = '6px';
      div.style.fontSize = '11px';
      div.innerHTML = `
        <strong>${med.name}</strong>
        <span style="color:var(--color-honey-deep); font-weight:bold;">${med.freq}</span>
      `;
      reminders.appendChild(div);
    });
  } else {
    reminders.innerHTML = '<p style="font-size:11px; color:var(--color-ink-soft);">No medications logged in current prescription.</p>';
  }
}

function renderMobileVaultTimeline() {
  const container = document.getElementById('mobile-vault-timeline');
  container.innerHTML = '';

  const pSelf = queuePatients.find(p => p.id === 'pat-12');
  const pChild = queuePatients.find(p => p.id === 'pat-13');
  const activeUser = caretakerProfileContext === 'self' ? pSelf : pChild;

  if (!activeUser || !activeUser.history || activeUser.history.length === 0) {
    container.innerHTML = '<p style="font-size:12px; color:var(--color-ink-soft); text-align:center;">No files found in Vault.</p>';
    return;
  }

  activeUser.history.forEach(item => {
    const card = document.createElement('div');
    card.className = 'premium-card';
    card.style.padding = '14px';
    card.style.background = '#FFFFFF';
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-weight:bold; font-size:12px; color:var(--color-primary);">
        <span>${item.type}</span>
        <span style="color:var(--color-ink-soft); font-weight:normal;">${item.date}</span>
      </div>
      <p style="font-size:11px; color:var(--color-ink-muted);">${item.details}</p>
      <button class="btn btn-secondary" onclick="viewMobileVaultFileMock('${item.type}')" style="width:100%; font-size:10px; padding:4px 8px; margin-top:8px;">Open Signed Document</button>
    `;
    container.appendChild(card);
  });
}

function viewMobileVaultFileMock(type) {
  dispatchToast('success', `Opened signed secure E-Rx document for ${type}`);
}

function renderMobileBookingDoctors() {
  const select = document.getElementById('mobile-book-doctor');
  select.innerHTML = '';
  mockDoctors.forEach(doc => {
    const opt = document.createElement('option');
    opt.value = doc.id;
    opt.textContent = `${doc.name} (${doc.specialty})`;
    select.appendChild(opt);
  });
}

function handleMobileApptBooking(event) {
  event.preventDefault();
  
  // Hide form, show success
  document.getElementById('form-mobile-booking').style.display = 'none';
  document.getElementById('mobile-booking-success-box').style.display = 'flex';

  const docId = document.getElementById('mobile-book-doctor').value;
  const dateVal = document.getElementById('mobile-book-date').value;

  // Add a new patient card in queue (Unpaid status)
  const tk = queuePatients.length + 12;
  const name = caretakerProfileContext === 'self' ? 'Priya Sharma' : 'Aarav Sharma';
  
  queuePatients.push({
    id: `pat-${tk}`,
    token: tk,
    name: name,
    phone: '+91 98765 43210',
    age: caretakerProfileContext === 'self' ? 28 : 6,
    sex: caretakerProfileContext === 'self' ? 'Female' : 'Male',
    bloodGroup: caretakerProfileContext === 'self' ? 'O+' : 'A+',
    allergies: 'None',
    doctor: docId,
    service: 'Online Pre-Booking',
    fee: 500,
    status: 'Unpaid',
    preConsultPaid: false,
    elapsed: 0,
    checkinTime: dateVal,
    vitals: { bp: '120/80', hr: '76 bpm', temp: '98.6 °F', spo2: '99%' },
    history: [],
    recommendedProcedures: [],
    invoiceSettled: false
  });

  renderQueue();
  dispatchToast('success', `Pre-registered appointment slot. Generated Token #${tk}.`);
}

function resetMobileBookingForm() {
  document.getElementById('form-mobile-booking').style.display = 'flex';
  document.getElementById('mobile-booking-success-box').style.display = 'none';
  switchMobileNavTab('home');
}

function saveMobileProfileInfo() {
  dispatchToast('success', 'Profile parameters saved successfully.');
}

function unlinkDependentMock() {
  dispatchToast('info', 'Unlinked caretaker profile.');
}

// ==========================================
// 14. PLATFORM ADMIN PORTAL
// ==========================================

function renderAdminTenants() {
  const tbody = document.getElementById('admin-tenants-tbody');
  tbody.innerHTML = '';

  globalTenants.forEach(t => {
    let statBadge = t.status === 'Active' 
      ? '<span style="background:var(--color-success-soft); color:var(--color-success); font-size:9px; font-weight:bold; padding:2px 6px; border-radius:4px; text-transform:uppercase;">Active</span>'
      : '<span style="background:var(--color-danger-soft); color:var(--color-danger); font-size:9px; font-weight:bold; padding:2px 6px; border-radius:4px; text-transform:uppercase;">Suspended</span>';

    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--color-border)';
    tr.innerHTML = `
      <td style="padding:10px; font-weight:600; color:var(--color-primary);">${t.id}</td>
      <td style="padding:10px; font-weight:600;">${t.name}</td>
      <td style="padding:10px;">${t.owner}</td>
      <td style="padding:10px;">${t.specialty}</td>
      <td style="padding:10px; font-weight:500;">${t.tier}</td>
      <td style="padding:10px;">${t.status}</td>
      <td style="padding:10px; text-align:right;">
        <button class="btn btn-secondary" onclick="toggleTenantStatus('${t.id}')" style="padding:2px 6px; font-size:10px;">Toggle Access</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function toggleTenantStatus(id) {
  const t = globalTenants.find(x => x.id === id);
  if (t) {
    t.status = t.status === 'Active' ? 'Suspended' : 'Active';
    renderAdminTenants();
    dispatchToast('success', `Tenant status toggled for ${t.name}`);
  }
}

function triggerMockTenantCreation() {
  const tk = globalTenants.length + 1;
  globalTenants.push({
    id: `TEN-00${tk}`,
    name: 'Metropolis Care Clinic',
    owner: 'Dr. Bruce Banner',
    specialty: 'General Practice',
    tier: 'Professional',
    status: 'Active'
  });
  renderAdminTenants();
  dispatchToast('success', 'Created a mock SaaS tenant configuration.');
}

// ==========================================
// 15. MODAL MANAGER UTILITIES
// ==========================================

function openWalkinModal() {
  document.getElementById('modal-walkin-registration').style.display = 'flex';
  renderWalkinDocSelect();
}

function closeWalkinModal() {
  document.getElementById('modal-walkin-registration').style.display = 'none';
}

function renderWalkinDocSelect() {
  const select = document.getElementById('walkin-assigned-doctor');
  select.innerHTML = '';
  mockDoctors.forEach(doc => {
    const opt = document.createElement('option');
    opt.value = doc.id;
    opt.textContent = `${doc.name} (${doc.specialty})`;
    select.appendChild(opt);
  });
}

function handleWalkinPhoneBlur() {
  // Fuzzy search simulation
}

function searchWalkinPhone() {
  dispatchToast('info', 'Searching patient database...');
  setTimeout(() => {
    dispatchToast('success', 'Phone match not found. Creating new clinical profile.');
  }, 200);
}

function handleWalkinRegistrationSubmit(event) {
  event.preventDefault();
  
  const name = document.getElementById('walkin-name').value.trim();
  const phone = document.getElementById('walkin-phone').value.trim();
  const sex = document.getElementById('walkin-sex').value;
  const blood = document.getElementById('walkin-blood').value.trim();
  const docId = document.getElementById('walkin-assigned-doctor').value;

  const tk = queuePatients.length + 12;

  queuePatients.push({
    id: `pat-${tk}`,
    token: tk,
    name: name,
    phone: phone,
    age: 26,
    sex: sex,
    bloodGroup: blood,
    allergies: 'None',
    doctor: docId,
    service: 'Walk-in Consultation',
    fee: 500,
    status: 'Unpaid',
    preConsultPaid: false,
    elapsed: 0,
    checkinTime: '09:45 AM',
    vitals: { bp: '120/80', hr: '74 bpm', temp: '98.6 °F', spo2: '99%' },
    history: [],
    recommendedProcedures: [],
    invoiceSettled: false
  });

  closeWalkinModal();
  renderQueue();
  dispatchToast('success', `Created check-in profile for ${name}. Token Issued: #${tk}.`);
}

function openProvisionStaffModal() {
  document.getElementById('modal-provision-staff').style.display = 'flex';
}

function closeProvisionStaffModal() {
  document.getElementById('modal-provision-staff').style.display = 'none';
}

function toggleProvisioningMode(mode) {
  selectedProvisioningMode = mode;
  document.getElementById('prov-mode-managed').style.borderBottomColor = mode === 'managed' ? 'var(--color-primary)' : 'transparent';
  document.getElementById('prov-mode-self').style.borderBottomColor = mode === 'self' ? 'var(--color-primary)' : 'transparent';

  document.getElementById('prov-managed-fields').style.display = mode === 'managed' ? 'flex' : 'none';
  document.getElementById('prov-self-fields').style.display = mode === 'self' ? 'flex' : 'none';
}

function handleProvisionStaffSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('prov-name').value;
  const role = document.getElementById('prov-role').value;
  const email = document.getElementById('prov-email').value;

  const initials = name.split(' ').map(x => x[0]).join('');

  if (role === 'doctor') {
    mockDoctors.push({ id: `doc-${initials.toLowerCase()}`, name, role, email, specialty: 'General', initials, provMode: selectedProvisioningMode });
  } else {
    mockStaff.push({ id: `staff-${initials.toLowerCase()}`, name, role, email, initials, provMode: selectedProvisioningMode });
  }

  closeProvisionStaffModal();
  renderTeamProvisioningTable();
  dispatchToast('success', `Provisioned ${role.toUpperCase()} account for ${name} via ${selectedProvisioningMode.toUpperCase()}`);
}

// Active consultation switch validation modal (Rule 3 Context lock)
let pendingEncounterSwitchPatientId = null;

function triggerEncounterSwitchBlock(targetId) {
  pendingEncounterSwitchPatientId = targetId;
  const modal = document.getElementById('modal-encounter-switch-confirm');
  const targetPatient = queuePatients.find(p => p.id === targetId);
  const activePatient = queuePatients.find(p => p.id === activeEncounterPatientId);
  
  document.getElementById('encounter-switch-confirm-text').innerHTML = `You have an active session in progress with <strong>${activePatient.name}</strong>. Save clinical drafts and switch to <strong>${targetPatient.name}</strong>?`;
  modal.style.display = 'flex';
}

function confirmClinicalSessionSwitch() {
  const prevId = activeEncounterPatientId;
  activeEncounterPatientId = pendingEncounterSwitchPatientId;
  pendingEncounterSwitchPatientId = null;
  
  const modal = document.getElementById('modal-encounter-switch-confirm');
  modal.style.display = 'none';

  // Release previous patient to waiting list
  const prevPatient = queuePatients.find(p => p.id === prevId);
  if (prevPatient) prevPatient.status = 'Waiting';

  const newPatient = queuePatients.find(p => p.id === activeEncounterPatientId);
  if (newPatient) newPatient.status = 'In Chamber';

  renderQueue();
  renderActiveQueueDetail();
  renderClinicalEMR();
  
  dispatchToast('success', `Consultation context locked to ${newPatient.name}`);
}

function closeEncounterSwitchModal() {
  document.getElementById('modal-encounter-switch-confirm').style.display = 'none';
  pendingEncounterSwitchPatientId = null;
}

// ==========================================
// 16. TOAST DISPATCH SYSTEM
// ==========================================

function dispatchToast(type, text) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  
  let icon = 'ℹ️';
  let border = 'var(--color-primary)';
  if (type === 'success') { icon = '✓'; border = 'var(--color-success)'; }
  if (type === 'danger') { icon = '⚠️'; border = 'var(--color-danger)'; }
  if (type === 'warning') { icon = '🚨'; border = 'var(--color-warning)'; }

  toast.style.borderLeftColor = border;
  toast.innerHTML = `
    <span>${icon}</span>
    <span>${text}</span>
  `;
  container.appendChild(toast);

  // Auto remove after 3s
  setTimeout(() => {
    toast.style.animation = 'slideOut 200ms ease-in';
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}

// ==========================================
// 17. GLOBAL SHORTCUTS & OFFLINE EMULATION
// ==========================================

function toggleOffline() {
  isOfflineMode = !isOfflineMode;
  const btn = document.getElementById('btn-offline-toggle');
  
  if (isOfflineMode) {
    document.body.classList.add('offline-mode');
    btn.textContent = 'Offline Mode';
    btn.style.background = '#073D34'; // Amber Warning ground style
    dispatchToast('warning', 'Offline simulation active. Using persistent LocalCache.');
  } else {
    document.body.classList.remove('offline-mode');
    btn.textContent = 'Online (1Gbps)';
    btn.style.background = '#B91C1C';
    dispatchToast('success', 'Connection restored. Syncing local mutations to PostgreSQL ledger.');
  }
}

// Keyboard keydown routing listeners
document.addEventListener('keydown', event => {
  // 1. Ctrl+/ triggers patient search bar
  if (event.ctrlKey && event.key === '/') {
    event.preventDefault();
    if (activeClinicPanel === 'patients') {
      document.getElementById('input-patient-search-dir').focus();
    } else {
      switchClinicPanel('patients');
      setTimeout(() => document.getElementById('input-patient-search-dir').focus(), 100);
    }
  }

  // 2. Alt+N opens walkin registration
  if (event.altKey && event.key === 'n') {
    event.preventDefault();
    openWalkinModal();
  }

  // 3. Alt+P collects pre-consult payment
  if (event.altKey && event.key === 'p') {
    event.preventDefault();
    if (selectedQueuePatientId) {
      collectPreConsultPayment(selectedQueuePatientId);
    }
  }

  // 4. Alt+T prints thermal slip
  if (event.altKey && event.key === 't') {
    event.preventDefault();
    if (selectedQueuePatientId) {
      printThermalReceiptMock(selectedQueuePatientId);
    }
  }

  // 5. Alt+C switches to EMR Consultation chamber
  if (event.altKey && event.key === 'c') {
    event.preventDefault();
    if (selectedQueuePatientId) {
      routeToClinicalChamber(selectedQueuePatientId);
    }
  }

  // 6. Ctrl+Enter signs consultation notes
  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault();
    if (activeClinicPanel === 'clinical') {
      signClinicalConsultation();
    }
  }

  // 7. Escape closes modals
  if (event.key === 'Escape') {
    closeWalkinModal();
    closeProvisionStaffModal();
    closeEncounterSwitchModal();
  }
});

// ==========================================
// 18. INITIALIZATION LOGIC
// ==========================================

function renderRoster() {
  const container = document.getElementById('clinic-sidebar-roster');
  container.innerHTML = '';
  
  const fullRoster = [
    { name: 'Dr. Sarah Smith', role: 'OPD Duty', active: true },
    { name: 'Dr. Elena Patel', role: 'OPD Duty', active: true },
    { name: 'Nina Torres', role: 'Front desk', active: true }
  ];

  fullRoster.forEach(member => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';
    div.style.fontSize = '11px';
    div.innerHTML = `
      <span style="color:var(--color-ink-muted); font-weight:500;">${member.name}</span>
      <span style="font-size:9px; background:var(--color-success-soft); color:var(--color-success); padding:1px 4px; border-radius:3px; font-weight:bold;">${member.role}</span>
    `;
    container.appendChild(div);
  });
}

function handleAuthLogin(event) {
  event.preventDefault();
  switchView('clinic');
}

function handleAuthOTP(event) {
  event.preventDefault();
  switchView('patient');
}

function sendMockOTP() {
  document.getElementById('otp-field').style.display = 'block';
  document.getElementById('btn-otp-action').onclick = null;
  document.getElementById('btn-otp-action').type = 'submit';
  document.getElementById('btn-otp-action').textContent = 'Verify Credentials';
  dispatchToast('info', 'Mock OTP OTP challenge code dispatched to patient SMS.');
}

function handleClinicSignup(event) {
  event.preventDefault();
  const clinic = document.getElementById('signup-clinic-name').value;
  const owner = document.getElementById('signup-owner-name').value;
  const email = document.getElementById('signup-owner-email').value;
  const mode = document.getElementById('signup-sched-mode').value;

  document.getElementById('label-clinic-brand').textContent = clinic;
  document.getElementById('active-user-name').textContent = owner;
  document.getElementById('active-user-email');
  
  document.getElementById('badge-scheduling-mode').textContent = mode === 'token' ? 'Token Queue Mode' : mode === 'appointment' ? 'Appointment Mode' : 'Hybrid Mode';

  switchView('clinic');
  dispatchToast('success', 'Practice database initialized successfully.');
}

// Initial hydration scripts
document.addEventListener('DOMContentLoaded', () => {
  renderQueue();
  renderPatientDirectoryTable();
  renderAdminTenants();
});
