'use strict';
/* ---------- registration ---------- */
const REG={name:'Demo User',age:'20',qual:'',phone:'60000'+String(Math.floor(Math.random()*100000)).padStart(5,'0'),mode:'customer',error:''};
SCREENS.register=async()=>({fab:false,html:`
<div class="scroll" style="padding:0">
 <div class="hero-auth"><img src="/static/icon.svg" alt=""><h1>Welcome to Free2Work</h1><p>Book trusted help at home, or find work near you.</p></div>
 <div class="card sheet-card" style="padding:18px">
  <div style="background:#FFF4D6;border:1px solid #E8C766;color:#5A4300;border-radius:10px;padding:10px 12px;margin-bottom:12px;font-size:13px;line-height:1.4"><b>DEMO</b> - don't enter real personal details. Sample entries are filled in for you, just tap Get OTP.</div>
  <div id="regerr"></div>
  <div class="fld"><label>Full name</label><input class="inp" id="rn" placeholder="e.g. Demo User" value="${esc(REG.name)}" autocomplete="name"></div>
  <div class="row2"><div class="fld"><label>Age</label><input class="inp" id="ra" type="number" inputmode="numeric" placeholder="18" value="${esc(REG.age)}"></div>
  <div class="fld"><label>Qualification</label><select class="inp" id="rq"><option value="">Select</option>${S.quals.map(q=>`<option ${REG.qual===q?'selected':''}>${q}</option>`).join('')}</select></div></div>
  <div class="fld"><label>Mobile number</label><div class="phone"><span>+91</span><input id="rp" type="tel" inputmode="numeric" maxlength="10" placeholder="10-digit number" value="${esc(REG.phone)}"></div></div>
  <div class="fld"><label>I want to</label><div class="seg">
   <button class="opt ${REG.mode==='worker'?'on':''}" data-mode="worker">${ic('brief','l')}Find Work</button>
   <button class="opt ${REG.mode==='customer'?'on':''}" data-mode="customer">${ic('home','l')}Get Work Done</button></div></div>
  <button class="btn" id="rgo">Get OTP</button>
  <p class="center mut small" style="margin:14px 0 0">By continuing you agree to the Terms and Privacy Policy.</p>
 </div>
 <div style="height:24px"></div>
</div>`,after(){
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{REG.mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('on',x===b))});
  const rq=$('#rq');if(!REG.qual&&rq&&rq.options.length>1){rq.selectedIndex=1;REG.qual=rq.value}
  const go=$('#rgo');
  go.onclick=async()=>{
    REG.name=$('#rn').value.trim();REG.age=$('#ra').value;REG.qual=$('#rq').value;REG.phone=$('#rp').value.replace(/\D/g,'');
    go.disabled=true;go.textContent='Sending...';
    try{const j=await api('/api/auth/send-otp',{body:{name:REG.name,age:REG.age,qualification:REG.qual,phone:REG.phone,mode:REG.mode}});
      nav('otp',{phone:j.phone,demo:j.demo_otp||null})}
    catch(e){$('#regerr').innerHTML=`<div class="err">${esc(e.message)}</div>`;go.disabled=false;go.textContent='Get OTP'}
  };
}});

/* ---------- OTP ---------- */
SCREENS.otp=async(p)=>({fab:false,html:`${hdr('Verify mobile number')}
<div class="scroll">
 <div class="center" style="margin-top:8px"><div class="ico" style="margin:0 auto 12px;width:60px;height:60px;border-radius:20px">${ic('shield','l')}</div>
 <div class="b" style="font-size:19px">Enter the 6-digit code</div>
 <div class="mut small" style="margin-top:4px">Sent to +91 ${esc(p.phone.slice(0,5))} ${esc(p.phone.slice(5))}</div></div>
 <div id="oerr"></div>
 <div class="otpbox" id="obox">${'<div></div>'.repeat(6)}</div>
 ${p.demo?`<div class="demo"><small>Demo SMS (no real SMS is sent)</small><div style="margin-top:2px">Your Free2Work code is <b id="dcode">${esc(p.demo)}</b></div><button class="btn sm sec" id="dfill" style="margin-top:10px">Fill code automatically</button></div>`:''}
 <div class="center small mut" style="margin-top:14px" id="resend">Resend code in <b id="rt">30</b>s</div>
 <div class="pad" id="pad">${[1,2,3,4,5,6,7,8,9,'',0,'del'].map(k=>k===''?'<span></span>':`<button data-k="${k}">${k==='del'?ic('back'):k}</button>`).join('')}</div>
</div>`,after(){
  let code='';
  const draw=()=>{[...$('#obox').children].forEach((d,i)=>{d.textContent=code[i]||'';d.classList.toggle('cur',i===code.length)})};
  const submit=async()=>{
    try{const j=await api('/api/auth/verify-otp',{body:{phone:p.phone,otp:code}});S.user=j.user;toast('Welcome, '+j.user.name.split(' ')[0]+'!');reset('home')}
    catch(e){$('#oerr').innerHTML=`<div class="err" style="margin-top:12px">${esc(e.message)}</div>`;code='';draw()}
  };
  document.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{const k=b.dataset.k;if(k==='del')code=code.slice(0,-1);else if(code.length<6)code+=k;draw();if(code.length===6)submit()});
  draw();
  const df=$('#dfill');if(df)df.onclick=()=>{code=$('#dcode').textContent;draw();submit()};
  let t=30;const iv=setInterval(()=>{if(!document.getElementById('rt')){clearInterval(iv);return}t--;if(t<=0){clearInterval(iv);$('#resend').innerHTML='<button class="b" style="color:var(--blue)" id="rs">Resend code</button>';$('#rs').onclick=async()=>{try{const j=await api('/api/auth/send-otp',{body:{name:REG.name,age:REG.age,qualification:REG.qual,phone:REG.phone,mode:REG.mode}});replace('otp',{phone:j.phone,demo:j.demo_otp||null});toast('New code sent')}catch(e){toast(e.message)}}}else $('#rt').textContent=t},1000);
}});

