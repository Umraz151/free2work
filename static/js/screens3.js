'use strict';
/* ---------- worker: jobs ---------- */
let JT='req';
SCREENS.jobs=async()=>{
  const [r,m]=await Promise.all([api('/api/worker/requests'),api('/api/worker/jobs')]);
  const mine=m.jobs;
  return {html:`${hdr('Jobs',{noback:1})}<div class="tabs2"><button data-t="req" class="${JT==='req'?'on':''}">Requests (${r.requests.length})</button><button data-t="my" class="${JT==='my'?'on':''}">My jobs (${mine.length})</button></div>
  <div class="scroll">${JT==='req'?(!r.available?`<div class="banner">${ic('info','s')}You are offline. Turn on availability on Home to accept jobs.</div>`:'')+`<div class="list">${r.requests.length?r.requests.map(reqCard).join(''):`<div class="empty">${ic('brief','xl')}<div>No requests right now.</div></div>`}</div>`
   :`<div class="list">${mine.length?mine.map(b=>`<button class="item" data-job="${b.id}"><div class="ico t">${ic(b.icon)}</div><div class="m"><b>${esc(b.service)}</b><span>${esc(b.customer_name)} - ${esc(b.day)}, ${esc(b.time)}</span><span>Earn Rs ${b.price-S.visit}</span></div>${pillFor(b.status)}</button>`).join(''):`<div class="empty">${ic('brief','xl')}<div>Accepted jobs show up here.</div></div>`}</div>`}</div>`,
  after(){bindReq();document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{JT=b.dataset.t;show()});
   document.querySelectorAll('[data-job]').forEach(b=>b.onclick=()=>nav('booking',{id:+b.dataset.job,worker:1}))}};
};
/* ---------- worker: earnings ---------- */
SCREENS.earnings=async()=>{
  const e=await api('/api/worker/earnings');const mx=Math.max(...e.days.map(d=>d.amount),1);
  const wk=e.days.reduce((a,d)=>a+d.amount,0);
  return {html:`${hdr('Earnings',{noback:1})}<div class="scroll">
   <div class="card" style="background:linear-gradient(160deg,var(--navy),var(--navy2));color:#fff"><div style="opacity:.75;font-size:13px">Total earnings</div><div style="font-size:34px;font-weight:800;letter-spacing:-1px">Rs ${e.total.toLocaleString('en-IN')}</div><div style="opacity:.75;font-size:12.5px">Demo data. Payouts are not real.</div></div>
   <div class="card" style="margin-top:12px"><div style="display:flex;justify-content:space-between"><b>Last 7 days</b><b style="color:var(--blue)">Rs ${wk.toLocaleString('en-IN')}</b></div>
    <div class="bars">${e.days.map((d,i)=>`<div class="${i===6?'cur':''}"><span>${d.amount?Math.round(d.amount/100)/10+'k':''}</span><i style="height:${Math.max(4,d.amount/mx*90)}%"></i>${d.label}</div>`).join('')}</div></div>
   <h2 class="sec">Completed jobs</h2><div class="list">${e.history.length?e.history.map(h=>`<div class="item"><div class="ico t">${ic('check')}</div><div class="m"><b>${esc(h.service)}</b><span>${esc(h.code)} - ${esc(h.date)}</span></div><b style="color:var(--teal)">+Rs ${h.amount}</b></div>`).join(''):`<div class="card mut small center">Complete a job to see it here.</div>`}</div></div>`};
};
/* ---------- inbox ---------- */
SCREENS.inbox=async()=>{
  const j=await api('/api/notifications');
  api('/api/notifications/read',{body:{}}).then(()=>{S.badge=0});
  return {html:`${hdr('Notifications',{noback:1})}<div class="scroll"><div class="list">${j.items.length?j.items.map(n=>`<button class="item" ${n.booking_id?`data-bk="${n.booking_id}"`:''} style="${n.read?'':'border-left:4px solid var(--blue)'}"><div class="ico">${ic(/pay/i.test(n.title)?'wallet':/messag/i.test(n.title)?'chat':/rat/i.test(n.title)?'star':'bell')}</div><div class="m"><b>${esc(n.title)}</b><span style="white-space:normal">${esc(n.body)}</span><span style="font-size:11.5px;margin-top:2px">${esc(n.when)}</span></div></button>`).join(''):`<div class="empty">${ic('bell','xl')}<div>No notifications yet.</div></div>`}</div></div>`,
  after(){document.querySelectorAll('[data-bk]').forEach(b=>b.onclick=()=>nav('booking',{id:+b.dataset.bk,worker:isWorker()?1:0}))}};
};
/* ---------- profile / settings ---------- */
SCREENS.profile=async()=>{
  const u=S.user;
  return {html:`<div class="scroll" style="padding:0 0 28px"><div class="top" style="text-align:center;padding-top:26px"><div class="avatar lg" style="margin:0 auto">${esc(initials(u.name))}</div><div class="nm" style="margin-top:10px;font-size:21px">${esc(u.name)}</div><div style="opacity:.75;font-size:13.5px">+91 ${esc(u.phone)}</div><div style="margin-top:8px"><span class="pill" style="background:rgba(255,255,255,.15);color:#fff">${isWorker()?'Professional':'Customer'}</span> <span class="pill" style="background:rgba(255,255,255,.15);color:#fff">${esc(u.qualification||'')}</span></div></div>
  <div style="padding:16px">
   <div class="menu">
    <button class="item" data-go="edit"><div class="ico">${ic('edit')}</div><div class="m"><b>Edit profile</b><span>Name, age, qualification${isWorker()?', skills':''}</span></div>${ic('chev','s')}</button>
    <button class="item" data-go="location"><div class="ico">${ic('pin')}</div><div class="m"><b>My location</b><span>${esc(u.area||'Not set')}${u.street?' - '+esc(u.street):''}</span></div>${ic('chev','s')}</button>
    <button class="item" id="sw"><div class="ico">${ic('users')}</div><div class="m"><b>Switch to ${isWorker()?'Get Work Done':'Find Work'}</b><span>Currently: ${isWorker()?'Find Work':'Get Work Done'}</span></div>${ic('chev','s')}</button>
    <button class="item" data-go="lang"><div class="ico">${ic('globe')}</div><div class="m"><b>Assistant language</b><span>${({en:'English',hi:'Hindi',kn:'Kannada',te:'Telugu'})[S.lang]}</span></div>${ic('chev','s')}</button>
    <button class="item" data-go="about"><div class="ico">${ic('info')}</div><div class="m"><b>Help and about</b><span>Version, demo notes</span></div>${ic('chev','s')}</button>
   </div>
   <button class="btn red" id="lo" style="margin-top:18px">${ic('out')} Log out</button></div></div>`,
  after(){
    document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>nav(b.dataset.go));
    $('#sw').onclick=async()=>{try{const j=await api('/api/me',{method:'PATCH',body:{mode:isWorker()?'customer':'worker'}});S.user=j.user;toast('Switched to '+(isWorker()?'Find Work':'Get Work Done'));goTab('home')}catch(e){toast(e.message)}};
    $('#lo').onclick=async()=>{if(!confirm('Log out of Free2Work?'))return;await api('/api/auth/logout',{body:{}});S.user=null;PROS=null;reset('register')};
  }};
};
SCREENS.about=async()=>({fab:false,html:`${hdr('Help and about')}<div class="scroll"><div class="card center"><img src="/static/icon.svg" style="width:72px;border-radius:20px"><div class="b" style="font-size:19px;margin-top:8px">Free2Work</div><div class="mut small">Version 2.0 - college project demo</div></div>
 <div class="card" style="margin-top:12px"><b>Demo notes</b><div class="mut small" style="margin-top:6px;line-height:1.6">OTP is shown on screen (no SMS is sent).<br>Payments are a demo. No real money moves.<br>Professionals and jobs shown are sample data.<br>Maps use OpenStreetMap (free).</div></div></div>`});
