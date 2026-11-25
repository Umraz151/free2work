'use strict';
const istNow=()=>new Date(Date.now()+5.5*3600e3);
function istDays(n){const out=[];const b=istNow();for(let i=0;i<n;i++){const d=new Date(b.getTime()+i*864e5);out.push({iso:d.toISOString().slice(0,10),dow:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getUTCDay()],num:d.getUTCDate(),mon:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]})}return out}

/* ---------- booking flow ---------- */
const BK={};
SCREENS.book=async(p)=>{
  const s=svcOf(p.slug),days=istDays(6);
  if(BK.slug!==p.slug||p.fresh!==false){Object.assign(BK,{slug:p.slug,area:p.area||S.user.area||'',address:p.address||S.user.street||'',date:p.date||days[0].iso,time:p.time||'',problem:p.problem||''})}
  const sl=await api('/api/slots?date='+BK.date);
  if(BK.time&&!sl.slots.find(x=>x.value===BK.time))BK.time='';
  if(!BK.time&&sl.slots.length)BK.time=sl.slots[0].value;
  const price=s.price+S.visit;
  return {fab:false,html:`${hdr('Book '+s.name)}<div class="scroll" style="padding-bottom:16px">
  <div id="berr"></div>
  <div class="fld"><label>Your area</label><div class="chips">${S.areas.map(a=>`<button class="ch ${BK.area===a.name?'on':''}" data-area="${esc(a.name)}">${esc(a.name)}</button>`).join('')}</div>
   <button class="btn sm sec" id="gps" style="margin-top:10px">${ic('locate','s')} Use my current location</button></div>
  <div class="fld"><label>House / street address</label><input class="inp" id="addr" placeholder="Flat no, building, street" value="${esc(BK.address)}"></div>
  <div class="fld"><label>Date</label><div class="days">${days.map(d=>`<button class="day ${BK.date===d.iso?'on':''}" data-day="${d.iso}">${d.dow}<b>${d.num}</b>${d.mon}</button>`).join('')}</div></div>
  <div class="fld"><label>Time</label>${sl.slots.length?`<div class="chips">${sl.slots.map(x=>`<button class="ch ${BK.time===x.value?'on':''}" data-time="${x.value}">${x.label}</button>`).join('')}</div>`:'<div class="mut small">No slots left today. Pick another date.</div>'}</div>
  <div class="fld"><label>Describe the problem (optional)</label><textarea class="inp" id="prob" placeholder="e.g. Kitchen tap is leaking">${esc(BK.problem)}</textarea></div>
  <div class="card"><div class="b" style="margin-bottom:6px">Price summary</div><div class="kv"><span>${esc(s.name)}</span><span>Rs ${s.price}</span></div><div class="kv"><span>Visit fee</span><span>Rs ${S.visit}</span></div><div class="kv tot"><span>Total</span><span>Rs ${price}</span></div><div class="mut small">Pay after the work is done. Spare parts, if needed, are extra.</div></div>
  </div><div class="cta"><button class="btn" id="conf" ${BK.time?'':'disabled'}>Confirm booking</button></div>`,
  after(){
    const keep=()=>{BK.address=$('#addr').value;BK.problem=$('#prob').value};
    const rerender=()=>{keep();replace('book',{slug:p.slug,area:BK.area,address:BK.address,date:BK.date,time:BK.time,problem:BK.problem,fresh:false})};
    document.querySelectorAll('[data-area]').forEach(b=>b.onclick=()=>{BK.area=b.dataset.area;rerender()});
    document.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{BK.date=b.dataset.day;BK.time='';rerender()});
    document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>{BK.time=b.dataset.time;rerender()});
    $('#gps').onclick=()=>useGps(a=>{BK.area=a;rerender()});
    $('#conf').onclick=async()=>{keep();const c=$('#conf');c.disabled=true;c.textContent='Booking...';
      try{const j=await api('/api/bookings',{body:{slug:p.slug,area:BK.area,address:BK.address,date:BK.date,time:BK.time,problem:BK.problem}});
        if(BK.address&&BK.address!==S.user.street){try{const m=await api('/api/me',{method:'PATCH',body:{street:BK.address,area:BK.area}});S.user=m.user}catch(e){}}
        S.stack.pop();nav('booking',{id:j.booking.id,fresh:1})}
      catch(e){$('#berr').innerHTML=`<div class="err">${esc(e.message)}</div>`;c.disabled=false;c.textContent='Confirm booking';$('#berr').scrollIntoView()}}
  }};
};
function useGps(cb){
  if(!navigator.geolocation){toast('Location is not available. Pick your area instead.');return}
  toast('Finding your location...');
  navigator.geolocation.getCurrentPosition(async pos=>{
    try{const j=await api('/api/geo/nearest',{body:{lat:pos.coords.latitude,lon:pos.coords.longitude}});
      const m=await api('/api/me',{method:'PATCH',body:{lat:pos.coords.latitude,lon:pos.coords.longitude}});S.user=m.user;
      toast(j.in_coverage?'Location set: '+m.user.area:'You seem outside our demo areas. Nearest: '+m.user.area);cb(m.user.area,pos.coords)}catch(e){toast(e.message)}
  },()=>toast('Could not get location. Allow permission or pick your area.'),{enableHighAccuracy:false,timeout:12000,maximumAge:60000});
}

