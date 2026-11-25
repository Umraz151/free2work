"""Free2Work - local services and jobs app (college project).
Flask + SQLite. Runs on a PC, on a free host, or inside the Android APK.
"""
import os, re, math, hmac, hashlib, secrets, logging
from datetime import datetime, timedelta, date, time, timezone
from functools import wraps
from flask import Flask, render_template, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy

import otp as otp_module
import assistant

# ---------------------------------------------------------------- time zone
# Android's Python has no tz database, so fall back to a fixed +05:30 offset.
try:
    from zoneinfo import ZoneInfo
except Exception:  # pragma: no cover
    ZoneInfo = None


def _zone(name):
    try:
        return ZoneInfo(name)
    except Exception:
        if name == 'UTC':
            return timezone.utc
        if name == 'Asia/Kolkata':
            return timezone(timedelta(hours=5, minutes=30), 'IST')
        raise


TZ = _zone('Asia/Kolkata')
UTC = _zone('UTC')


def now_utc():
    return datetime.now(UTC).replace(tzinfo=None)


def to_ist(dt):
    return dt.replace(tzinfo=UTC).astimezone(TZ)


def from_ist(d, hhmm):
    h, m = [int(x) for x in hhmm.split(':')]
    return datetime.combine(d, time(h, m), TZ).astimezone(UTC).replace(tzinfo=None)


# ---------------------------------------------------------------- app setup
BASE = os.path.abspath(os.path.dirname(__file__))
DATA = os.getenv('F2W_DATA') or os.path.join(BASE, 'instance')
os.makedirs(DATA, exist_ok=True)
WEB = os.getenv('F2W_WEB') or BASE
app = Flask(__name__, instance_path=DATA,
            template_folder=os.path.join(WEB, 'templates'),
            static_folder=os.path.join(WEB, 'static'))
app.config.update(
    SECRET_KEY=os.getenv('SECRET_KEY', 'free2work-demo-secret-change-for-real-use'),
    SQLALCHEMY_DATABASE_URI=os.getenv('DATABASE_URL', 'sqlite:///' + os.path.join(DATA, 'free2work.db')),
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=os.getenv('COOKIE_SECURE', 'false').lower() == 'true',
    PERMANENT_SESSION_LIFETIME=timedelta(days=365),
    MAX_CONTENT_LENGTH=1024 * 1024,
)
db = SQLAlchemy(app)
log = logging.getLogger('f2w')

# ---------------------------------------------------------------- static data
AREAS = {  # name: (lat, lon)
    'Whitefield': (12.9698, 77.7500), 'Marathahalli': (12.9569, 77.7011),
    'Electronic City': (12.8452, 77.6602), 'Indiranagar': (12.9719, 77.6412),
    'Koramangala': (12.9352, 77.6245), 'Jayanagar': (12.9308, 77.5838),
    'HSR Layout': (12.9116, 77.6474), 'Rajajinagar': (12.9915, 77.5520),
    'Hebbal': (13.0358, 77.5970), 'BTM Layout': (12.9166, 77.6101),
}
QUALIFICATIONS = ['10th', '12th', 'Diploma', 'Graduate', 'Other']

SERVICES = [
    # slug, name, tagline, price, duration, icon, includes
    ('plumbing', 'Plumbing', 'Leaks, taps, pipes and drains', 399, '45-90 min', 'wrench',
     ['Tap and leak repair', 'Drain blockage clearing', 'Bathroom fittings', 'Water tank and motor check']),
    ('electrical', 'Electrician', 'Wiring, fans, switches and lights', 449, '45-90 min', 'bolt',
     ['Fan and light installation', 'Switchboard repair', 'Wiring inspection', 'MCB and inverter check']),
    ('house-cleaning', 'Home Cleaning', 'Kitchen, bathroom and deep clean', 699, '2-5 hours', 'sparkle',
     ['Kitchen deep clean', 'Bathroom scrub', 'Floor and window cleaning', 'Full-home cleaning']),
    ('ac-repair', 'AC Service', 'Servicing, gas fill and repairs', 499, '60-120 min', 'snow',
     ['Jet-pump AC service', 'Gas leak check', 'Filter cleaning', 'Installation and uninstall']),
    ('appliance-repair', 'Appliance Repair', 'Washing machine, fridge, microwave', 399, '60-120 min', 'plug',
     ['Washing machine repair', 'Refrigerator repair', 'Microwave and oven', 'Water purifier service']),
    ('carpentry', 'Carpenter', 'Doors, shelves and furniture', 449, '60-120 min', 'hammer',
     ['Door and lock repair', 'Shelf and curtain rod fitting', 'Furniture assembly', 'Wood polish touch-up']),
    ('painting', 'Painting', 'Touch-ups and full room painting', 999, 'Quote based', 'roller',
     ['Wall touch-ups', 'Single room painting', 'Waterproofing coat', 'Colour consultation']),
    ('pet-care', 'Pet Care', 'Sitting, walking and feeding', 299, '1-3 hours', 'paw',
     ['Dog walking', 'Pet sitting at home', 'Feeding visits', 'Grooming help']),
]

