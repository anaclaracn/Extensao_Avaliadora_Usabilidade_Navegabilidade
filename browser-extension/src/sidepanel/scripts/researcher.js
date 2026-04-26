/* RESEARCHER.JS — Cadastro de pesquisador e painel admin */

// ── CADASTRO ──────────────────────────────────────────────────
function enterRegister(){
  showScreen('register');
  ['reg-master','reg-name','reg-email','reg-password','reg-password-confirm'].forEach(id=>$(id).value='');
  hide('reg-form-body'); hide('reg-master-error'); hide('reg-error');
  $('reg-master').addEventListener('input',function onInput(){
    if(this.value===MASTER_PASSWORD){ show('reg-form-body'); hide('reg-master-error'); this.style.borderColor='var(--success)'; this.removeEventListener('input',onInput); }
  });
  $('btn-register').addEventListener('click', registerResearcher);
  $('btn-back-register').addEventListener('click',()=>{ showScreen('identify'); resetIdentifyUI(); $('role-admin').classList.add('selected'); show('form-admin'); });
}

async function registerResearcher(){
  hide('reg-error');
  const master=$('reg-master').value, name=$('reg-name').value.trim();
  const email=$('reg-email').value.trim().toLowerCase(), pwd=$('reg-password').value, pwdConf=$('reg-password-confirm').value;
  if(master!==MASTER_PASSWORD)     return showErr('reg-master-error','Senha mestra incorreta.');
  if(!name)                        return showErr('reg-error','Informe o nome completo.');
  if(!email||!email.includes('@')) return showErr('reg-error','Informe um e-mail válido.');
  if(pwd.length<6)                 return showErr('reg-error','Senha mínima de 6 caracteres.');
  if(pwd!==pwdConf)                return showErr('reg-error','As senhas não coincidem.');
  const btn=$('btn-register'); btn.disabled=true; btn.textContent='Criando conta...';
  try {
    const res=await api('POST','/researchers/register',{name,email,password:pwd,master_password:master});
    S.loggedResearcher={id:res.data.id,name:res.data.name,email:res.data.email};
    await chrome.storage.session.set({[LOGGED_KEY]:S.loggedResearcher});
    enterAdmin();
  } catch(err){ showErr('reg-error',err.message); }
  finally { btn.disabled=false; btn.textContent='Criar conta →'; }
}

// ── ADMIN PANEL ───────────────────────────────────────────────
function enterAdmin(){
  showScreen('admin');
  let host='—'; try{ host=new URL(S.currentSiteUrl).hostname; }catch(_){}
  $('admin-site-label').textContent=host;
  if(S.loggedResearcher?.name){ $('researcher-name-display').textContent='👤 '+S.loggedResearcher.name; $('researcher-badge').classList.remove('hidden'); }
  loadAdminTests();
}

async function loadAdminTests(){
  const list=$('admin-tests-list'); list.innerHTML='<p class="empty-state">Carregando...</p>';
  try {
    const res=await api('GET',`/tests?site_url=${encodeURIComponent(S.currentSiteUrl||'')}`);
    const tests=res.data||[];
    if(!tests.length){ list.innerHTML='<p class="empty-state">Nenhum teste para este site ainda.</p>'; return; }
    list.innerHTML='';
    tests.forEach(t=>{
      const el=document.createElement('div'); el.className='test-item';
      el.innerHTML=`<span class="test-item-icon">📋</span><div class="test-item-info"><div class="test-item-name">${t.name}</div><div class="test-item-meta">id #${t.id}</div></div><button class="btn-start-task" style="font-size:10px" data-id="${t.id}" data-name="${t.name}">Editar tarefas</button>`;
      el.querySelector('button').addEventListener('click',(e)=>{ e.stopPropagation(); S.activeTestId=parseInt(e.target.dataset.id); S.activeTestName=e.target.dataset.name; $('tasks-test-badge').textContent=S.activeTestName; show('tasks-section'); loadAdminTasks(); });
      list.appendChild(el);
    });
  } catch(err){ list.innerHTML=`<p class="empty-state" style="color:#dc2626">Erro: ${err.message}</p>`; }
}

async function loadAdminTasks(){
  if(!S.activeTestId) return;
  try{ const res=await api('GET',`/tasks?test_id=${S.activeTestId}`); S.tasks=res.data||[]; renderAdminTasks(); }catch(_){}
}

function renderAdminTasks(){
  const list=$('tasks-list'); list.innerHTML='';
  if(!S.tasks.length){ list.innerHTML='<p class="empty-state">Nenhuma tarefa ainda.</p>'; return; }
  S.tasks.forEach((t,i)=>{ const el=document.createElement('div'); el.className='task-item'; el.innerHTML=`<span class="task-num">${i+1}</span><span class="task-text">${t.description}</span>`; list.appendChild(el); });
}

function bindAdmin(){
  $('btn-create-test').addEventListener('click',async()=>{
    const name=getText('test-name');
    if(!name) return showFeedback('test-feedback','Digite o nome do teste.',true);
    try {
      const tRes=await api('POST','/tests',{name,site_url:S.currentSiteUrl||'http://desconhecido'});
      S.activeTestId=tRes.data.id; S.activeTestName=tRes.data.name;
      $('test-name').value=''; $('tasks-test-badge').textContent=name; show('tasks-section');
      let host=S.currentSiteUrl; try{ host=new URL(S.currentSiteUrl).hostname; }catch(_){}
      showFeedback('test-feedback',`✓ Teste "${name}" criado para ${host}!`);
      loadAdminTests();
    } catch(err){ showFeedback('test-feedback',`Erro: ${err.message}`,true); }
  });

  $('btn-add-task').addEventListener('click',async()=>{
    const desc=getText('task-description');
    if(!desc)           return showFeedback('task-feedback','Digite a descrição.',true);
    if(!S.activeTestId) return showFeedback('task-feedback','Crie um teste primeiro.',true);
    try {
      const res=await api('POST','/tasks',{test_id:S.activeTestId,description:desc});
      S.tasks.push(res.data); $('task-description').value=''; renderAdminTasks(); showFeedback('task-feedback','✓ Tarefa adicionada!');
    } catch(err){ showFeedback('task-feedback',`Erro: ${err.message}`,true); }
  });

  $('task-description').addEventListener('keydown',e=>{ if(e.key==='Enter') $('btn-add-task').click(); });

  $('btn-logout-admin').addEventListener('click',async()=>{
    S.loggedResearcher=null;
    await chrome.storage.session.remove([LOGGED_KEY]);
    showScreen('identify'); resetIdentifyUI();
    $('admin-password').value=''; $('admin-email').value='';
  });
}