/* ---------- home ---------- */
function modeBar(){return `<div class="modebar"><button data-m="worker" class="${isWorker()?'on':''}">Find Work</button><button data-m="customer" class="${!isWorker()?'on':''}">Get Work Done</button></div>`}
function bindModeBar(){document.querySelectorAll('[data-m]').forEach(b=>b.onclick=async()=>{if((b.dataset.m==='worker')===isWorker())return;try{const j=await api('/api/me',{method:'PATCH',body:{mode:b.dataset.m}});S.user=j.user;goTab('home')}catch(e){toast(e.message)}})}
function topbar(extra=''){const u=S.user;return `<div class="top"><div class="row"><div class="avatar">${esc(initials(u.name))}</div>
 <div style="flex:1;min-width:0"><div class="hi">${isWorker()?'Ready to earn,':'Good to see you,'}</div><div class="nm">${esc(u.name.split(' ')[0])}</div>
 <button class="chip-loc" data-loc>${ic('pin','s')}${esc(u.area||'Set your area')} ${ic('chev','s')}</button></div>
 <button class="ib" data-bell>${ic('bell')}<span class="dot" id="bellbadge" style="${S.badge?'':'display:none'}">${S.badge}</span></button></div>${extra}</div>`}
function bindTop(){const l=document.querySelector('[data-loc]');if(l)l.onclick=()=>nav('location');const b=document.querySelector('[data-bell]');if(b)b.onclick=()=>goTab('inbox')}
function bookingItem(b){return `<button class="item" data-bk="${b.id}"><div class="ico">${ic(b.icon)}</div><div class="m"><b>${esc(b.service)}</b><span>${esc(b.day)}, ${esc(b.time)} - ${esc(b.area)}</span></div>${pillFor(b.status)}</button>`}
function bindBk(){document.querySelectorAll('[data-bk]').forEach(b=>b.onclick=()=>nav('booking',{id:+b.dataset.bk}))}
let PROS=null;
async function loadPros(){if(PROS)return PROS;const rs=await Promise.all(['plumbing','electrical','house-cleaning','ac-repair'].map(s=>api('/api/services/'+s)));const m={};rs.forEach(r=>r.pros.forEach(p=>{m[p.id]=p}));PROS=Object.values(m).sort((a,b)=>b.rating-a.rating).slice(0,6);return PROS}

