'use strict';
const IC = {
 wrench:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>',
 bolt:'<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
 sparkle:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>',
 snow:'<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7"/><path d="M9 3.5l3 2 3-2M9 20.5l3-2 3 2"/>',
 plug:'<path d="M12 22v-5M9 8V2M15 8V2M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z"/>',
 hammer:'<path d="m15 12-8.4 8.4a2.1 2.1 0 0 1-3-3L12 9"/><path d="M17.6 15 22 10.6M20.9 11.7l-3.6-3.6M15 6l3-3 4 4-3 3M9 6l3-3 3 3-3 3"/>',
 roller:'<rect x="3" y="3" width="15" height="6" rx="1.5"/><path d="M18 6h3v5H11v3"/><rect x="9" y="14" width="4" height="7" rx="1"/>',
 paw:'<circle cx="6" cy="11" r="1.8"/><circle cx="10" cy="6.5" r="1.8"/><circle cx="14" cy="6.5" r="1.8"/><circle cx="18" cy="11" r="1.8"/><path d="M12 12c-3 0-5.5 2.6-5.5 5 0 1.6 1.4 2.2 3 2.2 1 0 1.7-.6 2.5-.6s1.5.6 2.5.6c1.6 0 3-.6 3-2.2 0-2.4-2.5-5-5.5-5z"/>',
 home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
 cal:'<rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 10h18M8 2.5v4M16 2.5v4"/>',
 bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
 pin:'<path d="M12 21s7-5.6 7-11a7 7 0 0 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
 star:'<path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/>',
 chev:'<path d="m9 6 6 6-6 6"/>',back:'<path d="M15 6l-6 6 6 6"/>',
 mic:'<rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5"/>',
 send:'<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>',
 bot:'<rect x="4" y="8" width="16" height="12" rx="4"/><path d="M12 4v4M9 14v1M15 14v1"/><circle cx="12" cy="3.5" r="1.2"/>',
 phone:'<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
 chat:'<path d="M21 12a8 8 0 0 1-11.7 7.1L3 21l1.9-5.3A8 8 0 1 1 21 12z"/>',
 check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',x:'<path d="M6 6l12 12M18 6 6 18"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 brief:'<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
 wallet:'<path d="M3 7a3 3 0 0 1 3-3h12v4"/><rect x="3" y="7" width="18" height="13" rx="3"/><circle cx="16.5" cy="13.5" r="1.2"/>',
 card:'<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19M6 15h4"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
 out:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
 shield:'<path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
 locate:'<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/>',
 speaker:'<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 chart:'<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
 edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
 rupee:'<path d="M6 4h12M6 9h12M9 4c5 0 7 2 7 5s-2 5-7 5l7 7"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2.5.5 3.5 2.4 3.5 5"/>',
 tag:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
};
const ic=(n,c='')=>`<svg class="i ${c}" viewBox="0 0 24 24">${IC[n]||''}</svg>`;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
const S={user:null,services:[],areas:[],quals:[],visit:49,stack:[],badge:0,otpMode:'demo',lang:'en'};
const ROOT_CUST=['home','bookings','inbox','profile'], ROOT_WORK=['home','jobs','earnings','inbox','profile'];

async function api(path,opt={}){
  const o={method:opt.method||'GET',headers:{},credentials:'same-origin'};
  if(opt.body!==undefined){o.method=opt.method||'POST';o.headers['Content-Type']='application/json';o.body=JSON.stringify(opt.body)}
  let r,j;
  try{r=await fetch(path,o)}catch(e){throw new Error('No connection to the server. Please try again.')}
  try{j=await r.json()}catch(e){throw new Error('Server error ('+r.status+').')}
  if(!r.ok||j.ok===false){const er=new Error(j.error||j.message||'Something went wrong.');er.status=r.status;throw er}
  return j;
}
function toast(msg){const t=document.createElement('div');t.className='toast';t.textContent=msg;$('#app').appendChild(t);setTimeout(()=>t.remove(),2600)}
function stars(n){return `<span class="rate">${ic('star')} ${n}</span>`}
function initials(n){return (n||'?').trim().split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase()}
function hdr(title,o={}){return `<div class="hdr">${o.noback?'<span style="width:8px"></span>':`<button class="ib" data-back>${ic('back')}</button>`}<h1>${esc(title)}</h1>${o.right||''}</div>`}
function svcOf(slug){return S.services.find(s=>s.slug===slug)||{name:slug,icon:'wrench'}}
function pillFor(st){const c=st==='Completed'?'done':st==='Cancelled'?'cancel':(st==='Requested'?'warn':'');return `<span class="pill ${c}">${esc(st)}</span>`}
function isWorker(){return S.user&&S.user.mode==='worker'}
function roots(){return isWorker()?ROOT_WORK:ROOT_CUST}

