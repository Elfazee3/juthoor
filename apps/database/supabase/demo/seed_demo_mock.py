"""Seed the LOCAL Supabase stack with demo data for the Juthoor admin interface.

usage (from the repo root, with `npx supabase start` already running):
    python -I apps/database/supabase/demo/seed_demo_mock.py

Creates the demo accounts listed in seed_demo_mock.sql, uploads clearly-marked
MOCK identity documents to the private `verification-docs` bucket, loads the
families + pending verifications, then runs the real matching engine so the
admin review queue fills itself. Safe to re-run (it resets its own data).
Refuses to run against anything that is not localhost.
"""
import io
import os
import subprocess
import sys

import requests
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.normpath(os.path.join(HERE, "..", ".."))
SEED_SQL = os.path.join(HERE, "seed_demo_mock.sql")
VILLAGES_SQL = os.path.join(DB_DIR, "supabase", "seed_villages.sql")
DB_CONTAINER = "supabase_db_nextbase-oss-starter"
PASSWORD = "Juthoor-Demo-2026!"  # local demo accounts only — documented in seed_demo_mock.sql
BUCKET = "verification-docs"

USERS = [
    "admin@juthoor.local",
    "rania.khatib@juthoor.local", "omar.khatib@juthoor.local",
    "sami.ajrami@juthoor.local", "lina.ajrami@juthoor.local",
    "yousef.hajj@juthoor.local", "maha.hajj@juthoor.local",
    "khalil.masri@juthoor.local", "nadia.masri@juthoor.local",
    "huda.masri@juthoor.local", "karim.haddad@juthoor.local",
]

# (email, file name, document title, holder name)
DOCS = [
    ("rania.khatib@juthoor.local", "id-passport.png", "PASSPORT", "RANIA KHALIL AL-KHATIB"),
    ("rania.khatib@juthoor.local", "family-evidence.png", "BIRTH CERTIFICATE (FATHER)", "KHALIL AHMAD AL-KHATIB - SAFAD 1940"),
    ("lina.ajrami@juthoor.local", "id-refugee-card.png", "REFUGEE REGISTRATION CARD", "LINA MOHAMMAD AJRAMI"),
    ("lina.ajrami@juthoor.local", "family-evidence.png", "FAMILY REGISTRATION RECORD", "HASSAN IBRAHIM AJRAMI - AL-MAJDAL"),
    ("huda.masri@juthoor.local", "id-national.png", "NATIONAL ID CARD", "HUDA MUNIB AL-MASRI"),
    ("karim.haddad@juthoor.local", "id-passport.png", "PASSPORT", "KARIM ELIAS HADDAD"),
]


def sh(args, cwd=None, stdin=None):
    r = subprocess.run(args, cwd=cwd, input=stdin, capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        raise SystemExit(f"command failed: {' '.join(args)}\n{r.stdout}\n{r.stderr}")
    return r.stdout


def local_env():
    out = sh(["npx", "supabase", "status", "-o", "env"], cwd=DB_DIR) if os.name != "nt" else \
        sh(["cmd", "/c", "npx", "supabase", "status", "-o", "env"], cwd=DB_DIR)
    env = {}
    for line in out.splitlines():
        if "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"')
    api = env.get("API_URL", "")
    if not api.startswith(("http://127.0.0.1", "http://localhost")):
        raise SystemExit(f"refusing to seed a non-local stack: {api!r}")
    return api, env["SERVICE_ROLE_KEY"]


def psql(sql_text):
    return sh(["docker", "exec", "-i", DB_CONTAINER, "psql", "-U", "postgres", "-d", "postgres",
               "-v", "ON_ERROR_STOP=1", "-q", "-t", "-A"], stdin=sql_text)


def mock_document(title, holder):
    img = Image.new("RGB", (900, 560), (246, 241, 230))
    d = ImageDraw.Draw(img)
    try:
        big = ImageFont.truetype("arialbd.ttf", 40)
        mid = ImageFont.truetype("arial.ttf", 26)
        small = ImageFont.truetype("arial.ttf", 20)
    except OSError:
        big = mid = small = ImageFont.load_default()
    d.rectangle([12, 12, 888, 548], outline=(26, 77, 46), width=6)
    d.rectangle([12, 12, 888, 90], fill=(26, 77, 46))
    d.text((36, 30), "JUTHOOR DEMO - " + title, fill="white", font=mid)
    d.rectangle([40, 130, 250, 380], fill=(214, 206, 190), outline=(150, 140, 120), width=2)
    d.text((95, 240), "PHOTO", fill=(120, 110, 95), font=mid)
    d.text((290, 140), "Holder:", fill=(90, 90, 90), font=small)
    d.text((290, 170), holder, fill=(20, 20, 20), font=mid)
    d.text((290, 240), "No.: 0000-DEMO-0000", fill=(20, 20, 20), font=mid)
    d.text((290, 290), "Issued: 01/01/2020   Expires: 01/01/2030", fill=(20, 20, 20), font=small)
    warning = "MOCK DOCUMENT - NOT VALID - DEMO ONLY"
    size = 40
    while size > 16 and hasattr(big, "path") and d.textlength(warning, font=big) > 820:
        size -= 2
        big = ImageFont.truetype(big.path, size)
    d.text((40, 420), warning, fill=(170, 30, 30), font=big)
    for x in range(-560, 900, 180):  # diagonal watermark stripes
        d.line([(x, 560), (x + 560, 0)], fill=(230, 200, 200), width=2)
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()


def main():
    api, key = local_env()
    h = {"apikey": key, "Authorization": f"Bearer {key}"}

    places = int(psql("select count(*) from public.places;").strip() or 0)
    if places < 100:
        with open(VILLAGES_SQL, encoding="utf-8") as f:
            psql(f.read())
        print("seeded villages")

    for email in USERS:
        r = requests.post(f"{api}/auth/v1/admin/users", headers=h,
                          json={"email": email, "password": PASSWORD, "email_confirm": True})
        if r.status_code not in (200, 201, 422):
            raise SystemExit(f"create {email}: {r.status_code} {r.text}")
    users = requests.get(f"{api}/auth/v1/admin/users?per_page=500", headers=h).json()["users"]
    ids = {u["email"]: u["id"] for u in users}
    missing = [e for e in USERS if e not in ids]
    if missing:
        raise SystemExit(f"users missing after create: {missing}")
    print(f"users ready: {len(USERS)}")

    for email, name, title, holder in DOCS:
        path = f"{ids[email]}/{name}"
        r = requests.post(f"{api}/storage/v1/object/{BUCKET}/{path}",
                          headers={**h, "Content-Type": "image/png", "x-upsert": "true"},
                          data=mock_document(title, holder))
        if r.status_code not in (200, 201):
            raise SystemExit(f"upload {path}: {r.status_code} {r.text}")
    print(f"mock documents uploaded: {len(DOCS)}")

    with open(SEED_SQL, encoding="utf-8") as f:
        psql(f.read())
    print("families + verifications loaded")

    psql("select public.run_matching_batch(true);")
    print(psql("""
      select 'trees=' || (select count(*) from public.trees t join auth.users u on u.id = t.owner_id where u.email like '%@juthoor.local')
          || ' persons=' || (select count(*) from public.persons p join public.trees t on t.id = p.tree_id join auth.users u on u.id = t.owner_id where u.email like '%@juthoor.local')
          || ' pending_matches=' || (select count(*) from public.matches where status = 'pending')
          || ' pending_verifications=' || (select count(*) from public.identity_verifications where status = 'pending');
    """).strip())


if __name__ == "__main__":
    sys.exit(main())
