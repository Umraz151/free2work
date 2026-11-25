"""In-app assistant: understands a message and performs real tasks (jobs, bookings, status, cancel, earnings)."""
import re
from datetime import datetime, timedelta, date, time

SERV = {
    'plumbing': r'(plumb|tap|leak|pipe|drain|प्लंब|ಪ್ಲಂಬ|ప్లంబ)',
    'electrical': r'(electric|wiring|fan|switch|light|इलेक्ट्रिक|बिजली|ಎಲೆಕ್ಟ್ರಿಕ|ఎలక్ట్రిక)',
    'house-cleaning': r'(clean|maid|सफाई|ಸ್ವಚ್ಛ|శుభ్ర)',
    'ac-repair': r'(\bac\b|air ?condition|एसी|ಎಸಿ|ఏసీ)',
    'appliance-repair': r'(appliance|washing machine|fridge|refrigerator|microwave|उपकरण|ಉಪಕರಣ)',
    'carpentry': r'(carpent|furniture|door|shelf|बढ़ई|ಮರಗೆಲಸ|వడ్రంగి)',
    'painting': r'(paint|पेंट|ಪೇಂಟ|పెయింట)',
    'pet-care': r'(\bpet\b|\bdog\b|\bcat\b|पेट|ಪೆಟ್|పెట్)',
}
JOBS = r'(\bjobs?\b|work near|find work|need work|vacanc|earn money|openings|kaam|काम चाहिए|नौकरी|ಕೆಲಸ|ఉద్యోగ|పని)'
BOOK = r'(\bbook\b|\bhire\b|\bschedule\b|\bneed an?\b|\barrange\b|बुक|ಬುಕ್|బుక్)'
MYB = r'(my (bookings?|orders?|jobs?)|booking status|track|status of|show bookings|मेरी बुकिंग|ನನ್ನ ಬುಕಿಂಗ್|నా బుకింగ్)'
CANCEL = r'(cancel|रद्द|ರದ್ದು|రద్దు)'
EARN = r'(earning|income|money i made|payout|कमाई|ಆದಾಯ|సంపాదన)'
PAY = r'(\bpay\b|payment|bill|पेमेंट|भुगतान)'
GREET = r'^(hi|hello|hey|namaste|hola|good (morning|afternoon|evening)|नमस्ते|ನಮಸ್ಕಾರ|నమస్కారం)(?![a-z])'
THANKS = r'(thank|thanks|धन्यवाद|ಧನ್ಯವಾದ|ధన్యవాద)'
HELP = r'(help|what can you do|features|options|मदद|ಸಹಾಯ|సహాయం)'
PRICE = r'(price|cost|charges?|rate|how much|कीमत|दाम|ಬೆಲೆ|ధర)'