DEMO_WORKERS = [
    # name, phone, skills, area, rating, jobs
    ('Ramesh Kumar', '0000000001', 'plumbing', 'Whitefield', 4.8, 312),
    ('Suresh Naik', '0000000002', 'plumbing,carpentry', 'Koramangala', 4.6, 188),
    ('Imran Sheikh', '0000000003', 'electrical', 'Indiranagar', 4.9, 421),
    ('Prakash Gowda', '0000000004', 'electrical,appliance-repair', 'Marathahalli', 4.7, 256),
    ('Lakshmi Devi', '0000000005', 'house-cleaning', 'HSR Layout', 4.9, 530),
    ('Sunita Rao', '0000000006', 'house-cleaning,pet-care', 'Jayanagar', 4.7, 214),
    ('Anil Reddy', '0000000007', 'ac-repair,appliance-repair', 'Electronic City', 4.8, 367),
    ('Mohan Raj', '0000000008', 'carpentry,painting', 'Rajajinagar', 4.5, 143),
    ('Vikram Shetty', '0000000009', 'painting', 'Hebbal', 4.6, 98),
    ('Divya Nair', '0000000010', 'pet-care', 'BTM Layout', 4.9, 177),
]
DEMO_CUSTOMERS = [
    ('Ananya Rao', '0000000101', 'Whitefield'), ('Kiran Menon', '0000000102', 'Koramangala'),
    ('Meera Iyer', '0000000103', 'HSR Layout'), ('Rahul Patil', '0000000104', 'Marathahalli'),
    ('Divya Shetty', '0000000105', 'Indiranagar'), ('Arjun Nair', '0000000106', 'Jayanagar'),
]
OPEN_JOBS = [
    # customer idx, service, area, problem, hours-from-now
    (0, 'plumbing', 'Whitefield', 'Kitchen tap is leaking all day, needs washer change.', 20),
    (1, 'electrical', 'Koramangala', 'Two ceiling fans to install and one switchboard repair.', 26),
    (2, 'house-cleaning', 'HSR Layout', 'Deep clean for a 2BHK flat before guests arrive.', 30),
    (3, 'appliance-repair', 'Marathahalli', 'Washing machine not draining water.', 22),
    (4, 'painting', 'Indiranagar', 'Repaint one bedroom wall, colour already chosen.', 50),
    (5, 'pet-care', 'Jayanagar', 'Need someone to walk my dog every morning this week.', 18),
    (0, 'ac-repair', 'Whitefield', 'Split AC is not cooling, service and gas check.', 28),
    (1, 'carpentry', 'Koramangala', 'Bedroom door is stuck and the lock is loose.', 44),
]
SAMPLE_REVIEWS = [
    ('plumbing', 'Ananya R.', 5, 'Quick response and the leaking tap was fixed neatly. Price was explained first.'),
    ('plumbing', 'Karthik S.', 4, 'Good work on the bathroom pipe. Arrived a little late but called ahead.'),
    ('electrical', 'Kiran M.', 5, 'Careful fan installation and clear communication throughout.'),
    ('electrical', 'Sneha P.', 5, 'Fixed our tripping MCB the same day. Very professional.'),
    ('house-cleaning', 'Meera S.', 4, 'Thorough kitchen and bathroom clean. Good attention to detail.'),
    ('house-cleaning', 'Rohan D.', 5, 'The flat looked brand new. Team was polite and on time.'),
    ('ac-repair', 'Rahul P.', 5, 'AC servicing was explained step by step and the cooling improved a lot.'),
    ('appliance-repair', 'Neha K.', 5, 'Washing machine repaired in an hour. Honest about the spare part cost.'),
    ('carpentry', 'Vivek N.', 4, 'Neat finishing on the shelf work. Cleaned up after the job.'),
    ('painting', 'Pooja H.', 5, 'Walls look great and no paint on the floor. Highly recommended.'),
    ('pet-care', 'Divya N.', 5, 'Very kind with our dog and followed all the care instructions.'),
]
STATUS_FLOW = ['Requested', 'Accepted', 'On the way', 'In progress', 'Completed']
VISIT_FEE = 49


# ---------------------------------------------------------------- models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(15), unique=True, nullable=False, index=True)
    age = db.Column(db.Integer)
    qualification = db.Column(db.String(30))
    mode = db.Column(db.String(10), default='customer')  # customer = Get Work Done, worker = Find Work
    area = db.Column(db.String(60))
    street = db.Column(db.String(200))
    lat = db.Column(db.Float)
    lon = db.Column(db.Float)
    available = db.Column(db.Boolean, default=True)
    skills = db.Column(db.String(200), default='')
    is_demo = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=now_utc)


class Worker(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), unique=True)
    name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(15))
    skills = db.Column(db.String(200), default='')
    area = db.Column(db.String(60))
    rating = db.Column(db.Float, default=4.5)
    rating_count = db.Column(db.Integer, default=0)
    jobs_done = db.Column(db.Integer, default=0)
    is_demo = db.Column(db.Boolean, default=True)


class Booking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(16), unique=True, index=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    worker_id = db.Column(db.Integer, db.ForeignKey('worker.id'))
    service_slug = db.Column(db.String(60), nullable=False)
    area = db.Column(db.String(60), nullable=False)
    address = db.Column(db.String(250), nullable=False)
    problem = db.Column(db.Text)
    scheduled_at = db.Column(db.DateTime, nullable=False)
    price = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='Requested', index=True)
    paid = db.Column(db.Boolean, default=False)
    pay_method = db.Column(db.String(30))
    txn_id = db.Column(db.String(30))
    created_at = db.Column(db.DateTime, default=now_utc)
    accepted_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    customer = db.relationship('User', foreign_keys=[customer_id])
    worker = db.relationship('Worker', foreign_keys=[worker_id])


class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('booking.id'), unique=True, nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    tags = db.Column(db.String(200))
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=now_utc)


class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('booking.id'), nullable=False, index=True)
    sender = db.Column(db.String(10), nullable=False)  # customer | worker
    text = db.Column(db.String(500), nullable=False)
    created_at = db.Column(db.DateTime, default=now_utc)


class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    booking_id = db.Column(db.Integer)
    title = db.Column(db.String(150), nullable=False)
    body = db.Column(db.String(300), nullable=False)
    read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=now_utc)


class Decline(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.Integer, nullable=False)


class OtpRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    phone = db.Column(db.String(15), nullable=False, index=True)
    payload = db.Column(db.Text, nullable=False)
    code_hash = db.Column(db.String(64), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    attempts = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=now_utc)


# ---------------------------------------------------------------- helpers
SERVICE_MAP = {s[0]: s for s in SERVICES}


def err(message, status=400, **extra):
    return jsonify({'ok': False, 'message': message, **extra}), status


def me():
    uid = session.get('uid')
    u = db.session.get(User, uid) if uid else None
    # a wiped/re-seeded database must never hand an old cookie to a different person
    return u if (u and not u.is_demo and u.phone == session.get('ph')) else None


def login_required(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        u = me()
        if not u:
            return err('Please sign in first.', 401)
        return fn(u, *a, **kw)
    return wrapper


@app.before_request
def json_only_writes():
    # Simple CSRF defence: writes must be JSON (cross-site forms cannot send JSON).
    if request.method in ('POST', 'PATCH', 'PUT', 'DELETE') and request.path.startswith('/api/'):
        if not request.is_json and request.content_length:
            return err('JSON body required.', 415)


def km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def user_pos(u):
    if u.lat is not None and u.lon is not None:
        return u.lat, u.lon
    if u.area in AREAS:
        return AREAS[u.area]
    return AREAS['Indiranagar']


def nearest_area(lat, lon):
    return min(AREAS, key=lambda a: km(lat, lon, *AREAS[a]))


def notify(uid, title, body, booking_id=None):
    db.session.add(Notification(user_id=uid, title=title, body=body, booking_id=booking_id))


def user_json(u):
    return {'id': u.id, 'name': u.name, 'phone': u.phone, 'age': u.age, 'qualification': u.qualification,
            'mode': u.mode or 'customer', 'area': u.area, 'street': u.street, 'lat': u.lat, 'lon': u.lon,
            'available': bool(u.available), 'skills': [s for s in (u.skills or '').split(',') if s]}


def worker_json(w):
    if not w:
        return None
    return {'id': w.id, 'name': w.name, 'phone': w.phone, 'rating': round(w.rating or 0, 1),
            'rating_count': w.rating_count, 'jobs_done': w.jobs_done, 'area': w.area,
            'skills': [s for s in (w.skills or '').split(',') if s]}


def fmt_when(dt):
    d = to_ist(dt)
    return d.strftime('%a, %d %b'), d.strftime('%I:%M %p').lstrip('0')


def booking_json(b, viewer=None, detail=False):
    s = SERVICE_MAP.get(b.service_slug)
    day, hhmm = fmt_when(b.scheduled_at)
    out = {
        'id': b.id, 'code': b.code, 'service': s[1] if s else b.service_slug, 'slug': b.service_slug,
        'icon': s[5] if s else 'wrench', 'status': b.status, 'area': b.area, 'address': b.address,
        'problem': b.problem or '', 'day': day, 'time': hhmm, 'iso': b.scheduled_at.isoformat() + 'Z',
        'price': b.price, 'paid': b.paid, 'pay_method': b.pay_method, 'txn_id': b.txn_id,
        'worker': worker_json(b.worker), 'customer_name': b.customer.name if b.customer else '',
        'customer_id': b.customer_id, 'mine': bool(viewer and viewer.id == b.customer_id),
        'reviewed': Review.query.filter_by(booking_id=b.id).first() is not None,
    }
    if viewer:
        lat, lon = user_pos(viewer)
        blat, blon = AREAS.get(b.area, AREAS['Indiranagar'])
        out['distance_km'] = round(km(lat, lon, blat, blon), 1)
    if detail:
        r = Review.query.filter_by(booking_id=b.id).first()
        out['review'] = {'rating': r.rating, 'comment': r.comment, 'tags': r.tags} if r else None
        out['timeline'] = timeline(b)
        out['breakdown'] = {'service': b.price - VISIT_FEE, 'visit': VISIT_FEE, 'total': b.price}
    return out


def timeline(b):
    steps = []
    cur = STATUS_FLOW.index(b.status) if b.status in STATUS_FLOW else -1
    for i, name in enumerate(STATUS_FLOW):
        steps.append({'name': name, 'done': i <= cur and b.status != 'Cancelled', 'current': i == cur})
    return steps


def advance(b):
    """Demo workers react over time so one phone can show the whole journey."""
    changed = False
    now = now_utc()
    if b.status == 'Requested' and not b.worker_id and (now - b.created_at).total_seconds() > 12:
        cands = Worker.query.filter_by(is_demo=True).all()
        cands = [w for w in cands if b.service_slug in (w.skills or '').split(',')]
        if cands:
            lat, lon = AREAS.get(b.area, AREAS['Indiranagar'])
            w = min(cands, key=lambda x: km(lat, lon, *AREAS.get(x.area, AREAS['Indiranagar'])))
            b.worker_id, b.status, b.accepted_at = w.id, 'Accepted', now
            notify(b.customer_id, 'Booking accepted', f'{w.name} accepted your {SERVICE_MAP[b.service_slug][1]} request.', b.id)
            db.session.add(Message(booking_id=b.id, sender='worker',
                                   text=f'Hello! I am {w.name.split()[0]}. I will reach on time. Please keep the area accessible.'))
            changed = True
    if b.worker_id and b.worker and b.worker.is_demo and b.accepted_at:
        age = (now - b.accepted_at).total_seconds()
        if b.status == 'Accepted' and age > 25:
            b.status = 'On the way'
            notify(b.customer_id, 'Professional on the way', f'{b.worker.name} is heading to your location.', b.id)
            changed = True
        if b.status == 'On the way' and age > 55:
            b.status = 'In progress'
            notify(b.customer_id, 'Work started', f'{b.worker.name} started the work.', b.id)
            changed = True
    if changed:
        db.session.commit()
    return changed


def advance_all(u):
    for b in Booking.query.filter(Booking.customer_id == u.id, Booking.status.in_(['Requested', 'Accepted', 'On the way'])).all():
        advance(b)


def make_code():
    return 'F2W-' + secrets.token_hex(3).upper()


def quote(slug):
    return SERVICE_MAP[slug][3] + VISIT_FEE


def service_stats(slug):
    rows = [r[2] for r in SAMPLE_REVIEWS if r[0] == slug]
    rows += [r.rating for r in Review.query.join(Booking, Booking.id == Review.booking_id).filter(Booking.service_slug == slug)]
    return (round(sum(rows) / len(rows), 1) if rows else 4.7), len(rows)


def service_json(s):
    rating, count = service_stats(s[0])
    return {'slug': s[0], 'name': s[1], 'tagline': s[2], 'price': s[3], 'duration': s[4], 'icon': s[5],
            'includes': s[6], 'rating': rating, 'reviews': count}


def slots_for(day):
    now = datetime.now(TZ)
    out = []
    for h in (8, 10, 12, 14, 16, 18, 20):
        dt = datetime.combine(day, time(h), TZ)
        if dt >= now + timedelta(hours=2):
            out.append({'value': f'{h:02d}:00', 'label': dt.strftime('%I:%M %p').lstrip('0')})
    return out


# ---------------------------------------------------------------- pages
@app.get('/')
def index():
    return render_template('index.html')


@app.get('/health')
def health():
    return jsonify({'status': 'ok'})


@app.get('/manifest.webmanifest')
def manifest():
    return jsonify({'name': 'Free2Work', 'short_name': 'Free2Work', 'start_url': '/', 'display': 'standalone',
                    'background_color': '#0B1B3A', 'theme_color': '#0B1B3A',
                    'icons': [{'src': '/static/icon.svg', 'sizes': 'any', 'type': 'image/svg+xml', 'purpose': 'any'}]})


@app.get('/api/bootstrap')
def bootstrap():
    u = me()
    return jsonify({'ok': True, 'user': user_json(u) if u else None,
                    'services': [service_json(s) for s in SERVICES],
                    'areas': [{'name': k, 'lat': v[0], 'lon': v[1]} for k, v in AREAS.items()],
                    'qualifications': QUALIFICATIONS, 'visit_fee': VISIT_FEE,
                    'otp_mode': otp_module.provider_name()})


# ---------------------------------------------------------------- auth
@app.post('/api/auth/send-otp')
def send_otp():
    d = request.get_json(silent=True) or {}
    name = (d.get('name') or '').strip()
    phone = re.sub(r'\D', '', d.get('phone') or '')
    if len(phone) == 12 and phone.startswith('91'):
        phone = phone[2:]
    qual = (d.get('qualification') or '').strip()
    mode = (d.get('mode') or 'customer').strip()
    try:
        age = int(d.get('age'))
    except (TypeError, ValueError):
        age = 0
    if len(name) < 2 or len(name) > 80:
        return err('Please enter your full name.')
    if age < 14 or age > 90:
        return err('Please enter a valid age (14 to 90).')
    if qual not in QUALIFICATIONS:
        return err('Please choose your qualification.')
    if mode not in ('customer', 'worker'):
        return err('Please choose Find Work or Get Work Done.')
    if not re.fullmatch(r'[6-9]\d{9}', phone):
        return err('Enter a valid 10-digit Indian mobile number.')
    recent = OtpRecord.query.filter(OtpRecord.phone == phone, OtpRecord.created_at > now_utc() - timedelta(minutes=10)).count()
    if recent >= 8:
        return err('Too many OTP requests. Please wait a few minutes.', 429)
    code = otp_module.generate_code()
    OtpRecord.query.filter_by(phone=phone).delete()
    import json as _json
    db.session.add(OtpRecord(phone=phone, payload=_json.dumps({'name': name, 'age': age, 'qualification': qual, 'mode': mode}),
                             code_hash=hash_code(phone, code), expires_at=now_utc() + timedelta(minutes=5)))
    db.session.commit()
    try:
        info = otp_module.deliver(phone, code)
    except Exception as exc:
        log.warning('OTP delivery failed: %s', exc)
        return err('Could not send the OTP right now. Please try again.', 503)
    return jsonify({'ok': True, 'phone': phone, **info})


def hash_code(phone, code):
    return hashlib.sha256((phone + ':' + code + ':' + app.config['SECRET_KEY']).encode()).hexdigest()


@app.post('/api/auth/verify-otp')
def verify_otp():
    import json as _json
    d = request.get_json(silent=True) or {}
    phone = re.sub(r'\D', '', d.get('phone') or '')[-10:]
    code = (d.get('otp') or '').strip()
    rec = OtpRecord.query.filter_by(phone=phone).order_by(OtpRecord.created_at.desc()).first()
    if not rec:
        return err('No active OTP. Please request a new one.')
    if now_utc() > rec.expires_at:
        return err('This OTP has expired. Please request a new one.', 410)
    if rec.attempts >= 5:
        return err('Too many wrong attempts. Please request a new OTP.', 429)
    rec.attempts += 1
    if not hmac.compare_digest(rec.code_hash, hash_code(phone, code)):
        db.session.commit()
        return err('Wrong OTP. Please try again.')
    p = _json.loads(rec.payload)
    db.session.delete(rec)
    u = User.query.filter_by(phone=phone).first()
    if not u:
        u = User(phone=phone, name=p['name'])
        db.session.add(u)
    u.name, u.age, u.qualification, u.mode = p['name'], p['age'], p['qualification'], p['mode']
    db.session.flush()
    if not Notification.query.filter_by(user_id=u.id).first():
        notify(u.id, 'Welcome to Free2Work', 'Your account is ready. Book a service or find work near you.')
    db.session.commit()
    session.clear()
    session['uid'] = u.id
    session['ph'] = u.phone
    session.permanent = True
    return jsonify({'ok': True, 'user': user_json(u)})


@app.post('/api/auth/logout')
def logout():
    session.clear()
    return jsonify({'ok': True})


@app.get('/api/me')
@login_required
def get_me(u):
    return jsonify({'ok': True, 'user': user_json(u)})


@app.patch('/api/me')
@login_required
def update_me(u):
    d = request.get_json(silent=True) or {}
    if 'name' in d:
        n = (d['name'] or '').strip()
        if len(n) < 2:
            return err('Please enter your name.')
        u.name = n[:80]
    if 'age' in d:
        try:
            a = int(d['age'])
        except (TypeError, ValueError):
            return err('Enter a valid age.')
        if a < 14 or a > 90:
            return err('Enter a valid age (14 to 90).')
        u.age = a
    if 'qualification' in d and d['qualification'] in QUALIFICATIONS:
        u.qualification = d['qualification']
    if d.get('mode') in ('customer', 'worker'):
        u.mode = d['mode']
    if 'available' in d:
        u.available = bool(d['available'])
    if 'street' in d:
        u.street = (d['street'] or '').strip()[:200]
    if 'skills' in d and isinstance(d['skills'], list):
        u.skills = ','.join(s for s in d['skills'] if s in SERVICE_MAP)
        w = Worker.query.filter_by(user_id=u.id).first()
        if w:
            w.skills = u.skills
    if d.get('area') in AREAS:
        u.area = d['area']
        if d.get('lat') is None:
            u.lat, u.lon = None, None
    if d.get('lat') is not None and d.get('lon') is not None:
        try:
            u.lat, u.lon = float(d['lat']), float(d['lon'])
            u.area = nearest_area(u.lat, u.lon)
        except (TypeError, ValueError):
            return err('Invalid location.')
    db.session.commit()
    return jsonify({'ok': True, 'user': user_json(u)})


@app.post('/api/geo/nearest')
def geo_nearest():
    d = request.get_json(silent=True) or {}
    try:
        lat, lon = float(d.get('lat')), float(d.get('lon'))
    except (TypeError, ValueError):
        return err('Invalid location.')
    a = nearest_area(lat, lon)
    dist = km(lat, lon, *AREAS[a])
    return jsonify({'ok': True, 'area': a, 'distance_km': round(dist, 1), 'in_coverage': dist < 25})


# ---------------------------------------------------------------- services
@app.get('/api/services/<slug>')
def service_detail(slug):
    s = SERVICE_MAP.get(slug)
    if not s:
        return err('Service not found.', 404)
    reviews = [{'name': r[1], 'rating': r[2], 'comment': r[3]} for r in SAMPLE_REVIEWS if r[0] == slug]
    real = Review.query.join(Booking, Booking.id == Review.booking_id).filter(Booking.service_slug == slug) \
        .order_by(Review.created_at.desc()).limit(5).all()
    for r in real:
        b = db.session.get(Booking, r.booking_id)
        reviews.insert(0, {'name': (b.customer.name.split()[0] + ' ' + b.customer.name.split()[-1][:1] + '.') if b.customer.name.split() else 'User',
                           'rating': r.rating, 'comment': r.comment or 'Great service.'})
    pros = [worker_json(w) for w in Worker.query.filter_by(is_demo=True).all() if slug in (w.skills or '').split(',')]
    pros.sort(key=lambda p: -p['rating'])
    return jsonify({'ok': True, 'service': service_json(s), 'reviews': reviews[:6], 'pros': pros[:4], 'visit_fee': VISIT_FEE})


@app.get('/api/slots')
def api_slots():
    try:
        day = date.fromisoformat(request.args.get('date', ''))
    except ValueError:
        return err('Choose a valid date.')
    return jsonify({'ok': True, 'slots': slots_for(day)})


# ---------------------------------------------------------------- bookings
def create_booking(u, slug, area, address, day_iso, hhmm, problem):
    if slug not in SERVICE_MAP:
        return None, 'Please choose a valid service.'
    if area not in AREAS:
        return None, 'Please choose your area.'
    address = (address or '').strip()
    if len(address) < 5:
        return None, 'Enter your house or street address (at least 5 characters).'
    try:
        day = date.fromisoformat(day_iso)
        when = from_ist(day, hhmm)
    except Exception:
        return None, 'Choose a valid date and time.'
    if when < now_utc() + timedelta(hours=2):
        return None, 'Pick a time at least 2 hours from now.'
    b = Booking(code=make_code(), customer_id=u.id, service_slug=slug, area=area, address=address[:250],
                problem=(problem or '').strip()[:500], scheduled_at=when, price=quote(slug))
    db.session.add(b)
    db.session.flush()
    notify(u.id, 'Booking placed', f'{SERVICE_MAP[slug][1]} request {b.code} sent to nearby professionals.', b.id)
    db.session.commit()
    return b, None


@app.post('/api/bookings')
@login_required
def post_booking(u):
    d = request.get_json(silent=True) or {}
    b, e = create_booking(u, d.get('slug'), d.get('area'), d.get('address'), d.get('date'), d.get('time'), d.get('problem'))
    if e:
        return err(e)
    return jsonify({'ok': True, 'booking': booking_json(b, u, True)}), 201


@app.get('/api/bookings')
@login_required
def list_bookings(u):
    advance_all(u)
    rows = Booking.query.filter_by(customer_id=u.id).order_by(Booking.created_at.desc()).all()
    return jsonify({'ok': True, 'bookings': [booking_json(b, u) for b in rows]})


def get_booking(u, bid):
    b = db.session.get(Booking, bid)
    if not b:
        return None
    wid = Worker.query.filter_by(user_id=u.id).first()
    if b.customer_id == u.id or (wid and b.worker_id == wid.id) or (b.status == 'Requested' and not b.worker_id):
        return b
    return None


@app.get('/api/bookings/<int:bid>')
@login_required
def one_booking(u, bid):
    b = get_booking(u, bid)
    if not b:
        return err('Booking not found.', 404)
    if b.customer_id == u.id:
        advance(b)
    return jsonify({'ok': True, 'booking': booking_json(b, u, True)})


@app.post('/api/bookings/<int:bid>/cancel')
@login_required
def cancel_booking(u, bid):
    b = db.session.get(Booking, bid)
    if not b or b.customer_id != u.id:
        return err('Booking not found.', 404)
    if b.status not in ('Requested', 'Accepted'):
        return err('This booking can no longer be cancelled.')
    b.status = 'Cancelled'
    notify(u.id, 'Booking cancelled', f'Booking {b.code} was cancelled.', b.id)
    if b.worker and b.worker.user_id:
        notify(b.worker.user_id, 'Job cancelled', f'{b.customer.name} cancelled {b.code}.', b.id)
    db.session.commit()
    return jsonify({'ok': True, 'booking': booking_json(b, u, True)})


@app.post('/api/bookings/<int:bid>/confirm-done')
@login_required
def confirm_done(u, bid):
    b = db.session.get(Booking, bid)
    if not b or b.customer_id != u.id:
        return err('Booking not found.', 404)
    if b.status not in ('In progress', 'On the way', 'Accepted'):
        return err('This job is not in progress.')
    finish(b)
    return jsonify({'ok': True, 'booking': booking_json(b, u, True)})


def finish(b):
    b.status, b.completed_at = 'Completed', now_utc()
    if b.worker:
        b.worker.jobs_done = (b.worker.jobs_done or 0) + 1
        if b.worker.user_id:
            notify(b.worker.user_id, 'Job completed', f'{b.code} marked completed. Earnings added: Rs {b.price - VISIT_FEE}.', b.id)
    notify(b.customer_id, 'Work completed', f'Please pay and rate your {SERVICE_MAP[b.service_slug][1]} service.', b.id)
    db.session.commit()


@app.post('/api/bookings/<int:bid>/pay')
@login_required
def pay_booking(u, bid):
    d = request.get_json(silent=True) or {}
    b = db.session.get(Booking, bid)
    if not b or b.customer_id != u.id:
        return err('Booking not found.', 404)
    if b.paid:
        return err('Already paid.')
    if b.status != 'Completed':
        return err('You can pay after the work is completed.')
    method = d.get('method')
    if method not in ('UPI', 'Card', 'Cash'):
        return err('Choose a payment method.')
    if method == 'UPI' and d.get('upi_app') == 'id':
        if not re.fullmatch(r'[\w.\-]{2,}@[a-zA-Z]{2,}', (d.get('upi_id') or '').strip()):
            return err('Enter a valid UPI ID like name@bank.')
    b.paid, b.pay_method, b.txn_id = True, method, 'DEMO' + secrets.token_hex(5).upper()
    notify(u.id, 'Payment successful (demo)', f'Rs {b.price} paid for {b.code} via {method}. Demo payment, no money moved.', b.id)
    db.session.commit()
    return jsonify({'ok': True, 'booking': booking_json(b, u, True)})


@app.post('/api/bookings/<int:bid>/review')
@login_required
def review_booking(u, bid):
    d = request.get_json(silent=True) or {}
    b = db.session.get(Booking, bid)
    if not b or b.customer_id != u.id:
        return err('Booking not found.', 404)
    if b.status != 'Completed':
        return err('You can rate after the work is completed.')
    if Review.query.filter_by(booking_id=b.id).first():
        return err('You already rated this booking.')
    try:
        rating = int(d.get('rating'))
    except (TypeError, ValueError):
        rating = 0
    if rating < 1 or rating > 5:
        return err('Choose 1 to 5 stars.')
    tags = ','.join([t for t in (d.get('tags') or []) if isinstance(t, str)][:4])
    db.session.add(Review(booking_id=b.id, rating=rating, tags=tags, comment=(d.get('comment') or '').strip()[:400]))
    if b.worker:
        w = b.worker
        n = w.rating_count or 0
        w.rating = ((w.rating or 4.5) * (n + 5) + rating) / (n + 6)  # smoothed average
        w.rating_count = n + 1
        if w.user_id:
            notify(w.user_id, 'New rating', f'{b.customer.name} rated you {rating} stars.', b.id)
    db.session.commit()
    return jsonify({'ok': True, 'booking': booking_json(b, u, True)})


# ---------------------------------------------------------------- chat per booking
AUTO_REPLIES = [
    (r'(when|time|eta|reach|late)', 'I am on schedule and will reach at the booked time. I will call before arriving.'),
    (r'(price|cost|charge|rate|amount)', 'The price shown in the app is the visit plus basic work. Spare parts, if any, are extra and I will tell you first.'),
    (r'(address|location|where|landmark)', 'Please share a landmark near your address. I will find it on the map.'),
    (r'(thank|thanks)', 'You are welcome! Happy to help.'),
    (r'(ok|okay|fine|sure|yes)', 'Great, noted.'),
]


@app.get('/api/bookings/<int:bid>/messages')
@login_required
def get_messages(u, bid):
    b = get_booking(u, bid)
    if not b or not b.worker_id:
        return err('Chat opens after a professional accepts the booking.', 404)
    ms = Message.query.filter_by(booking_id=bid).order_by(Message.id).all()
    return jsonify({'ok': True, 'messages': [{'id': m.id, 'sender': m.sender, 'text': m.text, 'ts': to_ist(m.created_at).strftime('%I:%M %p').lstrip('0')} for m in ms],
                    'peer': worker_json(b.worker) if b.customer_id == u.id else {'name': b.customer.name}})


@app.post('/api/bookings/<int:bid>/messages')
@login_required
def post_message(u, bid):
    d = request.get_json(silent=True) or {}
    text = (d.get('text') or '').strip()[:500]
    b = get_booking(u, bid)
    if not b or not b.worker_id:
        return err('Chat opens after a professional accepts the booking.', 404)
    if not text:
        return err('Type a message.')
    as_customer = b.customer_id == u.id
    db.session.add(Message(booking_id=bid, sender='customer' if as_customer else 'worker', text=text))
    if as_customer and b.worker and b.worker.is_demo:
        reply = 'Noted. I will keep you updated.'
        for pat, r in AUTO_REPLIES:
            if re.search(pat, text.lower()):
                reply = r
                break
        db.session.add(Message(booking_id=bid, sender='worker', text=reply, created_at=now_utc() + timedelta(seconds=1)))
    elif not as_customer:
        notify(b.customer_id, 'New message', f'{b.worker.name}: {text[:80]}', b.id)
    elif b.worker and b.worker.user_id:
        notify(b.worker.user_id, 'New message', f'{b.customer.name}: {text[:80]}', b.id)
    db.session.commit()
    return get_messages(bid=bid)


# ---------------------------------------------------------------- worker side
def my_worker(u, create=True):
    w = Worker.query.filter_by(user_id=u.id).first()
    if not w and create:
        w = Worker(user_id=u.id, name=u.name, phone=u.phone, skills=u.skills or '', area=u.area, rating=4.5, rating_count=0,
                   jobs_done=0, is_demo=False)
        db.session.add(w)
        db.session.flush()
    return w


def open_jobs_for(u):
    declined = {x.booking_id for x in Decline.query.filter_by(user_id=u.id)}
    skills = [s for s in (u.skills or '').split(',') if s]
    rows = Booking.query.filter(Booking.status == 'Requested', Booking.worker_id.is_(None), Booking.customer_id != u.id,
                                Booking.scheduled_at > now_utc()).all()
    out = []
    for b in rows:
        if b.id in declined:
            continue
        j = booking_json(b, u)
        j['pay'] = b.price - VISIT_FEE
        j['skill_match'] = (not skills) or b.service_slug in skills
        out.append(j)
    out.sort(key=lambda j: (not j['skill_match'], j['distance_km']))
    return out


@app.get('/api/worker/dashboard')
@login_required
def worker_dashboard(u):
    w = my_worker(u)
    mine = Booking.query.filter_by(worker_id=w.id).all()
    done = [b for b in mine if b.status == 'Completed']
    today = to_ist(now_utc()).date()
    earn = lambda rows: sum(b.price - VISIT_FEE for b in rows)
    today_rows = [b for b in done if b.completed_at and to_ist(b.completed_at).date() == today]
    week_rows = [b for b in done if b.completed_at and (now_utc() - b.completed_at).days < 7]
    base_total = 18450 if not done else 0  # demo starting history so the screen is not empty
    active = [booking_json(b, u) for b in mine if b.status in ('Accepted', 'On the way', 'In progress')]
    db.session.commit()
    return jsonify({'ok': True, 'worker': worker_json(w), 'available': bool(u.available),
                    'stats': {'today': earn(today_rows), 'week': earn(week_rows) + 3240, 'total': earn(done) + base_total,
                              'jobs': len(done) + 36, 'rating': round(w.rating or 4.5, 1)},
                    'active': active, 'requests': open_jobs_for(u)[:5]})


@app.get('/api/worker/requests')
@login_required
def worker_requests(u):
    return jsonify({'ok': True, 'requests': open_jobs_for(u), 'available': bool(u.available)})


@app.get('/api/worker/jobs')
@login_required
def worker_jobs(u):
    w = my_worker(u)
    db.session.commit()
    rows = Booking.query.filter_by(worker_id=w.id).order_by(Booking.created_at.desc()).all()
    return jsonify({'ok': True, 'jobs': [booking_json(b, u) for b in rows]})


@app.post('/api/worker/jobs/<int:bid>/<action>')
@login_required
def worker_action(u, bid, action):
    b = db.session.get(Booking, bid)
    if not b:
        return err('Job not found.', 404)
    w = my_worker(u)
    if action == 'accept':
        if b.worker_id or b.status != 'Requested':
            return err('Sorry, this job was already taken.', 409)
        if b.customer_id == u.id:
            return err('You cannot accept your own booking.')
        if not u.available:
            return err('Turn on availability first.')
        b.worker_id, b.status, b.accepted_at = w.id, 'Accepted', now_utc()
        notify(b.customer_id, 'Booking accepted', f'{u.name} accepted your {SERVICE_MAP[b.service_slug][1]} request.', b.id)
        notify(u.id, 'Job accepted', f'You accepted {b.code} at {b.area}. Open it to chat with the customer.', b.id)
        db.session.add(Message(booking_id=b.id, sender='worker', text=f'Hello! I am {u.name.split()[0]}. I accepted your request.'))
    elif action == 'decline':
        if b.worker_id:
            return err('This job is already assigned.')
        db.session.add(Decline(booking_id=b.id, user_id=u.id))
    elif b.worker_id != w.id:
        return err('This is not your job.', 403)
    elif action == 'start':
        if b.status not in ('Accepted', 'On the way'):
            return err('Cannot start this job now.')
        b.status = 'In progress'
        notify(b.customer_id, 'Work started', f'{u.name} started the work.', b.id)
    elif action == 'onway':
        if b.status != 'Accepted':
            return err('Cannot update this job now.')
        b.status = 'On the way'
        notify(b.customer_id, 'Professional on the way', f'{u.name} is heading to your location.', b.id)
    elif action == 'complete':
        if b.status not in ('In progress', 'On the way', 'Accepted'):
            return err('Cannot complete this job now.')
        db.session.commit()
        finish(b)
        return jsonify({'ok': True, 'booking': booking_json(b, u, True)})
    else:
        return err('Unknown action.', 404)
    db.session.commit()
    return jsonify({'ok': True, 'booking': booking_json(b, u, True)})


@app.get('/api/worker/earnings')
@login_required
def worker_earnings(u):
    w = my_worker(u)
    rows = Booking.query.filter_by(worker_id=w.id, status='Completed').order_by(Booking.completed_at.desc()).all()
    hist = [{'code': b.code, 'service': SERVICE_MAP[b.service_slug][1], 'amount': b.price - VISIT_FEE,
             'date': to_ist(b.completed_at).strftime('%d %b')} for b in rows]
    today = to_ist(now_utc()).date()
    demo_week = [820, 1260, 540, 980, 1450, 720]  # earlier days of the week (demo)
    days = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        real = sum(h for h, b in [(b.price - VISIT_FEE, b) for b in rows] if b.completed_at and to_ist(b.completed_at).date() == d)
        days.append({'label': d.strftime('%a'), 'amount': real + (demo_week[6 - i - 1] if i > 0 else 0)})
    db.session.commit()
    return jsonify({'ok': True, 'history': hist, 'days': days, 'total': sum(h['amount'] for h in hist) + 18450})


# ---------------------------------------------------------------- notifications
@app.get('/api/notifications')
@login_required
def notifications(u):
    advance_all(u)
    rows = Notification.query.filter_by(user_id=u.id).order_by(Notification.id.desc()).limit(40).all()
    return jsonify({'ok': True, 'unread': sum(1 for n in rows if not n.read),
                    'items': [{'id': n.id, 'title': n.title, 'body': n.body, 'read': n.read, 'booking_id': n.booking_id,
                               'when': to_ist(n.created_at).strftime('%d %b, %I:%M %p').lstrip('0')} for n in rows]})


@app.post('/api/notifications/read')
@login_required
def notifications_read(u):
    Notification.query.filter_by(user_id=u.id, read=False).update({'read': True})
    db.session.commit()
    return jsonify({'ok': True})


@app.get('/api/badge')
@login_required
def badge(u):
    advance_all(u)
    return jsonify({'ok': True, 'unread': Notification.query.filter_by(user_id=u.id, read=False).count()})


# ---------------------------------------------------------------- assistant
@app.post('/api/assistant')
@login_required
def assistant_message(u):
    d = request.get_json(silent=True) or {}
    msg = (d.get('message') or '').strip()
    if not msg:
        return err('Type a message.')
    ctx = assistant.Context(u, db, sys.modules[__name__])
    return jsonify({'ok': True, **assistant.reply(ctx, msg, (d.get('language') or 'en'))})


@app.post('/api/assistant/action')
@login_required
def assistant_action(u):
    d = request.get_json(silent=True) or {}
    ctx = assistant.Context(u, db, sys.modules[__name__])
    return jsonify({'ok': True, **assistant.perform(ctx, d)})


import sys  # noqa: E402  (used by the assistant bridge)


# ---------------------------------------------------------------- seed data
def seed():
    if User.query.count() == 0 or Worker.query.filter_by(is_demo=True).count() == 0:
        for name, phone, skills, area, rating, jobs in DEMO_WORKERS:
            db.session.add(Worker(name=name, phone=phone, skills=skills, area=area, rating=rating, rating_count=jobs, jobs_done=jobs, is_demo=True))
        custs = []
        for name, phone, area in DEMO_CUSTOMERS:
            c = User(name=name, phone=phone, area=area, mode='customer', is_demo=True, age=28, qualification='Graduate')
            db.session.add(c)
            custs.append(c)
        db.session.flush()
        for ci, slug, area, problem, hrs in OPEN_JOBS:
            when = now_utc() + timedelta(hours=hrs)
            db.session.add(Booking(code=make_code(), customer_id=custs[ci].id, service_slug=slug, area=area,
                                   address=f'{12 + ci * 7}, 3rd Cross, {area}', problem=problem, scheduled_at=when,
                                   price=quote(slug), created_at=now_utc() - timedelta(minutes=5 + ci * 9)))
        db.session.commit()


def refill_open_jobs():
    """Keep the demo job board alive: re-create demo requests whose time has passed."""
    custs = User.query.filter_by(is_demo=True).order_by(User.id).all()
    if not custs:
        return
    open_now = Booking.query.filter(Booking.status == 'Requested', Booking.worker_id.is_(None), Booking.scheduled_at > now_utc(),
                                    Booking.customer_id.in_([c.id for c in custs])).count()
    if open_now >= 5:
        return
    for ci, slug, area, problem, hrs in OPEN_JOBS:
        if open_now >= 7:
            break
        db.session.add(Booking(code=make_code(), customer_id=custs[ci % len(custs)].id, service_slug=slug, area=area,
                               address=f'{20 + ci * 5}, 5th Main, {area}', problem=problem,
                               scheduled_at=now_utc() + timedelta(hours=hrs + 2), price=quote(slug)))
        open_now += 1
    db.session.commit()


@app.before_request
def keep_board_alive():
    if request.path.startswith('/api/worker') or request.path == '/api/assistant':
        refill_open_jobs()


with app.app_context():
    db.create_all()
    seed()

if __name__ == '__main__':
    app.run(host=os.getenv('HOST', '127.0.0.1'), port=int(os.getenv('PORT', '5000')), debug=False)
