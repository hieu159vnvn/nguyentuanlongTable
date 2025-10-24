# 🚂 Deploy Strapi lên Railway - Quick Guide

## ⚡ Các bước nhanh

### 1. Tạo Railway Account
- Vào https://railway.app
- Sign up với GitHub

### 2. Push code lên Git
```bash
git add .
git commit -m "Deploy to Railway"
git push origin main
```

### 3. Deploy trên Railway

#### A. Tạo Project
1. Railway Dashboard → **"New Project"**
2. **"Deploy from GitHub repo"**
3. Chọn repository

#### B. Cấu hình Service
- **Root Directory**: `cms`
- **Build Command**: `npm run build`
- **Start Command**: `npm start`

#### C. Add Database
1. Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway tự tạo PostgreSQL

#### D. Environment Variables
Settings → Variables → Add these:

```env
DATABASE_CLIENT=postgres
DATABASE_URL=postgresql://user:pass@host:5432/db (Railway auto-provided)

ADMIN_JWT_SECRET=your-random-secret-key-here
API_TOKEN_SALT=your-random-salt-here
APP_KEYS=key1,key2,key3,key4

NODE_ENV=production
```

**Generate keys:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. Get URL
- Settings → Networking → Generate Public Domain
- Copy URL: `https://your-project.up.railway.app`

### 5. Configure CORS
Settings → Variables → Add:
```env
STRAPI_CORS_ORIGIN=https://your-vercel-app.vercel.app
```

### 6. Done! ✅
- Admin: `https://your-project.up.railway.app/admin`
- API: `https://your-project.up.railway.app/api`

---

## 📋 Checklist

- [ ] Railway account created
- [ ] Code pushed to Git
- [ ] Railway project created
- [ ] Root Directory = `cms`
- [ ] PostgreSQL added
- [ ] Environment Variables set
- [ ] Deployed successfully
- [ ] Public domain generated
- [ ] Admin user created
- [ ] CORS configured
- [ ] Tested API

---

## 🔧 Troubleshooting

**Build failed?**
- Check logs
- Ensure Node 18+ version

**Database error?**
- Check DATABASE_URL format
- Verify PostgreSQL is running

**CORS error?**
- Add frontend domain to STRAPI_CORS_ORIGIN