function addrFull(b){return b.address.toLowerCase().includes(b.area.toLowerCase())?b.address:b.address+', '+b.area}
/* ---------- booking detail ---------- */
SCREENS.booking=async(p)=>{
  const j=await api('/api/bookings/'+p.id),b=j.booking,w=b.worker,mineCust=b.mine;
  const active=!['Completed','Cancelled'].includes(b.status);
  let actions='';
  if(mineCust){
    if(b.status==='Completed'&&!b.paid)actions+=`<button class="btn" data-go="pay">Pay Rs ${b.price}</button>`;
    if(b.status==='Completed'&&b.paid&&!b.reviewed)actions+=`<button class="btn" data-go="rate">Rate your experience</button>`;
    if(['Requested','Accepted'].includes(b.status))actions+=`<button class="btn red" id="cancel">Cancel booking</button>`;
    if(['In progress'].includes(b.status))actions+=`<button class="btn sec" id="done">Mark work as done</button>`;
  }else{
    if(b.status==='Accepted')actions+=`<div class="row2"><button class="btn sec" data-wa="onway">I am on the way</button><button class="btn" data-wa="start">Start work</button></div>`;
    if(b.status==='On the way')actions+=`<button class="btn" data-wa="start">Start work</button>`;
    if(['In progress','On the way','Accepted'].includes(b.status))actions+=`<button class="btn dark" data-wa="complete" style="margin-top:10px">Mark as completed</button>`;
  }
  const peer=mineCust?w:{name:b.customer_name};
  return {fab:false,html:`${hdr(b.service,{right:pillFor(b.status)})}<div class="scroll" style="padding-bottom:16px">
   <div class="card"><div class="mut small">Booking ${esc(b.code)}</div><div class="b" style="font-size:17px;margin-top:2px">${esc(b.day)}, ${esc(b.time)}</div><div class="mut small" style="margin-top:4px;display:flex;gap:6px;align-items:center">${ic('pin','s')}${esc(addrFull(b))}</div>${b.problem?`<div class="hr"></div><div class="small">${esc(b.problem)}</div>`:''}</div>
   ${b.status!=='Cancelled'?`<div class="card" style="margin-top:12px"><div class="b" style="margin-bottom:12px">Progress</div><div class="tl">${b.timeline.map(t=>`<div class="${t.done?'d':''} ${t.current?'c':''}"><i></i>${esc(t.name)}</div>`).join('')}</div></div>`:''}
   ${peer&&(w||!mineCust)?`<div class="card" style="margin-top:12px"><div class="provider"><div class="avatar">${esc(initials(peer.name))}</div><div style="flex:1;min-width:0"><div class="mut" style="font-size:12px">${mineCust?'Your professional':'Customer'}</div><b>${esc(peer.name)}</b>${mineCust&&w?`<div>${stars(w.rating)} <span class="mut small">${w.jobs_done} jobs</span></div>`:''}</div>
     ${active?`<a class="ib" style="background:var(--blue-l);color:var(--blue)" href="tel:${esc(mineCust?w.phone:'')}">${ic('phone')}</a><button class="ib" style="background:var(--blue-l);color:var(--blue)" data-go="chat">${ic('chat')}</button>`:''}</div></div>`:(mineCust&&active?`<div class="card" style="margin-top:12px;display:flex;gap:12px;align-items:center"><div class="spin" style="margin:0;width:28px;height:28px;border-width:3px"></div><div><b>Finding a professional</b><div class="mut small">Nearby professionals are being notified.</div></div></div>`:'')}
   <div class="card" style="margin-top:12px"><div class="b" style="margin-bottom:4px">Payment</div><div class="kv"><span>Service</span><span>Rs ${b.breakdown.service}</span></div><div class="kv"><span>Visit fee</span><span>Rs ${b.breakdown.visit}</span></div><div class="kv tot"><span>Total</span><span>Rs ${b.breakdown.total}</span></div>${b.paid?`<div class="pill done" style="margin-top:6px">Paid via ${esc(b.pay_method)} (demo) - ${esc(b.txn_id)}</div>`:''}</div>
   ${b.review?`<div class="card" style="margin-top:12px"><div class="b">Your review</div><div style="margin:4px 0">${stars(b.review.rating)}</div><div class="mut small">${esc(b.review.comment||'')}</div></div>`:''}
  </div>${actions?`<div class="cta">${actions}</div>`:''}`,
  after(){
    document.querySelectorAll('[data-go]').forEach(x=>x.onclick=()=>nav(x.dataset.go,{id:b.id,worker:!mineCust}));
    const c=$('#cancel');if(c)c.onclick=async()=>{if(!confirm('Cancel this booking?'))return;try{await api('/api/bookings/'+b.id+'/cancel',{body:{}});toast('Booking cancelled');show()}catch(e){toast(e.message)}};
    const d=$('#done');if(d)d.onclick=async()=>{try{await api('/api/bookings/'+b.id+'/confirm-done',{body:{}});show()}catch(e){toast(e.message)}};
    document.querySelectorAll('[data-wa]').forEach(x=>x.onclick=async()=>{try{await api('/api/worker/jobs/'+b.id+'/'+x.dataset.wa,{body:{}});show()}catch(e){toast(e.message)}});
    if(active&&mineCust){const tk=renderToken;setTimeout(()=>{if(tk===renderToken&&document.querySelector('.tl,.spin'))show()},9000)}
  }};
};