SCREENS.home=async()=>isWorker()?workerHome():customerHome();
async function customerHome(){
  const [bk,pros,rv]=await Promise.all([api('/api/bookings'),loadPros(),api('/api/services/plumbing')]);
  const act=bk.bookings.filter(b=>!['Completed','Cancelled'].includes(b.status));
  const need=bk.bookings.filter(b=>b.status==='Completed'&&!b.paid);
  const gridHtml=list=>list.map(s=>`<button class="cat" data-svc="${s.slug}"><div class="ci">${ic(s.icon,'l')}</div>${esc(s.name)}</button>`).join('')||'<div class="mut small" style="grid-column:1/-1">No service matches your search.</div>';
  return {html:`<div class="scroll" style="padding:0 0 28px">${topbar(`<div class="search">${ic('search')}<input id="q" placeholder="Search plumber, cleaning, AC..." autocomplete="off"></div>${modeBar()}`)}
  <div style="padding:0 16px">
  ${need.length?`<div class="card" style="margin-top:16px;border:1.5px solid var(--blue)"><div class="b">Payment pending</div><div class="mut small">${esc(need[0].service)} is complete. Rs ${need[0].price} due.</div><button class="btn sm" style="margin-top:10px" data-pay="${need[0].id}">Pay now</button></div>`:''}
  <h2 class="sec" style="margin-top:20px">What do you need?</h2>
  <div class="grid" id="cats">${gridHtml(S.services)}</div>
  <div class="promo" style="margin-top:22px">
   <div class="pb p1"><h3>Fixed prices.<br>No surprises.</h3><p>See the price before you book.</p><span class="btn-s">Explore</span>${ic('tag','bg')}</div>
   <div class="pb p2"><h3>Verified<br>professionals</h3><p>Rated by real customers near you.</p><span class="btn-s">Meet them</span>${ic('shield','bg')}</div>
   <div class="pb p3"><h3>Book in<br>30 seconds</h3><p>Or just ask the assistant.</p><span class="btn-s">Try it</span>${ic('bot','bg')}</div></div>
  ${act.length?`<h2 class="sec">Active bookings <a data-tab="bookings">See all</a></h2><div class="list">${act.slice(0,2).map(bookingItem).join('')}</div>`:''}
  <h2 class="sec">Top professionals near you</h2>
  <div class="hs">${pros.map(p=>`<div class="card pro"><div class="avatar">${esc(initials(p.name))}</div><b>${esc(p.name)}</b><small>${esc(svcOf(p.skills[0]).name)} - ${esc(p.area)}</small><div style="margin-top:6px">${stars(p.rating)} <small>(${p.rating_count})</small></div></div>`).join('')}</div>
  <h2 class="sec">What customers say</h2>
  <div class="card">${rv.reviews.slice(0,2).map(r=>`<div class="review"><div style="display:flex;justify-content:space-between"><b>${esc(r.name)}</b>${stars(r.rating)}</div><div class="mut small" style="margin-top:4px">${esc(r.comment)}</div></div>`).join('')}</div>
  </div></div>`,after(){
    bindTop();bindModeBar();bindBk();
    document.querySelectorAll('[data-pay]').forEach(b=>b.onclick=()=>nav('pay',{id:+b.dataset.pay}));
    const bind=()=>document.querySelectorAll('[data-svc]').forEach(b=>b.onclick=()=>nav('service',{slug:b.dataset.svc}));bind();
    $('#q').oninput=e=>{const v=e.target.value.trim().toLowerCase();$('#cats').innerHTML=gridHtml(S.services.filter(s=>(s.name+' '+s.tagline+' '+s.includes.join(' ')).toLowerCase().includes(v)));bind()};
    document.querySelectorAll('.pb').forEach(x=>x.onclick=openAssistant)}};
}
async function workerHome(){
  const d=await api('/api/worker/dashboard');
  const st=d.stats;
  return {html:`<div class="scroll" style="padding:0 0 28px">${topbar(`<div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.1);border-radius:14px;padding:12px 14px;margin-top:16px"><div style="flex:1"><div class="b">${d.available?'You are online':'You are offline'}</div><div style="font-size:12.5px;opacity:.75">${d.available?'Customers near you can send requests':'Turn on to receive job requests'}</div></div><button class="tog ${d.available?'on':''}" id="avail" aria-label="availability"></button></div>
   <div class="stat" style="margin-top:12px"><div><b>Rs ${st.today}</b><small>Today</small></div><div><b>Rs ${st.week}</b><small>This week</small></div><div><b>${st.rating}</b><small>Rating</small></div></div>${modeBar()}`)}
  <div style="padding:0 16px">
  ${d.active.length?`<h2 class="sec">Active job</h2><div class="list">${d.active.map(b=>`<button class="item" data-job="${b.id}"><div class="ico t">${ic(b.icon)}</div><div class="m"><b>${esc(b.service)}</b><span>${esc(b.customer_name)} - ${esc(b.area)}</span></div>${pillFor(b.status)}</button>`).join('')}</div>`:''}
  <h2 class="sec">New requests near you <a data-tab="jobs">See all</a></h2>
  <div class="list">${d.requests.length?d.requests.map(reqCard).join(''):`<div class="empty">${ic('brief','xl')}<div>No requests right now.<br>New ones appear often.</div></div>`}</div>
  </div></div>`,after(){
    bindTop();bindModeBar();bindReq();
    document.querySelectorAll('[data-job]').forEach(b=>b.onclick=()=>nav('booking',{id:+b.dataset.job,worker:1}));
    $('#avail').onclick=async()=>{try{const j=await api('/api/me',{method:'PATCH',body:{available:!d.available}});S.user=j.user;show()}catch(e){toast(e.message)}}}};
}
function reqCard(j){return `<div class="card"><div style="display:flex;gap:12px;align-items:center"><div class="ico">${ic(j.icon)}</div><div style="flex:1;min-width:0"><b>${esc(j.service)}</b><div class="mut small">${esc(j.area)} - ${j.distance_km} km away</div></div><div style="text-align:right"><div class="b" style="color:var(--teal)">Rs ${j.pay}</div><div class="mut" style="font-size:12px">${esc(j.day)}, ${esc(j.time)}</div></div></div>
 <div class="mut small" style="margin:10px 0 12px">${esc(j.problem||'No notes added.')}</div>
 <div class="row2"><button class="btn sm ghost" data-decl="${j.id}">Decline</button><button class="btn sm" data-acc="${j.id}">Accept</button></div></div>`}
