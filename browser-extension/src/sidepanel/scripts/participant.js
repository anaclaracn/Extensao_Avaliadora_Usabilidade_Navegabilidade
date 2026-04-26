/* PARTICIPANT.JS — Escolha de teste, sessão ativa, timer, resultados */

// ── PICK-TEST ─────────────────────────────────────────────────
function bindPickTest(){
  $('btn-back-from-pick').addEventListener('click',()=>{ showScreen('identify'); resetIdentifyUI(); });
}

async function enterPickTest(){
  showScreen('pick-test');
  let host='—'; try{ host=new URL(S.currentSiteUrl).hostname; }catch(_){}
  $('pick-site-label').textContent=host;
  const list=$('tests-list');
  list.innerHTML='<p class="empty-state">Carregando testes...</p>';
  try {
    const res=await api('GET',`/tests?site_url=${encodeURIComponent(S.currentSiteUrl||'')}`);
    const tests=res.data||[];
    if(!tests.length){ list.innerHTML='<p class="empty-state">Nenhum teste configurado para este site.<br>Peça ao pesquisador para criar um.</p>'; return; }
    list.innerHTML='';
    tests.forEach(test=>{
      const el=document.createElement('div'); el.className='test-item';
      el.innerHTML=`<span class="test-item-icon">📋</span><div class="test-item-info"><div class="test-item-name">${test.name}</div><div class="test-item-meta">id #${test.id}</div></div><span class="test-item-arrow">›</span>`;
      el.addEventListener('click',()=>selectTest(test));
      list.appendChild(el);
    });
  } catch(err){ list.innerHTML=`<p class="empty-state" style="color:#dc2626">Erro: ${err.message}</p>`; }
}

async function selectTest(test){
  S.activeTestId=test.id; S.activeTestName=test.name;
  try{ const res=await api('GET',`/tasks?test_id=${test.id}`); S.tasks=(res.data||[]).map(t=>({...t,_done:false,_success:false})); }
  catch(_){ S.tasks=[]; }
  saveSessionState(); enterSession(false);
}

// ── SESSION ───────────────────────────────────────────────────
function bindSession(){
  $('btn-task-done').addEventListener('click',()=>finishTask(true));
  $('btn-task-skip').addEventListener('click',()=>finishTask(false));
  $('btn-end-session').addEventListener('click', endSession);
}

function enterSession(restoring=false){
  showScreen('session');
  let host='—'; try{ host=new URL(S.currentSiteUrl).hostname; }catch(_){}
  $('session-site-label').textContent=host;
  $('session-test-name').textContent=S.activeTestName||'Teste';
  if(restoring&&S.activeTaskIdx!==null){
    const task=S.tasks[S.activeTaskIdx];
    if(task&&!task._done){ $('active-task-desc').textContent=task.description; show('active-task-card'); resumeTaskTimer(); }
  }
  renderSessionTasks(); startStatsInterval();
}

function renderSessionTasks(){
  const list=$('session-tasks-list'); list.innerHTML='';
  if(!S.tasks.length){ list.innerHTML='<p class="empty-state">Nenhuma tarefa neste teste.</p>'; return; }
  S.tasks.forEach((t,i)=>{
    const isActive=S.activeTaskIdx===i, completed=t._done;
    const el=document.createElement('div'); el.className='task-item'; el.id=`stask-${t.id}`;
    if(isActive)  el.classList.add('task-active');
    if(completed) el.classList.add(t._success?'task-success':'task-fail');
    const icon=completed?(t._success?'✅':'❌'):(isActive?'⏱':'○');
    const canStart=!completed&&!isActive&&S.activeTaskIdx===null;
    el.innerHTML=`<span class="task-num">${i+1}</span><span class="task-text">${t.description}</span><span class="task-status-icon">${icon}</span>${canStart?`<button class="btn-start-task" data-idx="${i}">Começar</button>`:''}`;
    list.appendChild(el);
  });
  list.querySelectorAll('.btn-start-task').forEach(btn=>btn.addEventListener('click',()=>startTask(parseInt(btn.dataset.idx))));
}

function startTask(idx){
  if(S.activeTaskIdx!==null) return;
  const task=S.tasks[idx]; S.activeTaskIdx=idx; S.taskTimerMs=0;
  chrome.runtime.sendMessage({action:'startTask',taskId:task.id,description:task.description});
  $('active-task-desc').textContent=task.description;
  $('active-task-timer').textContent='00:00'; $('active-task-clicks').textContent='0';
  show('active-task-card'); resumeTaskTimer(); saveSessionState(); renderSessionTasks();
}