/* ---------- payment (demo) ---------- */
const UPIAPPS=[['gpay','GPay','#2F6BFF'],['phonepe','PhonePe','#5F259F'],['paytm','Paytm','#0B7EC8'],['id','UPI ID','#142B57']];
const PAY={method:'UPI',app:'gpay',vpa:''};
SCREENS.pay=async(p)=>{
  const b=(await api('/api/bookings/'+p.id)).booking;
  if(b.paid){return SCREENS.paySuccess(b)}
  return {fab:false,html:`${hdr('Payment')}<div class="scroll" style="padding-bottom:16px">
   <div class="banner">${ic('info','s')}DEMO PAYMENT. No real money is charged.</div>
   <div class="card center"><div class="mut small">Amount to pay</div><div style="font-size:36px;font-weight:800;letter-spacing:-1px;margin:2px 0">Rs ${b.price}</div><div class="mut small">${esc(b.service)} - ${esc(b.code)}</div></div>
   <h2 class="sec">Pay using</h2>
   <button class="payopt ${PAY.method==='UPI'?'on':''}" data-pm="UPI"><span class="ico">${ic('phone')}</span>UPI<span class="radio"></span></button>
   ${PAY.method==='UPI'?`<div class="upi" style="margin-top:10px">${UPIAPPS.map(a=>`<button class="${PAY.app===a[0]?'on':''}" data-ua="${a[0]}"><b style="background:${a[2]}">${a[1][0]}</b>${a[1]}</button>`).join('')}</div>${PAY.app==='id'?`<input class="inp" id="vpa" style="margin-top:10px" placeholder="yourname@bank" value="${esc(PAY.vpa)}">`:''}`:''}
   <button class="payopt ${PAY.method==='Card'?'on':''}" data-pm="Card"><span class="ico">${ic('card')}</span>Debit / Credit card (demo)<span class="radio"></span></button>
   <button class="payopt ${PAY.method==='Cash'?'on':''}" data-pm="Cash"><span class="ico">${ic('wallet')}</span>Cash after service<span class="radio"></span></button>
   <div id="perr" style="margin-top:12px"></div>
  </div><div class="cta"><button class="btn" id="paygo">Pay Rs ${b.price}</button></div>`,
  after(){
    document.querySelectorAll('[data-pm]').forEach(x=>x.onclick=()=>{PAY.method=x.dataset.pm;show()});
    document.querySelectorAll('[data-ua]').forEach(x=>x.onclick=()=>{PAY.app=x.dataset.ua;show()});
    $('#paygo').onclick=async()=>{
      const v=$('#vpa');if(v)PAY.vpa=v.value;
      $('#screen').innerHTML=`${hdr('Payment',{noback:1})}<div class="scroll center"><div class="spin"></div><div class="b">Processing demo payment...</div><div class="mut small">Please do not close the app</div></div>`;
      try{const [j]=await Promise.all([api('/api/bookings/'+b.id+'/pay',{body:{method:PAY.method,upi_app:PAY.app,upi_id:PAY.vpa}}),new Promise(r=>setTimeout(r,1400))]);
        S.stack.pop();S.stack.push({name:'paySuccess',params:{b:j.booking}});show()}
      catch(e){show().then(()=>{const x=$('#perr');if(x)x.innerHTML=`<div class="err">${esc(e.message)}</div>`})}
    };
  }};
};
SCREENS.paySuccess=async(p)=>{const b=p.b||p;return {fab:false,html:`<div class="scroll center" style="display:flex;flex-direction:column;justify-content:center">
  <div class="ok-ring">${ic('check')}</div><div style="font-size:22px;font-weight:800">Payment successful</div><div class="mut small" style="margin:4px 0 18px">Demo payment. No money moved.</div>
  <div class="card" style="text-align:left"><div class="kv" style="padding-top:0"><span>Amount</span><b>Rs ${b.price}</b></div><div class="kv"><span>Method</span><span>${esc(b.pay_method)}</span></div><div class="kv"><span>Transaction ID</span><span>${esc(b.txn_id)}</span></div><div class="kv" style="padding-bottom:0"><span>Service</span><span>${esc(b.service)}</span></div></div>
  <div style="margin-top:20px;display:flex;flex-direction:column;gap:10px">${b.reviewed?'':`<button class="btn" id="rt">Rate your professional</button>`}<button class="btn ghost" id="hm">Back to home</button></div></div>`,
  after(){const r=$('#rt');if(r)r.onclick=()=>{S.stack.pop();nav('rate',{id:b.id})};$('#hm').onclick=()=>goTab('home')}}};

