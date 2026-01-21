
# 🚀 AI Companion Platform  
### Hybrid Full-Stack Application (Frontend + Backend + Supabase + AI)

![Status](https://img.shields.io/badge/status-production--ready-brightgreen)
![Node](https://img.shields.io/badge/node-%3E%3D18.x-green)
![Supabase](https://img.shields.io/badge/database-supabase-3ECF8E)
![Cloudflare](https://img.shields.io/badge/security-cloudflare%20zero%20trust-orange)
![License](https://img.shields.io/badge/license-private-red)

---

## 🧠 Overview

Ye project ek **secure, scalable, AI-powered web application** hai jisme:

- ⚡ **Vite Frontend**
- 🚀 **Node.js Backend**
- 🛢️ **Supabase (Auth + Database)**
- 🤖 **AI APIs (Groq, HuggingFace, OCR)**
- 📧 **SMTP Email System**
- ☁️ **Cloudflare Zero Trust Tunnel (Secure Backend Exposure)**

Is README ko follow karke aap **production-grade deployment** easily setup kar sakte ho.

---

## 📦 Tech Stack

| Layer | Technology |
|-----|-----------|
| Frontend | Vite + JavaScript |
| Backend | Node.js |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| AI | Groq, HuggingFace |
| OCR | OCR.Space |
| Email | SMTP (Brevo / Gmail) |
| Security | Cloudflare Zero Trust |

---

## 📁 Environment Setup

### 1️⃣ Rename Environment File

```bash
example.env  →  .env
````

❗ **Mandatory step** – bina iske app start nahi hoga.


### 2️⃣ Admin Login (Frontend)

```env
VITE_ADMIN_EMAIL=your-admin@example.com
VITE_ADMIN_PASSWORD=StrongPassword@123
```

🔐 Admin Panel ke liye use hota hai
❌ Public repo me kabhi leak mat karo

---

### 3️⃣ Frontend → Backend API

```env
VITE_API_BASE_URL=/api
```

Custom domain example:

```env
VITE_API_BASE_URL=https://api.example.com/api
```

---

### 4️⃣ Backend Public URL (CRITICAL)

```env
BACKEND_URL=https://example.com
```

📧 Email verification / reset links yahin se generate hote hain

---

### 5️⃣ Supabase Frontend Config (SAFE)

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_KEY=your-anon-key
```

📍 Supabase Dashboard → Project Settings → API

---

### 6️⃣ External API Websites (Documentation)

```env
HUGGINGFACE_API_BASE=https://api-inference.huggingface.co
GROQ_API_BASE=https://api.groq.com/openai/v1
OCR_API_BASE=https://api.ocr.space/parse/image
SUPABASE_API_BASE=https://xxxxx.supabase.co/rest/v1
SMTP_API_WEBSITE=https://www.brevo.com
```

📌 Reference + maintenance purpose

---

### 7️⃣ AI / OCR API Keys (Optional)

```env
VITE_HUGGINGFACE_API_KEY=hf_xxxxx
VITE_GROQ_API_KEY=gsk_xxxxx
VITE_OCR_API_KEY=ocr_xxxxx

HUGGINGFACE_API_KEY=hf_xxxxx
GROQ_API_KEY=gsk_xxxxx
OCR_API_KEY=ocr_xxxxx
```

---

### 8️⃣ SMTP Config (Backend Only)

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM="YourApp <no-reply@yourdomain.com>"
```

---

### 9️⃣ JWT Security

```env
JWT_SECRET=super-secret-key
```

Used for:

* Email verification
* Secure token generation

---

### 🔟 Frontend URL

```env
FRONTEND_URL=https://frontend.example.com
```

---

### 🚨 1️⃣1️⃣ Backend-Only Supabase Admin Keys

```env
SUPABASE_SERVICE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service-role-key
```

❌ Frontend me **kabhi mat daalo**

---

# 🛢️ Supabase Database Structure

## 📊 (Tabular + SQL Editor Commands)

📍 Supabase Dashboard → **SQL Editor**

---
Samajh gaya 👍
Screenshot ke hisaab se **`profiles` table updated hai**, isliye README me **tabular structure + SQL** dono ko **update** karna hoga.

Neeche **FULLY UPDATED, COPY-PASTE READY** section diya hai —
✔️ **screenshot wale saare columns included**
✔️ **new table banane ka SQL**
✔️ **existing table ko update karne ka SQL (ALTER TABLE)**

---

# 🌌 PROFILES TABLE (UPDATED – AS PER SUPABASE UI)

## 📊 Table Structure (Latest)

| Column Name    | Data Type   | Default Value | Description                         |
| -------------- | ----------- | ------------- | ----------------------------------- |
| **id**         | `uuid`      | `auth.uid()`  | Supabase Auth User ID (Primary Key) |
| **email**      | `text`      | `''::text`    | User email address                  |
| **full_name**  | `text`      | `''::text`    | User ka full name                   |
| **avatar_url** | `text`      | `NULL`        | User profile image URL              |
| **created_at** | `timestamp` | `now()`       | Record creation time                |
| **updated_at** | `timestamp` | `now()`       | Last update time                    |

---

## ✅ SQL: Fresh Table Create (NEW PROJECT)

> 📍 **Supabase Dashboard → SQL Editor → New Query**

```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text DEFAULT ''::text,
  full_name text DEFAULT ''::text,
  avatar_url text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

---

## 🔁 SQL: UPDATE EXISTING `profiles` TABLE

(If table pehle se bani hui hai)

> ⚠️ **Safe to run – data delete nahi hoga**

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.profiles
ALTER COLUMN email SET DEFAULT ''::text,
ALTER COLUMN full_name SET DEFAULT ''::text;

ALTER TABLE public.profiles
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN updated_at SET DEFAULT now();
```

---

## 🔄 OPTIONAL: Auto-Update `updated_at` Trigger (RECOMMENDED)

Taaki har update pe `updated_at` automatically change ho jaaye 👇

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
```

---

---

## 🚀 Chat Conversations Table

| Column     | Type        | Description        |
| ---------- | ----------- | ------------------ |
| id         | uuid        | Primary key        |
| user_id    | uuid        | FK → profiles      |
| title      | text        | Conversation title |
| created_at | timestamptz | Auto               |
| updated_at | timestamptz | Auto               |

```sql
CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text DEFAULT 'New Conversation',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

## 🔥 Chat Messages Table

| Column          | Type        | Description      |
| --------------- | ----------- | ---------------- |
| id              | uuid        | Primary key      |
| conversation_id | uuid        | FK               |
| user_id         | uuid        | FK               |
| role            | text        | user / assistant |
| content         | text        | Message          |
| attachments     | jsonb       | Files            |
| created_at      | timestamptz | Auto             |

```sql
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text,
  content text,
  attachments jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);
```

---

# 🚨🚨🚨 IMPORTANT DEPLOYMENT NOTE 🚨🚨🚨

## ❗ PLEASE READ CAREFULLY ❗

### 🔥 Recommended Port Architecture

```
FRONTEND  →  PORT 9080
BACKEND   →  PORT 3000
```

---

### ☁️ Cloudflare Zero Trust Tunnel (MANDATORY)

❌ Backend ko direct public expose **MAT KARO**

✅ Correct Flow:

```
http://0.0.0.0:3000
        ↓
Cloudflare Zero Trust Tunnel
        ↓
https://example.com
```

🛡️ Benefits:

* Real IP hidden
* DDoS protection
* Auto SSL
* No open backend ports

---

# 🧨 Full System Reset (DEV ONLY)

```sql
DELETE FROM public.chat_messages;
DELETE FROM public.chat_conversations;
DELETE FROM public.profiles;
DELETE FROM auth.identities;
DELETE FROM auth.users;
```

⚠️ Production me backup ke bina mat chalana

---

## 📦 Install Dependencies

```bash
npm install
```

---

## 🏗️ Build Project

```bash
npm run build
```

---

## 🚀 Run Project

```bash
npm run dev:full
```

---

## ⚠️ Important Notes

* `.env` gitignore me hona chahiye
* Env change ke baad restart
* API keys rotate karte raho
* Credits remove **mat karo**

---

## ❤️ Developer Credits

**Developed & Maintained by Arvind Nag (RageXvenom)**
🌐 [https://arvindnag.netlify.app](https://arvindnag.netlify.app)

Agar aap is project ko use karte ho,
**credits dena zaruri hai 🙏**

---

## 🎉 Setup Complete

**Your Application is Production-Ready 🚀**

```

```