T = {
 'greet': {'en': 'Hi {n}! I can find jobs near you, book a service for you, show your bookings, cancel one, or answer questions. What would you like?',
           'hi': 'नमस्ते {n}! मैं पास के काम खोज सकता हूँ, सर्विस बुक कर सकता हूँ, बुकिंग दिखा सकता हूँ। क्या चाहिए?',
           'kn': 'ನಮಸ್ಕಾರ {n}! ಹತ್ತಿರದ ಕೆಲಸ ಹುಡುಕಬಲ್ಲೆ, ಸೇವೆ ಬುಕ್ ಮಾಡಬಲ್ಲೆ, ಬುಕಿಂಗ್ ತೋರಿಸಬಲ್ಲೆ. ಏನು ಬೇಕು?',
           'te': 'నమస్కారం {n}! దగ్గరి ఉద్యోగాలు వెతకగలను, సేవ బుక్ చేయగలను, బుకింగ్‌లు చూపగలను. ఏం కావాలి?'},
 'jobs': {'en': 'I found {k} job request(s) near {a}, closest first:', 'hi': '{a} के पास {k} काम मिले, सबसे पास वाले पहले:',
          'kn': '{a} ಹತ್ತಿರ {k} ಕೆಲಸಗಳು ಸಿಕ್ಕಿವೆ:', 'te': '{a} దగ్గర {k} పనులు దొరికాయి:'},
 'nojobs': {'en': 'No open job requests right now. New ones appear often, ask me again soon.', 'hi': 'अभी कोई खुला काम नहीं है।',
            'kn': 'ಈಗ ಕೆಲಸಗಳಿಲ್ಲ.', 'te': 'ఇప్పుడు పనులు లేవు.'},
 'draft': {'en': 'Here is your booking draft. Shall I confirm it?', 'hi': 'यह आपकी बुकिंग का ड्राफ्ट है। कन्फ़र्म करूँ?',
           'kn': 'ಇದು ನಿಮ್ಮ ಬುಕಿಂಗ್ ಡ್ರಾಫ್ಟ್. ಕನ್ಫರ್ಮ್ ಮಾಡಲೇ?', 'te': 'ఇది మీ బుకింగ్ డ్రాఫ్ట్. కన్ఫర్మ్ చేయాలా?'},
 'which': {'en': 'Which service should I book?', 'hi': 'कौन सी सर्विस बुक करूँ?', 'kn': 'ಯಾವ ಸೇವೆ ಬುಕ್ ಮಾಡಲಿ?', 'te': 'ఏ సేవ బుక్ చేయాలి?'},
 'noarea': {'en': 'Where are you? Pick your area and I will continue.', 'hi': 'आप कहाँ हैं? अपना इलाका चुनें।', 'kn': 'ನೀವು ಎಲ್ಲಿದ್ದೀರಿ?', 'te': 'మీరు ఎక్కడ ఉన్నారు?'},
 'noaddr': {'en': 'I need your house or street address first. Type it in the form I opened for you.', 'hi': 'पहले आपका पता चाहिए।', 'kn': 'ಮೊದಲು ವಿಳಾಸ ಬೇಕು.', 'te': 'ముందుగా చిరునామా కావాలి.'},
 'mybk': {'en': 'Your latest bookings:', 'hi': 'आपकी बुकिंग:', 'kn': 'ನಿಮ್ಮ ಬುಕಿಂಗ್‌ಗಳು:', 'te': 'మీ బుకింగ్‌లు:'},
 'nobk': {'en': 'You have no bookings yet. Say "book plumbing for tomorrow morning" to start.', 'hi': 'अभी कोई बुकिंग नहीं है।', 'kn': 'ಇನ್ನೂ ಬುಕಿಂಗ್ ಇಲ್ಲ.', 'te': 'ఇంకా బుకింగ్‌లు లేవు.'},
 'done': {'en': 'Done! Booking {c} is placed. Nearby professionals will accept it shortly.', 'hi': 'हो गया! बुकिंग {c} हो गई।', 'kn': 'ಆಯಿತು! ಬುಕಿಂಗ್ {c} ಆಗಿದೆ.', 'te': 'అయింది! బుకింగ్ {c} చేయబడింది.'},
}


def clean(x):
    x = re.sub(r'\*\*|__|`', '', x or '')
    x = re.sub(r'[\U00010000-\U0010ffff\u2600-\u27bf\ufe0f]', '', x)
    return x.strip()


def t(key, lang, **kw):
    return T[key].get(lang, T[key]['en']).format(**kw)


class Context:
    def __init__(self, user, db, app):
        self.u, self.db, self.m = user, db, app


def detect_service(text):
    for slug, pat in SERV.items():
        if re.search(pat, text.lower()):
            return slug
    return None