/* ---------- router ---------- */
let renderToken=0;
function nav(name,params={}){S.stack.push({name,params});show()}
function back(){if(S.stack.length>1){S.stack.pop();show()}}
function goTab(name){S.stack=[{name,params:{}}];show()}
function replace(name,params={}){S.stack[S.stack.length-1]={name,params};show()}
function reset(name,params={}){S.stack=[{name,params}];show()}
async function show(){
  const tok=++renderToken, top=S.stack[S.stack.length-1];
  const fn=SCREENS[top.name];
  let r;
  try{r=await fn(top.params)}catch(e){
    if(e.status===401){S.user=null;return reset('register')}
    r={html:hdr('Oops',{noback:S.stack.length<2})+`<div class="scroll"><div class="err">${esc(e.message)}</div><button class="btn sec" data-retry>Try again</button></div>`,after(){document.querySelector('[data-retry]').onclick=show}};
  }
  if(tok!==renderToken)return;
  $('#screen').innerHTML=r.html;
  const isRoot=S.user&&roots().includes(top.name)&&S.stack.length===1;
  $('#tabbar-host').innerHTML=isRoot?tabbarHtml(top.name):'';
  if(isRoot&&r.fab!==false)$('#screen').insertAdjacentHTML('beforeend','')
  document.querySelectorAll('[data-back]').forEach(b=>b.onclick=back);
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>goTab(b.dataset.tab));
  const fab=$('#fab');if(fab)fab.remove();
  if(isRoot&&r.fab!==false){$('#app').insertAdjacentHTML('beforeend',`<button class="fab" id="fab">${ic('bot')} Ask assistant</button>`);$('#fab').onclick=openAssistant}
  if(r.after)r.after();
  if(isRoot)refreshBadge();
}
function tabbarHtml(cur){
  const w=isWorker();
  const T=w?[['home','Home','home'],['jobs','Jobs','brief'],['earnings','Earnings','wallet'],['inbox','Inbox','bell'],['profile','Profile','user']]
           :[['home','Home','home'],['bookings','Bookings','cal'],['inbox','Inbox','bell'],['profile','Profile','user']];
  return `<div class="tabbar">${T.map(t=>`<button data-tab="${t[0]}" class="${cur===t[0]?'on':''}">${ic(t[2])}<span>${t[1]}</span>${t[0]==='inbox'&&S.badge?`<span class="dot">${S.badge}</span>`:''}</button>`).join('')}</div>`;
}
async function refreshBadge(){try{const j=await api('/api/badge');if(j.unread!==S.badge){S.badge=j.unread;const top=S.stack[S.stack.length-1];if(roots().includes(top.name)&&S.stack.length===1)$('#tabbar-host').innerHTML=tabbarHtml(top.name)
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>goTab(b.dataset.tab));
 const bd=document.querySelector('#bellbadge');if(bd){bd.textContent=S.badge;bd.style.display=S.badge?'grid':'none'}}}catch(e){}}

/* ---------- voice ---------- */
let recog=null;
function voiceSupported(){return !!(window.AndroidVoice||window.SpeechRecognition||window.webkitSpeechRecognition)}
const VLANG={en:'en-IN',hi:'hi-IN',kn:'kn-IN',te:'te-IN'};
let voiceCb=null;
window.onNativeVoiceResult=function(text,error){const b=document.querySelector('.micb');if(b)b.classList.remove('rec');if(voiceCb)voiceCb(text,error)};
function listen(lang,cb){
  voiceCb=cb;
  if(window.AndroidVoice&&window.AndroidVoice.start){window.AndroidVoice.start(VLANG[lang]||'en-IN');return true}
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){cb('','Voice input is not supported on this browser. Please type.');return false}
  recog=new SR();recog.lang=VLANG[lang]||'en-IN';recog.interimResults=false;
  recog.onresult=e=>{cb(e.results[0][0].transcript,'')};
  recog.onerror=e=>{cb('','Could not hear you ('+e.error+'). Please try again or type.')};
  recog.onend=()=>{const b=document.querySelector('.micb');if(b)b.classList.remove('rec')};
  try{recog.start()}catch(e){cb('','Voice input could not start.');return false}
  return true;
}
function speak(text,lang){
  const t=String(text).replace(/[*_#`]/g,'');
  try{if(window.AndroidVoice&&window.AndroidVoice.speak){window.AndroidVoice.speak(t,VLANG[lang]||'en-IN');return}
  if('speechSynthesis' in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang=VLANG[lang]||'en-IN';speechSynthesis.speak(u)}}catch(e){}
}

/* ---------- boot ---------- */
const SCREENS={};
async function boot(){
  try{
    const j=await api('/api/bootstrap');
    Object.assign(S,{user:j.user,services:j.services,areas:j.areas,quals:j.qualifications,visit:j.visit_fee,otpMode:j.otp_mode});
    reset(S.user?'home':'register');
  }catch(e){$('#splash').innerHTML='<h3>Could not start</h3><p style="font-size:13px">'+esc(e.message)+'</p><button class="btn" style="max-width:200px" onclick="location.reload()">Retry</button>'}
}