function bindReq(){
  document.querySelectorAll('[data-acc]').forEach(b=>b.onclick=async()=>{try{await api('/api/worker/jobs/'+b.dataset.acc+'/accept',{body:{}});toast('Job accepted');nav('booking',{id:+b.dataset.acc,worker:1})}catch(e){toast(e.message)}});
  document.querySelectorAll('[data-decl]').forEach(b=>b.onclick=async()=>{try{await api('/api/worker/jobs/'+b.dataset.decl+'/decline',{body:{}});show()}catch(e){toast(e.message)}});
}

/* ---------- bookings tab ---------- */
let BKTAB='up';
SCREENS.bookings=async()=>{
  const j=await api('/api/bookings');
  const up=j.bookings.filter(b=>!['Completed','Cancelled'].includes(b.status)),past=j.bookings.filter(b=>['Completed','Cancelled'].includes(b.status));
  const rows=BKTAB==='up'?up:past;
  return {html:`${hdr('My bookings',{noback:1})}<div class="tabs2"><button data-t="up" class="${BKTAB==='up'?'on':''}">Upcoming (${up.length})</button><button data-t="past" class="${BKTAB==='past'?'on':''}">Past (${past.length})</button></div>
  <div class="scroll"><div class="list">${rows.length?rows.map(b=>`<button class="item" data-bk="${b.id}" style="flex-wrap:wrap"><div class="ico">${ic(b.icon)}</div><div class="m"><b>${esc(b.service)}</b><span>${esc(b.day)}, ${esc(b.time)}</span><span>${esc(b.code)} - Rs ${b.price}${b.status==='Completed'&&!b.paid?' - payment due':''}</span></div>${pillFor(b.status)}</button>`).join(''):`<div class="empty">${ic('cal','xl')}<div>${BKTAB==='up'?'No upcoming bookings.':'No past bookings yet.'}</div>${BKTAB==='up'?'<button class="btn sm" style="margin-top:16px;max-width:200px;margin-inline:auto" data-tab="home">Book a service</button>':''}</div>`}</div></div>`,
  after(){bindBk();document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{BKTAB=b.dataset.t;show()})}};
};

/* ---------- service detail ---------- */
SCREENS.service=async(p)=>{
  const j=await api('/api/services/'+p.slug),s=j.service;
  return {fab:false,html:`${hdr(s.name)}<div class="scroll" style="padding-bottom:16px">
   <div class="card" style="display:flex;gap:14px;align-items:center"><div class="ico" style="width:62px;height:62px;border-radius:18px">${ic(s.icon,'xl')}</div><div><div class="b" style="font-size:18px">${esc(s.name)}</div><div class="mut small">${esc(s.tagline)}</div><div style="margin-top:6px">${stars(s.rating)} <span class="mut small">(${s.reviews} reviews)</span></div></div></div>
   <div class="card" style="margin-top:12px"><div class="kv" style="padding-top:0"><span>Starting price</span><b>Rs ${s.price}</b></div><div class="kv"><span>Visit fee</span><b>Rs ${j.visit_fee}</b></div><div class="kv" style="padding-bottom:0"><span>Typical time</span><b>${esc(s.duration)}</b></div></div>
   <h2 class="sec">What is included</h2><div class="card">${s.includes.map(x=>`<div style="display:flex;gap:10px;padding:7px 0;align-items:center"><span style="color:var(--teal)">${ic('check','s')}</span>${esc(x)}</div>`).join('')}</div>
   <h2 class="sec">Professionals</h2><div class="list">${j.pros.map(p=>`<div class="item"><div class="avatar sm">${esc(initials(p.name))}</div><div class="m"><b>${esc(p.name)}</b><span>${p.jobs_done} jobs - ${esc(p.area)}</span></div>${stars(p.rating)}</div>`).join('')}</div>
   <h2 class="sec">Reviews</h2><div class="card">${j.reviews.map(r=>`<div class="review"><div style="display:flex;justify-content:space-between"><b>${esc(r.name)}</b>${stars(r.rating)}</div><div class="mut small" style="margin-top:3px">${esc(r.comment)}</div></div>`).join('')}</div>
  </div><div class="cta"><button class="btn" id="bk">Book ${esc(s.name)} - from Rs ${s.price+j.visit_fee}</button></div>`,
  after(){$('#bk').onclick=()=>nav('book',{slug:p.slug})}};
};