def parse_when(text, ctx):
    """Returns (date, 'HH:MM') in IST from words like 'tomorrow evening' or 'at 5 pm'."""
    m = ctx.m
    now = datetime.now(m.TZ)
    low = text.lower()
    d = now.date()
    if re.search(r'day after|parso|परसों', low):
        d = d + timedelta(days=2)
    elif re.search(r'tomorrow|tmrw|kal\b|कल', low):
        d = d + timedelta(days=1)
    hh = None
    mt = re.search(r'\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b', low)
    if mt:
        hh = int(mt.group(1)) % 12 + (12 if mt.group(3) == 'pm' else 0)
    elif re.search(r'morning|सुबह', low):
        hh = 10
    elif re.search(r'afternoon|दोपहर', low):
        hh = 14
    elif re.search(r'evening|शाम', low):
        hh = 18
    elif re.search(r'night|रात', low):
        hh = 20
    slots = [8, 10, 12, 14, 16, 18, 20]
    if hh is not None:
        hh = min(slots, key=lambda s: abs(s - hh))
    for _ in range(4):
        avail = [s for s in slots if datetime.combine(d, time(s), m.TZ) >= now + timedelta(hours=2)]
        pick = hh if (hh in avail) else (avail[0] if avail else None)
        if pick is not None and (hh is None or hh in avail or True):
            return d, f'{pick:02d}:00'
        d = d + timedelta(days=1)
    return d, '10:00'


def default_address(ctx):
    u, m = ctx.u, ctx.m
    if u.street and u.area:
        return u.street, u.area
    b = m.Booking.query.filter_by(customer_id=u.id).order_by(m.Booking.created_at.desc()).first()
    if b:
        return b.address, b.area
    return None, u.area


