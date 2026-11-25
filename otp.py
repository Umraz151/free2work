"""OTP module. Isolated on purpose so a real SMS provider can replace the demo one.

Demo provider (default): no SMS is sent, the code is returned to the app and shown in a
"Demo SMS" box. This is free and works offline.

To switch to real SMS later:
  * Firebase phone auth: verify on the phone with the Firebase SDK, send the Firebase ID token to
    the server, check it there, then create the session (replace deliver() and the verify step).
  * Or set OTP_PROVIDER=webhook and SMS_WEBHOOK_URL to any SMS gateway that accepts JSON.
"""
import os, secrets


def provider_name():
    return os.getenv('OTP_PROVIDER', 'demo')


def generate_code():
    return f'{secrets.randbelow(1000000):06d}'


def deliver(phone, code):
    """Send the code. Returns extra fields for the app (e.g. the demo code)."""
    p = provider_name()
    if p == 'demo':
        return {'demo': True, 'demo_otp': code, 'message': 'Demo mode: no SMS is sent. Your code is shown below.'}
    if p == 'webhook':
        import json, urllib.request
        url = os.getenv('SMS_WEBHOOK_URL')
        if not url:
            raise RuntimeError('SMS_WEBHOOK_URL is not set')
        req = urllib.request.Request(url, data=json.dumps({'phone': phone, 'message': f'Your Free2Work OTP is {code}. Valid for 5 minutes.'}).encode(),
                                     headers={'Content-Type': 'application/json'})
        urllib.request.urlopen(req, timeout=10).read()
        return {'demo': False, 'message': 'OTP sent to your mobile number.'}
    raise RuntimeError('Unknown OTP provider')