SCREENS.lang=async()=>({fab:false,html:`${hdr('Assistant language')}<div class="scroll"><div class="list">${[['en','English'],['hi','Hindi'],['kn','Kannada'],['te','Telugu']].map(l=>`<button class="item" data-l="${l[0]}"><div class="m"><b>${l[1]}</b></div>${S.lang===l[0]?ic('check'):''}</button>`).join('')}</div></div>`,after(){document.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>{S.lang=b.dataset.l;back()})}});
SCREENS.edit=async()=>{
  const u=S.user;const sk=new Set(u.skills);
  return {fab:false,html:`${hdr('Edit profile')}<div class="scroll"><div id="eerr"></div>
   <div class="fld"><label>Full name</label><input class="inp" id="en" value="${esc(u.name)}"></div>
   <div class="row2"><div class="fld"><label>Age</label><input class="inp" id="ea" type="number" value="${u.age||''}"></div><div class="fld"><label>Qualification</label><select class="inp" id="eq">${S.quals.map(q=>`<option ${u.qualification===q?'selected':''}>${q}</option>`).join('')}</select></div></div>
   <div class="fld"><label>Mobile</label><input class="inp" value="+91 ${esc(u.phone)}" disabled></div>
   ${isWorker()?`<div class="fld"><label>My skills</label><div class="chips">${S.services.map(s=>`<button class="ch ${sk.has(s.slug)?'on':''}" data-sk="${s.slug}">${esc(s.name)}</button>`).join('')}</div></div>`:''}
  </div><div class="cta"><button class="btn" id="sv">Save changes</button></div>`,
  after(){document.querySelectorAll('[data-sk]').forEach(b=>b.onclick=()=>{const s=b.dataset.sk;sk.has(s)?sk.delete(s):sk.add(s);b.classList.toggle('on')});
   $('#sv').onclick=async()=>{try{const body={name:$('#en').value,age:$('#ea').value,qualification:$('#eq').value};if(isWorker())body.skills=[...sk];const j=await api('/api/me',{method:'PATCH',body});S.user=j.user;toast('Profile updated');back()}catch(e){$('#eerr').innerHTML=`<div class="err">${esc(e.message)}</div>`}}}};
};
SCREENS.location=async()=>{
  const u=S.user;const a=S.areas.find(x=>x.name===u.area)||S.areas[0];
  return {fab:false,html:`${hdr('My location')}<div class="scroll"><div class="mut small">Free OpenStreetMap map. Location is optional, you can just pick your area.</div><div id="map"></div>
   <button class="btn sm sec" id="gps">${ic('locate','s')} Use my current location</button>
   <h2 class="sec">Or pick your area</h2><div class="chips">${S.areas.map(x=>`<button class="ch ${u.area===x.name?'on':''}" data-a="${esc(x.name)}">${esc(x.name)}</button>`).join('')}</div>
   <div class="fld" style="margin-top:18px"><label>House / street address</label><input class="inp" id="st" value="${esc(u.street||'')}" placeholder="Flat no, building, street"></div></div>
   <div class="cta"><button class="btn" id="sv">Save location</button></div>`,
  after(){
    let area=u.area;
    try{const lat=u.lat||a.lat,lon=u.lon||a.lon;const m=L.map('map',{zoomControl:false,attributionControl:true}).setView([lat,lon],13);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap'}).addTo(m);
      const mk=L.marker([lat,lon],{icon:L.divIcon({className:'',html:'<div class="divicon" style="width:20px;height:20px"></div>',iconSize:[20,20],iconAnchor:[10,10]})}).addTo(m);
      window._m={m,mk};
    }catch(e){}
    document.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{area=b.dataset.a;document.querySelectorAll('[data-a]').forEach(x=>x.classList.toggle('on',x===b));const p=S.areas.find(x=>x.name===area);if(window._m){window._m.m.setView([p.lat,p.lon],13);window._m.mk.setLatLng([p.lat,p.lon])}});
    $('#gps').onclick=()=>useGps((ar,c)=>{area=ar;if(window._m){window._m.m.setView([c.latitude,c.longitude],14);window._m.mk.setLatLng([c.latitude,c.longitude])}document.querySelectorAll('[data-a]').forEach(x=>x.classList.toggle('on',x.dataset.a===area))});
    $('#sv').onclick=async()=>{try{const body={street:$('#st').value};if(area!==S.user.area||!S.user.lat)body.area=area;const j=await api('/api/me',{method:'PATCH',body});S.user=j.user;toast('Location saved');back()}catch(e){toast(e.message)}};
  }};
};

