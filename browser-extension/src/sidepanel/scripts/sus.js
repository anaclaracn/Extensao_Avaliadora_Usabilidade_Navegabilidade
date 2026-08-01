/* SUS.JS — System Usability Scale (Brooke, 1986) */

const SUS_QUESTIONS = [
  { id:'q1',  text:'Eu acho que gostaria de usar este site com frequência.' },
  { id:'q2',  text:'Eu achei este site mais complexo do que o necessário.' },
  { id:'q3',  text:'Eu achei este site fácil de usar.' },
  { id:'q4',  text:'Eu acho que precisaria de ajuda de alguém para conseguir usar este site.' },
  { id:'q5',  text:'Eu achei as funções deste site bem integradas.' },
  { id:'q6',  text:'Eu achei que havia muita inconsistência neste site.' },
  { id:'q7',  text:'Imagino que a maioria das pessoas aprenderia a usar este site rapidamente.' },
  { id:'q8',  text:'Eu achei este site muito difícil de usar.' },
  { id:'q9',  text:'Eu me senti confiante usando este site.' },
  { id:'q10', text:'Precisei aprender muitas coisas antes de conseguir usar este site.' },
];

const SUS_LABELS = ['Discordo\ntotalmente', 'Discordo', 'Neutro', 'Concordo', 'Concordo\ntotalmente'];

let susAnswers = {};

function bindSus() {
  $('btn-submit-sus').addEventListener('click', submitSus);
  $('btn-skip-sus').addEventListener('click', () => showScreen('sus-done'));
  $('btn-sus-done-new').addEventListener('click', () => {
    chrome.runtime.sendMessage({action:'resetStats'});
    clearSessionState();
    S.sessionId=null; S.userId=null; S.sessionStart=null;
    S.activeTestId=null; S.activeTestName=null;
    S.tasks=[]; S.activeTaskIdx=null; S.taskTimerMs=0;
    S.completedTestIds=[];
    showScreen('identify'); resetIdentifyUI();
  });
}

function enterSusScreen() {
  susAnswers = {};
  showScreen('sus');
  renderSusQuestions();
}

function renderSusQuestions() {
  const container = $('sus-questions-container');
  container.innerHTML = '';

  SUS_QUESTIONS.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'card sus-card';
    card.innerHTML = `
      <p class="sus-question"><span class="sus-num">${idx + 1}.</span> ${q.text}</p>
      <div class="sus-scale" id="sus-scale-${q.id}">
        ${[1,2,3,4,5].map(v => `
          <button class="sus-btn" data-q="${q.id}" data-v="${v}">
            <span class="sus-val">${v}</span>
            <span class="sus-lbl">${SUS_LABELS[v-1]}</span>
          </button>
        `).join('')}
      </div>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll('.sus-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.q, v = parseInt(btn.dataset.v);
      susAnswers[q] = v;
      document.querySelectorAll(`[data-q="${q}"]`).forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
}

async function submitSus() {
  hide('sus-error');
  const missing = SUS_QUESTIONS.filter(q => !susAnswers[q.id]);
  if (missing.length) {
    showErr('sus-error', `Responda todas as perguntas antes de enviar (faltam ${missing.length}).`);
    document.getElementById(`sus-scale-${missing[0].id}`)?.scrollIntoView({behavior:'smooth', block:'center'});
    return;
  }

  const btn = $('btn-submit-sus');
  btn.disabled = true; btn.textContent = 'Enviando...';

  try {
    // Buscar site_id via sessão atual
    let siteId = null;
    try {
      const sessRes = await api('GET', `/sessions/${S.sessionId}`);
      siteId = sessRes.data?.site_id || null;
    } catch(_) {}

    await api('POST', '/metrics/sus', {
      user_id: S.userId,
      site_id: siteId,
      ...susAnswers,
    });

    showScreen('sus-done');
  } catch(err) {
    showErr('sus-error', `Erro ao enviar: ${err.message}`);
    btn.disabled = false; btn.textContent = 'Enviar respostas';
  }
}
