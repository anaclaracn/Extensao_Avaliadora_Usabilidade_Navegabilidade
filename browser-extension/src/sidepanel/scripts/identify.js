/* IDENTIFY.JS — Tela principal: seleção de papel, cadastro de participante, login */

function bindIdentify(){
  ['participant','admin'].forEach(role=>{
    $(`role-${role}`).addEventListener('click',()=>{
      document.querySelectorAll('.role-btn').forEach(b=>b.classList.remove('selected'));
      $(`role-${role}`).classList.add('selected');
      hide('form-participant'); hide('form-admin');
      hideErr('participant-error'); hideErr('admin-error');
      show(`form-${role}`);
    });
  });
  bindPills('gender-group','p-gender');
  bindPills('education-group','p-education');
  $('btn-start-participant').addEventListener('click', startParticipant);
  $('btn-login-admin').addEventListener('click', loginAdmin);
  $('admin-password').addEventListener('keydown', e=>{ if(e.key==='Enter') loginAdmin(); });
  $('admin-email').addEventListener('keydown',   e=>{ if(e.key==='Enter') loginAdmin(); });
  $('btn-go-register').addEventListener('click', ()=>enterRegister());
}

function resetIdentifyUI(){
  document.querySelectorAll('.role-btn').forEach(b=>b.classList.remove('selected'));
  hide('form-participant'); hide('form-admin');
}

function bindPills(groupId,hiddenId){
  $(groupId)?.querySelectorAll('.sel-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      $(groupId).querySelectorAll('.sel-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      $(hiddenId).value = btn.dataset.val;
    });
  });
}

async function startParticipant(){
  hideErr('participant-error');
  const age=parseInt($('p-age').value), gen=$('p-gender').value, edu=$('p-education').value;
  if(!age||age<10) return showErr('participant-error','Informe uma idade válida.');
  if(!gen)         return showErr('participant-error','Selecione o gênero.');
  if(!edu)         return showErr('participant-error','Selecione a escolaridade.');
  const btn=$('btn-start-participant');
  btn.disabled=true; btn.textContent='Criando...';
  try {
    const uRes=await api('POST','/users',{age,gender:gen,education_level:edu});
    S.userId=uRes.data.id;
    const sRes=await api('POST','/sessions',{user_id:S.userId,site_url:S.currentSiteUrl||'http://desconhecido'});
    S.sessionId=sRes.session_id; S.sessionStart=Date.now();
    chrome.runtime.sendMessage({action:'sessionCreated',sessionId:S.sessionId,userId:S.userId});
    saveSessionState(); enterPickTest();
  } catch(err){ showErr('participant-error',`Erro: ${err.message}`); }
  finally { btn.disabled=false; btn.textContent='Continuar →'; }
}

async function loginAdmin(){
  hideErr('admin-error');
  const email=$('admin-email').value.trim().toLowerCase(), pwd=$('admin-password').value;
  if(!email) return showErr('admin-error','Informe o e-mail.');
  if(!pwd)   return showErr('admin-error','Informe a senha.');
  const btn=$('btn-login-admin');
  btn.disabled=true; btn.textContent='Entrando...';
  try {
    const res=await api('POST','/researchers/login',{email,password:pwd});
    S.loggedResearcher={id:res.data.id,name:res.data.name,email:res.data.email};
    await chrome.storage.session.set({[LOGGED_KEY]:S.loggedResearcher});
    enterAdmin();
  } catch(err){ showErr('admin-error',err.message); }
  finally { btn.disabled=false; btn.textContent='Entrar →'; }
}