function resumeTaskTimer(){
  clearInterval(S.taskTimerInt);
  S.taskTimerInt=setInterval(()=>{
    S.taskTimerMs+=1000; $('active-task-timer').textContent=fmtMs(S.taskTimerMs); saveSessionState();
    chrome.runtime.sendMessage({action:'getEventStats'},(res)=>{ if(res?.stats?.activeTask) $('active-task-clicks').textContent=res.stats.activeTask.clicks||0; });
  },1000);
}

async function finishTask(success){
  clearInterval(S.taskTimerInt);
  await new Promise(resolve=>{
    chrome.runtime.sendMessage({action:success?'completeTask':'skipTask',success},(res)=>{
      if(res?.result){ const task=S.tasks[S.activeTaskIdx]; task._done=true; task._success=success; task._durationMs=res.result.durationMs; task._clicks=res.result.clicks; }
      S.activeTaskIdx=null; S.taskTimerMs=0; hide('active-task-card'); saveSessionState(); renderSessionTasks(); resolve();
    });
  });
}

async function endSession(){
  if(!confirm('Encerrar a sessão e ver os resultados?')) return;
  if(S.activeTaskIdx!==null) await finishTask(false);
  clearInterval(S.taskTimerInt); clearInterval(S.statsInt);
  if(S.sessionId){ try{ await api('PATCH',`/sessions/${S.sessionId}/end`,{}); }catch(_){} }
  showResults();
}

function startStatsInterval(){ clearInterval(S.statsInt); S.statsInt=setInterval(updateSessionStats,1000); }
function updateSessionStats(){
  chrome.runtime.sendMessage({action:'getEventStats'},(res)=>{
    if(!res?.stats) return;
    $('s-events').textContent=res.stats.eventsCollected||0;
    $('s-time').textContent=fmtSec(res.stats.sessionDuration||0);
    $('s-done').textContent=S.tasks.filter(t=>t._done).length;
  });
}

// ── RESULTS ───────────────────────────────────────────────────
function bindResults(){
  $('btn-new-session').addEventListener('click',()=>{
    chrome.runtime.sendMessage({action:'resetStats'}); clearSessionState();
    S.sessionId=null; S.userId=null; S.sessionStart=null; S.activeTestId=null; S.activeTestName=null; S.tasks=[]; S.activeTaskIdx=null; S.taskTimerMs=0;
    showScreen('identify'); resetIdentifyUI();
  });
}

async function showResults(){
  showScreen('results'); $('results-test-name').textContent=S.activeTestName||'—';
  const bgStats=(await new Promise(r=>chrome.runtime.sendMessage({action:'getEventStats'},r)))?.stats||{};
  const done=S.tasks.filter(t=>t._done), succeeded=done.filter(t=>t._success);
  const totalMs=done.reduce((a,t)=>a+(t._durationMs||0),0), totalClks=done.reduce((a,t)=>a+(t._clicks||0),0);
  const sessionSec=bgStats.sessionDuration||Math.floor((Date.now()-S.sessionStart)/1000);
  $('m-success-rate').textContent=done.length>0?Math.round((succeeded.length/S.tasks.length)*100)+'%':'—';
  $('m-total-time').textContent=fmtSec(sessionSec); $('m-total-clicks').textContent=totalClks;
  $('m-avg-time').textContent=done.length>0?fmtMs(Math.round(totalMs/done.length)):'—';
  $('m-avg-clicks').textContent=done.length>0?Math.round(totalClks/done.length):'—';
  $('m-events').textContent=bgStats.eventsCollected||0;
  const bd=$('tasks-breakdown'); bd.innerHTML='';
  S.tasks.forEach((t,i)=>{
    const el=document.createElement('div'); el.className='breakdown-item';
    const status=!t._done?'<span class="breakdown-badge" style="background:#f3f4f6;color:#6b7280">Não iniciada</span>':t._success?'<span class="breakdown-badge ok">Concluída ✓</span>':'<span class="breakdown-badge fail">Não concluída ✗</span>';
    el.innerHTML=`<div class="breakdown-header"><span class="breakdown-num">#${i+1}</span><span class="breakdown-desc">${t.description}</span>${status}</div><div class="breakdown-stats"><span class="bstat">⏱ <strong>${t._durationMs!=null?fmtMs(t._durationMs):'—'}</strong></span><span class="bstat">🖱 <strong>${t._clicks!=null?t._clicks:'—'}</strong> clicks</span></div>`;
    bd.appendChild(el);
  });
  saveSessionState();
}