def reply(ctx, msg, lang='en'):
    u, m = ctx.u, ctx.m
    low = msg.lower().strip()
    first = u.name.split()[0]
    base = {'language': lang, 'cards': [], 'actions': [], 'chips': []}
    if re.search(GREET, low):
        base['reply'] = t('greet', lang, n=first)
        base['chips'] = ['Find jobs near me', 'Book plumbing for tomorrow morning', 'Show my bookings']
        return base
    if re.search(THANKS, low):
        base['reply'] = "You're welcome! Anything else I can do?"
        return base
    if re.search(CANCEL, low) and re.search(r'(booking|order|job|service|plumb|electric|clean)', low) or low in ('cancel', 'cancel it'):
        rows = m.Booking.query.filter(m.Booking.customer_id == u.id, m.Booking.status.in_(['Requested', 'Accepted'])) \
            .order_by(m.Booking.created_at.desc()).all()
        if not rows:
            base['reply'] = 'You have no booking that can be cancelled right now.'
            return base
        b = rows[0]
        base['reply'] = f'Cancel your {m.SERVICE_MAP[b.service_slug][1]} booking {b.code}?'
        base['cards'] = [card_booking(ctx, b)]
        base['actions'] = [{'type': 'cancel_booking', 'id': b.id, 'label': 'Yes, cancel it', 'style': 'danger'},
                           {'type': 'dismiss', 'label': 'Keep it'}]
        return base
    if re.search(EARN, low):
        w = m.my_worker(u)
        rows = m.Booking.query.filter_by(worker_id=w.id, status='Completed').all()
        total = sum(b.price - m.VISIT_FEE for b in rows)
        base['reply'] = f'You completed {len(rows)} job(s) here, earning Rs {total}. Open Earnings for the full chart.'
        base['actions'] = [{'type': 'open_earnings', 'label': 'Open earnings'}]
        return base
    if re.search(PAY, low) and not re.search(BOOK, low):
        b = m.Booking.query.filter_by(customer_id=u.id, status='Completed', paid=False).order_by(m.Booking.created_at.desc()).first()
        if not b:
            base['reply'] = 'You have no completed booking waiting for payment.'
            return base
        base['reply'] = f'{b.code} is completed. Amount due: Rs {b.price} (demo payment).'
        base['actions'] = [{'type': 'open_payment', 'id': b.id, 'label': f'Pay Rs {b.price}'}]
        return base
    if re.search(MYB, low):
        m.advance_all(u)
        rows = m.Booking.query.filter_by(customer_id=u.id).order_by(m.Booking.created_at.desc()).limit(4).all()
        if not rows:
            base['reply'] = t('nobk', lang)
            return base
        base['reply'] = t('mybk', lang)
        base['cards'] = [card_booking(ctx, b) for b in rows]
        base['actions'] = [{'type': 'open_bookings', 'label': 'Open all bookings'}]
        return base
    sv = detect_service(low)
    if re.search(BOOK, low) and not re.search(r'how (do|to|can)', low):
        if not sv:
            base['reply'] = t('which', lang)
            base['actions'] = [{'type': 'draft', 'slug': s[0], 'label': s[1], 'text': msg} for s in m.SERVICES]
            return base
        return draft(ctx, sv, msg, lang, base)
    if re.search(JOBS, low) and not re.search(r'(how (do|to) (i )?(join|become))', low):
        jobs = m.open_jobs_for(u)
        area = u.area or 'you'
        if not jobs:
            base['reply'] = t('nojobs', lang)
            return base
        base['reply'] = t('jobs', lang, k=min(len(jobs), 4), a=area)
        base['cards'] = [{'kind': 'job', 'id': j['id'], 'title': j['service'], 'sub': f"{j['area']} - {j['distance_km']} km - {j['day']} {j['time']}",
                          'meta': f"Earn Rs {j['pay']}", 'icon': j['icon'], 'text': j['problem']} for j in jobs[:4]]
        base['actions'] = [{'type': 'accept_job', 'id': j['id'], 'label': 'Accept: ' + j['service'] + ' (' + j['area'] + ')'} for j in jobs[:3]]
        base['actions'].append({'type': 'open_jobs', 'label': 'See all jobs'})
        return base
    if re.search(PRICE, low) or re.search(r'(services|what do you offer)', low):
        if sv:
            s = m.SERVICE_MAP[sv]
            base['reply'] = f'{s[1]} starts at Rs {s[3]} plus Rs {m.VISIT_FEE} visit fee. Typical time: {s[4]}.'
            base['actions'] = [{'type': 'draft', 'slug': sv, 'label': f'Book {s[1]}', 'text': ''}]
        else:
            base['reply'] = 'Starting prices: ' + ', '.join(f'{s[1]} Rs {s[3]}' for s in m.SERVICES) + '.'
        return base
    if re.search(HELP, low):
        base['reply'] = t('greet', lang, n=first)
        base['chips'] = ['Find jobs near me', 'Book plumbing for tomorrow morning', 'Show my bookings']
        return base
    if sv:  # just a service word, offer to book
        s = m.SERVICE_MAP[sv]
        base['reply'] = f'{s[1]}: {s[2]}. From Rs {s[3]}.'
        base['actions'] = [{'type': 'draft', 'slug': sv, 'label': f'Book {s[1]}', 'text': msg}]
        return base
    try:
        import chatbot
        r = chatbot.process_chat_message(msg, language=lang, role='worker' if u.mode == 'worker' else 'customer')
        if r.get('intent') not in (None, 'fallback'):
            base['reply'] = clean(r['reply'])
            return base
    except Exception:
        pass
    base['reply'] = ("I can do these for you: find jobs near you, book a service, show or cancel bookings, "
                     "and answer questions about prices and areas. Try one of the suggestions.")
    base['chips'] = ['Find jobs near me', 'Book plumbing for tomorrow morning', 'Show my bookings']
    return base


def card_booking(ctx, b):
    j = ctx.m.booking_json(b, ctx.u)
    return {'kind': 'booking', 'id': b.id, 'title': j['service'], 'sub': f"{j['day']}, {j['time']} - {j['area']}",
            'meta': b.status, 'icon': j['icon'], 'code': b.code}