/* ---------- assistant ---------- */
const AS={msgs:[],voiceOut:false};
function openAssistant(){
  if($('#asheet'))return;
  const first=S.user.name.split(' ')[0];
  if(!AS.msgs.length)AS.msgs.push({who:'bot',text:`Hi ${first}! I can find jobs near you, book a service, show your bookings or answer questions.`,chips:['Find jobs near me','Book plumbing for tomorrow morning','Show my bookings']});
  $('#app').insertAdjacentHTML('beforeend',`<div class="overlay" id="asheet"><div class="sheet"><div class="grab"></div>
   <div class="shead"><div class="bot">${ic('bot')}</div><div style="flex:1"><b>Free2Work Assistant</b><small>Type or tap the mic</small></div><button class="ib" id="aspk" title="Read aloud">${ic('speaker')}</button><button class="ib" id="aclose">${ic('x')}</button></div>
   <div class="langs">${[['en','English'],['hi','हिन्दी'],['kn','ಕನ್ನಡ'],['te','తెలుగు']].map(l=>`<button data-al="${l[0]}" class="${S.lang===l[0]?'on':''}">${l[1]}</button>`).join('')}</div>
   <div class="scroll" id="achat" style="padding-bottom:6px"></div>
   <div class="composer"><button class="micb" id="amic">${ic('mic')}</button><input id="ain" placeholder="Ask me anything..." autocomplete="off"><button class="sendb" id="asend">${ic('send')}</button></div></div></div>`);
  const ov=$('#asheet');
  ov.onclick=e=>{if(e.target===ov)closeA()};
  $('#aclose').onclick=closeA;
  const spk=$('#aspk');const upd=()=>{spk.style.color=AS.voiceOut?'var(--blue)':'';spk.style.background=AS.voiceOut?'var(--blue-l)':''};upd();
  spk.onclick=()=>{AS.voiceOut=!AS.voiceOut;upd();toast(AS.voiceOut?'Read aloud on':'Read aloud off')};
  document.querySelectorAll('[data-al]').forEach(b=>b.onclick=()=>{S.lang=b.dataset.al;document.querySelectorAll('[data-al]').forEach(x=>x.classList.toggle('on',x===b))});
  draw();
  const send=txt=>{const i=$('#ain');const t=(txt||i.value).trim();if(!t)return;i.value='';AS.msgs.push({who:'me',text:t});draw();typing();api('/api/assistant',{body:{message:t,language:S.lang}}).then(r=>{untype();pushBot(r)}).catch(e=>{untype();AS.msgs.push({who:'bot',text:e.message});draw()})};
  window._asend=send;
  $('#asend').onclick=()=>send();$('#ain').onkeydown=e=>{if(e.key==='Enter')send()};
  $('#amic').onclick=()=>{const m=$('#amic');m.classList.add('rec');const ok=listen(S.lang,(t,err)=>{m.classList.remove('rec');if(err){toast(err);return}if(t)send(t)});if(!ok)m.classList.remove('rec')};
}
function closeA(){const o=$('#asheet');if(o)o.remove();try{speechSynthesis.cancel()}catch(e){}}
function pushBot(r){AS.msgs.push({who:'bot',text:r.reply,cards:r.cards,actions:r.actions,chips:r.chips});draw();if(AS.voiceOut)speak(r.reply,S.lang)}
function typing(){const c=$('#achat');if(c){c.insertAdjacentHTML('beforeend','<div class="bubble them typing" id="ty"><i></i><i></i><i></i></div>');c.scrollTop=c.scrollHeight}}
function untype(){const t=$('#ty');if(t)t.remove()}
function cardHtml(c){
  if(c.kind==='draft')return `<div class="acard" style="flex-direction:column;align-items:stretch"><div style="display:flex;gap:10px;align-items:center"><div class="ico">${ic(c.icon)}</div><b>${esc(c.title)} booking draft</b></div>${c.rows.map(r=>`<div class="kv" style="padding:4px 0;font-size:13px"><span>${esc(r[0])}</span><span style="text-align:right;max-width:70%">${esc(r[1])}</span></div>`).join('')}</div>`;
  return `<div class="acard"><div class="ico ${c.kind==='job'?'':'t'}">${ic(c.icon)}</div><div class="m"><b>${esc(c.title)}</b><span>${esc(c.sub)}</span>${c.meta?`<span class="b" style="color:var(--blue)">${esc(c.meta)}</span>`:''}</div></div>`;
}
function draw(){
  const c=$('#achat');if(!c)return;
  c.innerHTML=AS.msgs.map((m,i)=>{
    if(m.who==='me')return `<div class="bubble me">${esc(m.text)}</div>`;
    const last=i===AS.msgs.length-1;
    return `<div class="bubble them">${esc(m.text)}</div>${(m.cards||[]).map(cardHtml).join('')}${last&&(m.actions||[]).length?`<div class="acts">${m.actions.map((a,j)=>`<button class="act ${a.style==='danger'?'dg':(['confirm_booking','accept_job'].includes(a.type)?'':'o')}" data-ai="${j}">${esc(a.label)}</button>`).join('')}</div>`:''}${last&&(m.chips||[]).length?`<div class="acts">${m.chips.map(x=>`<button class="act o" data-ac="${esc(x)}">${esc(x)}</button>`).join('')}</div>`:''}`;
  }).join('');
  c.scrollTop=c.scrollHeight;
  const last=AS.msgs[AS.msgs.length-1];
  c.querySelectorAll('[data-ac]').forEach(b=>b.onclick=()=>window._asend(b.dataset.ac));
  c.querySelectorAll('[data-ai]').forEach(b=>b.onclick=()=>doAction(last.actions[+b.dataset.ai]));
}
async function doAction(a){
  const t=a.type;
  if(t==='dismiss'){AS.msgs.push({who:'bot',text:'Okay, I kept it.'});return draw()}
  const go=(n,p)=>{closeA();S.stack.length>1&&S.stack.length?null:null;if(n==='bookings'||n==='jobs'||n==='earnings')goTab(n);else nav(n,p)};
  if(t==='open_bookings')return go('bookings');
  if(t==='open_jobs')return isWorker()?go('jobs'):(api('/api/me',{method:'PATCH',body:{mode:'worker'}}).then(j=>{S.user=j.user;closeA();goTab('jobs')}));
  if(t==='open_earnings')return go('earnings');
  if(t==='open_booking'||t==='open_job')return go('booking',{id:a.id,worker:t==='open_job'});
  if(t==='open_payment')return go('pay',{id:a.id});
  if(t==='change_booking'){closeA();return nav('book',{slug:a.slug,area:a.area,date:a.date,time:a.time,address:a.address||'',problem:a.problem||''})}
  AS.msgs.push({who:'me',text:a.label});draw();typing();
  try{const r=await api('/api/assistant/action',{body:{...a,language:S.lang}});untype();pushBot(r);if(t==='confirm_booking'||t==='accept_job'){PROS=PROS}}
  catch(e){untype();AS.msgs.push({who:'bot',text:e.message});draw()}
}
