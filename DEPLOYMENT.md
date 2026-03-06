# 17solutions V2 — Deployment Guide

## Übersicht

V1 und V2 laufen parallel auf Vercel. Kein Konflikt.

| | V1 (bestehend) | V2 (neu) |
|---|---|---|
| Vercel-Projekt | `17solutions` | `17solutions-v2` |
| URL | `17solutions.vercel.app` | `17solutions-v2.vercel.app` |
| Custom Domain | (falls vorhanden) | z.B. `app.17solutions.de` |
| Datenbank | — | Neon PostgreSQL |

---

## Schritt 1: Neon Datenbank erstellen (2 Minuten)

1. Gehe zu **https://neon.tech** → Sign Up (kostenlos)
2. **Create Project**
   - Name: `17solutions`
   - Region: **EU (Frankfurt)** ← wichtig für DSGVO
3. Connection String kopieren — sieht so aus:
   ```
   postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Diesen String brauchst du gleich als `DATABASE_URL`

---

## Schritt 2: Vercel Deployment (5 Minuten)

### Option A: Via GitHub (empfohlen)

1. Pushe den `/App`-Ordner in ein **neues** GitHub Repository:
   ```bash
   cd App
   git init
   git add .
   git commit -m "17solutions V2 — initial"
   git remote add origin https://github.com/DEIN-USER/17solutions-v2.git
   git push -u origin main
   ```

2. Gehe zu **https://vercel.com/new**
3. Importiere das Repository `17solutions-v2`
4. Framework: **Next.js** (wird automatisch erkannt)
5. **Environment Variables** setzen (siehe unten)
6. **Deploy** klicken

### Option B: Via Vercel CLI

```bash
cd App
npm i -g vercel
vercel --yes
```

Dann Environment Variables im Vercel Dashboard setzen.

---

## Schritt 3: Environment Variables

Im Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Wert | Hinweis |
|---|---|---|
| `DATABASE_URL` | `postgresql://...neon.tech/...?sslmode=require` | Von Schritt 1 |
| `NEXTAUTH_URL` | `https://17solutions-v2.vercel.app` | Deine Vercel-URL |
| `NEXTAUTH_SECRET` | *(zufälliger String)* | Terminal: `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Dein API Key |

---

## Schritt 4: Datenbank initialisieren

Nach dem ersten Deploy einmalig lokal ausführen:

```bash
# .env.local mit Neon-URL anlegen
cp .env.example .env.local
# DATABASE_URL anpassen (Neon Connection String)

# Tabellen erstellen
npm run db:push

# Admin-User anlegen (f100r@me.com)
npm run db:seed
```

Alternativ: In Neon Console → SQL Editor direkt ausführen.

---

## Schritt 5: Testen

1. Öffne `https://17solutions-v2.vercel.app`
2. Login mit `f100r@me.com` / `changeme123`
3. Passwort sofort ändern (TODO: Passwort-Ändern-Funktion)
4. Neue Session erstellen → Markenname eingeben → Chat testen

---

## Nutzer einladen

Als Admin kannst du neue Nutzer einladen:

```bash
# API Call (oder später über Admin-UI)
curl -X POST https://17solutions-v2.vercel.app/api/admin/invite \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=DEIN_TOKEN" \
  -d '{"email": "kunde@firma.de"}'
```

Der Nutzer erhält einen Einladungs-Link → setzt Name + Passwort → kann die App nutzen.

---

## Custom Domain (optional)

1. Vercel Dashboard → Project → Settings → Domains
2. `app.17solutions.de` hinzufügen
3. DNS: CNAME `app` → `cname.vercel-dns.com`
4. `NEXTAUTH_URL` in Vercel auf `https://app.17solutions.de` ändern
5. Redeploy

---

## Kosten

| Posten | Kosten |
|---|---|
| Vercel (Hobby) | kostenlos |
| Vercel (Pro, falls nötig) | $20/Monat |
| Neon PostgreSQL (Free Tier) | kostenlos (0.5 GB, ausreichend) |
| Anthropic API | nach Verbrauch (trackbar im Admin Dashboard) |

**Streaming macht Vercel Pro unnötig** — die App funktioniert auf dem kostenlosen Tier.