def draft(ctx, slug, text, lang, base):
    m, u = ctx.m, ctx.u
    s = m.SERVICE_MAP[slug]
    d, hhmm = parse_when(text or '', ctx)
    street, area = default_address(ctx)
    if not area:
        base['reply'] = t('noarea', lang)
        base['actions'] = [{'type': 'set_area', 'area': a, 'slug': slug, 'text': text, 'label': a} for a in list(m.AREAS)[:10]]
        return base
    if not street:
        base['reply'] = t('noaddr', lang)
        base['actions'] = [{'type': 'change_booking', 'slug': slug, 'area': area, 'date': d.isoformat(), 'time': hhmm, 'label': 'Open booking form'}]
        return base
    when = datetime.combine(d, time(int(hhmm[:2])), m.TZ)
    base['reply'] = t('draft', lang)
    base['cards'] = [{'kind': 'draft', 'title': s[1], 'icon': s[5],
                      'rows': [['When', when.strftime('%a, %d %b, %I:%M %p').replace(' 0', ' ')], ['Where', f'{street}, {area}'],
                               ['Price', f'Rs {m.quote(slug)} (incl. Rs {m.VISIT_FEE} visit)']]}]
    payload = {'slug': slug, 'area': area, 'address': street, 'date': d.isoformat(), 'time': hhmm, 'problem': (text or '')[:200]}
    base['actions'] = [{'type': 'confirm_booking', 'label': 'Confirm booking', **payload},
                       {'type': 'change_booking', 'label': 'Change details', **payload}]
    return base


def perform(ctx, d):
    m, u = ctx.m, ctx.u
    t_ = d.get('type')
    if t_ == 'draft':
        base = {'language': 'en', 'cards': [], 'actions': [], 'chips': []}
        r = draft(ctx, d.get('slug'), d.get('text') or '', d.get('language', 'en'), base)
        return r
    if t_ == 'set_area':
        if d.get('area') in m.AREAS:
            u.area = d['area']
            u.lat = u.lon = None
            ctx.db.session.commit()
        base = {'language': 'en', 'cards': [], 'actions': [], 'chips': []}
        return draft(ctx, d.get('slug'), d.get('text') or '', 'en', base)
    if t_ == 'confirm_booking':
        b, e = m.create_booking(u, d.get('slug'), d.get('area'), d.get('address'), d.get('date'), d.get('time'), d.get('problem'))
        if e:
            return {'reply': e, 'cards': [], 'actions': []}
        return {'reply': t('done', 'en', c=b.code), 'cards': [card_booking(ctx, b)],
                'actions': [{'type': 'open_booking', 'id': b.id, 'label': 'Track booking'}], 'booking_id': b.id}
    if t_ == 'cancel_booking':
        b = ctx.db.session.get(m.Booking, d.get('id'))
        if not b or b.customer_id != u.id or b.status not in ('Requested', 'Accepted'):
            return {'reply': 'That booking can no longer be cancelled.', 'cards': [], 'actions': []}
        b.status = 'Cancelled'
        m.notify(u.id, 'Booking cancelled', f'Booking {b.code} was cancelled.', b.id)
        ctx.db.session.commit()
        return {'reply': f'Cancelled booking {b.code}.', 'cards': [], 'actions': []}
    if t_ == 'accept_job':
        b = ctx.db.session.get(m.Booking, d.get('id'))
        w = m.my_worker(u)
        if not b or b.worker_id or b.status != 'Requested' or b.customer_id == u.id:
            return {'reply': 'Sorry, that job is no longer available.', 'cards': [], 'actions': []}
        if not u.available:
            return {'reply': 'You are set to unavailable. Turn availability on in the Jobs tab first.', 'cards': [], 'actions': []}
        b.worker_id, b.status, b.accepted_at = w.id, 'Accepted', m.now_utc()
        m.notify(b.customer_id, 'Booking accepted', f'{u.name} accepted your {m.SERVICE_MAP[b.service_slug][1]} request.', b.id)
        m.notify(u.id, 'Job accepted', f'You accepted {b.code} at {b.area}.', b.id)
        ctx.db.session.add(m.Message(booking_id=b.id, sender='worker', text=f'Hello! I am {u.name.split()[0]}. I accepted your request.'))
        ctx.db.session.commit()
        return {'reply': f'Accepted! {m.SERVICE_MAP[b.service_slug][1]} job at {b.area}. Open it to chat with the customer.',
                'cards': [], 'actions': [{'type': 'open_job', 'id': b.id, 'label': 'Open job'}]}
    return {'reply': 'Done.', 'cards': [], 'actions': []}
