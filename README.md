# Free2Work (web version)
Runs in any browser, including iPhone Safari. Free hosting on Render.

## Deploy (free, about 5 minutes)
1. Create a free GitHub account, make a new repository, upload everything in this folder.
2. Create a free account at render.com (sign in with GitHub).
3. New + > Blueprint > pick the repository > Apply. Render reads render.yaml.
4. After the build, open the https://free2work-xxxx.onrender.com link.
5. iPhone: open the link in Safari > Share > Add to Home Screen.
Notes: the free tier sleeps after 15 minutes idle (first open takes about 30 seconds) and all demo data (accounts, bookings) is wiped whenever it sleeps or redeploys, so he registers again.
Run locally: pip install -r requirements.txt && python app.py (opens on port 5000).
OTP and payments are demo only. To add real SMS later, edit otp.py.
