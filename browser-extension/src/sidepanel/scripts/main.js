/* MAIN.JS — Estado global, helpers, API, boot */

const MASTER_PASSWORD = 'master2025';
const LOGGED_KEY      = 'uxLoggedResearcher';
const BACKEND_KEY     = 'backendUrl';
const DEFAULT_BACKEND = 'http://localhost:3000';
const SESSION_KEY     = 'uxSessionState';

const S = {
  backendUrl:'http://localhost:3000', currentSiteUrl:null,
  userId:null, sessionId:null, sessionStart:null,
  activeTestId:null, activeTestName:null, tasks:[],
  activeTaskIdx:null, taskTimerMs:0, taskTimerInt:null, statsInt:null,
  currentScreen:'identify', loggedResearcher:null,
};

const $       = id => document.getElementById(id);
const show    = id => $(id).classList.remove('hidden');
const hide    = id => $(id).classList.add('hidden');
const getText = id => $(id).value.trim();

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.classList.add('hidden'); });
  const el = $(`screen-${name}`);
  el.classList.remove('hidden'); el.classList.add('active');
  S.currentScreen = name;
  saveSessionState();
}

function showFeedback(id, msg, err=false) {
  const el=$(id); el.textContent=msg;
  el.className='feedback'+(err?' error':''); el.classList.remove('hidden');
  setTimeout(()=>el.classList.add('hidden'),3000);
}

function showErr(id,msg){ $(id).textContent=msg; show(id); }
function hideErr(id){ hide(id); }

function fmtMs(ms){ const s=Math.floor(ms/1000),m=Math.floor(s/60); return `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
function fmtSec(s){ if(s<60)return `${s}s`; const m=Math.floor(s/60); return `${m}m ${s%60}s`; }

function saveSessionState(){
  chrome.storage.session.set({[SESSION_KEY]:{
    userId:S.userId, sessionId:S.sessionId, sessionStart:S.sessionStart,
    activeTestId:S.activeTestId, activeTestName:S.activeTestName,
    tasks:S.tasks, activeTaskIdx:S.activeTaskIdx,
    taskTimerMs:S.taskTimerMs, currentScreen:S.currentScreen,
  }});
}

function loadSessionState(){ return new Promise(r=>chrome.storage.session.get([SESSION_KEY],res=>r(res[SESSION_KEY]||null))); }
function clearSessionState(){ chrome.storage.session.remove([SESSION_KEY]); }

async function api(method,path,body){
  const url=`${S.backendUrl}${path}`;
  const opts={method,headers:{'Content-Type':'application/json'}};
  if(body&&method!=='GET') opts.body=JSON.stringify(body);
  const res=await fetch(url,opts); const data=await res.json();
  if(!res.ok) throw new Error(data.error||`HTTP ${res.status}`);
  return data;
}

const getStorage = keys => new Promise(r=>chrome.storage.sync.get(keys,r));
const setStorage = obj  => new Promise(r=>chrome.storage.sync.set(obj,r));

document.addEventListener('DOMContentLoaded', async ()=>{
  const stored = await getStorage([BACKEND_KEY]);
  S.backendUrl = stored[BACKEND_KEY] || DEFAULT_BACKEND;

  const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
  if(tab?.url) S.currentSiteUrl = tab.url;

  const loggedRes = await new Promise(r=>chrome.storage.session.get([LOGGED_KEY],res=>r(res[LOGGED_KEY]||null)));
  if(loggedRes) S.loggedResearcher = loggedRes;

  const saved = await loadSessionState();
  if(saved?.sessionId){
    Object.assign(S,saved);
    chrome.runtime.sendMessage({action:'getExtensionStatus'},(res)=>{
      if(!res?.status?.sessionId) chrome.runtime.sendMessage({action:'sessionCreated',sessionId:S.sessionId,userId:S.userId});
    });
    if     (saved.currentScreen==='session')   enterSession(true);
    else if(saved.currentScreen==='results')   showResults();
    else if(saved.currentScreen==='pick-test') enterPickTest();
    else { showScreen('identify'); resetIdentifyUI(); }
  } else {
    showScreen('identify');
  }

  bindIdentify(); bindPickTest(); bindSession(); bindResults(); bindAdmin();

  chrome.runtime.onMessage.addListener((req)=>{ if(req.action==='eventLogged') updateSessionStats(); });
  chrome.tabs.onActivated.addListener(async(info)=>{ const t=await chrome.tabs.get(info.tabId); if(t?.url) S.currentSiteUrl=t.url; });
});