/* ---------- rate ---------- */
const TAGS=['On time','Polite','Great work','Fair price','Clean work'];
SCREENS.rate=async(p)=>{
  const b=(await api('/api/bookings/'+p.id)).booking;let rating=0;const tags=new Set();
  return {fab:false,html:`${hdr('Rate your experience')}<div class="scroll"><div class="center" style="margin-top:6px"><div class="avatar lg" style="margin:0 auto;background:linear-gradient(135deg,#3C78FF,#142B57)">${esc(initials(b.worker?b.worker.name:'P'))}</div><div class="b" style="font-size:18px;margin-top:10px">How was ${esc(b.worker?b.worker.name:'the service')}?</div><div class="mut small">${esc(b.service)}</div></div>
  <div class="stars" id="st">${[1,2,3,4,5].map(i=>`<button data-s="${i}">${ic('star')}</button>`).join('')}</div>
  <div class="chips" style="justify-content:center;margin:6px 0 16px">${TAGS.map(t=>`<button class="ch" data-tg="${t}">${t}</button>`).join('')}</div>
  <textarea class="inp" id="cm" placeholder="Write a review (optional)"></textarea><div id="rerr" style="margin-top:12px"></div></div>
  <div class="cta"><button class="btn" id="sub" disabled>Submit review</button></div>`,
  after(){
    document.querySelectorAll('[data-s]').forEach(x=>x.onclick=()=>{rating=+x.dataset.s;document.querySelectorAll('[data-s]').forEach(y=>y.classList.toggle('on',+y.dataset.s<=rating));$('#sub').disabled=false});
    document.querySelectorAll('[data-tg]').forEach(x=>x.onclick=()=>{const t=x.dataset.tg;tags.has(t)?tags.delete(t):tags.add(t);x.classList.toggle('on')});
    $('#sub').onclick=async()=>{try{await api('/api/bookings/'+b.id+'/review',{body:{rating,tags:[...tags],comment:$('#cm').value}});toast('Thanks for your review!');S.stack.pop();show()}catch(e){$('#rerr').innerHTML=`<div class="err">${esc(e.message)}</div>`}}
  }};
};

/* ---------- chat ---------- */
SCREENS.chat=async(p)=>{
  const j=await api('/api/bookings/'+p.id+'/messages');
  const draw=ms=>ms.map(m=>{const mine=(p.worker?m.sender==='worker':m.sender==='customer');return `<div class="bubble ${mine?'me':'them'}">${esc(m.text)}<small>${esc(m.ts)}</small></div>`}).join('');
  return {fab:false,html:`<div class="hdr"><button class="ib" data-back>${ic('back')}</button><div class="avatar sm">${esc(initials(j.peer.name))}</div><h1 style="font-size:16px">${esc(j.peer.name)}<div class="mut" style="font-size:12px;font-weight:500">${p.worker?'Customer':'Your professional'}</div></h1></div>
  <div class="scroll" id="msgs" style="padding-bottom:8px">${draw(j.messages)||'<div class="empty">Say hello!</div>'}</div>
  <div class="composer"><input id="mi" placeholder="Type a message" autocomplete="off"><button class="sendb" id="ms">${ic('send')}</button></div>`,
  after(){
    const box=$('#msgs');box.scrollTop=box.scrollHeight;
    const send=async()=>{const i=$('#mi'),t=i.value.trim();if(!t)return;i.value='';try{const r=await api('/api/bookings/'+p.id+'/messages',{body:{text:t}});box.innerHTML=draw(r.messages);box.scrollTop=box.scrollHeight}catch(e){toast(e.message)}};
    $('#ms').onclick=send;$('#mi').onkeydown=e=>{if(e.key==='Enter')send()};
  }};
};
