# Deployment Guide: Render & Vercel

This guide helps you deploy the Resume Builder application with Backend on Render and Frontend on Vercel.

## Backend Deployment (Render)

### Prerequisites
- Render.com account
- MongoDB Atlas account (for database)
- Environment variables ready

### Steps

1. **Push code to GitHub**
   ```bash
   git push origin main
   ```

2. **Create Render Service**
   - Go to [render.com](https://render.com)
   - Click "New +"  → "Web Service"
   - Connect your GitHub repository
   - Select the Backend folder
   - Fill in the following:
     - **Name**: resume-builder-backend
     - **Runtime**: Node
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`
     - **Instance Type**: Free

3. **Set Environment Variables on Render**
   Add the following in the "Environment" section:
   ```
   NODE_ENV=production
   PORT=5000
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
   JWT_SECRET=your_jwt_secret_key
   JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
   CORS_ORIGIN=https://your-frontend.vercel.app
   RESEND_API_KEY=your_resend_api_key
   RESEND_FROM=Your App <onboarding@resend.dev>
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=https://your-backend.render.com/auth/google/callback
   ```

4. **Get Backend URL**
   - After deployment, copy the URL (e.g., `https://resume-builder-backend.render.com`)
   - Update `CORS_ORIGIN` to include this URL
   - Update `GOOGLE_CALLBACK_URL` accordingly

---

## Frontend Deployment (Vercel)

### Prerequisites
- Vercel.com account
- Backend URL from Render

### Steps

1. **Push code to GitHub**
   ```bash
   git push origin main
   ```

2. **Create Vercel Project**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New..." → "Project"
   - Select your GitHub repository
   - Select the `frontend` folder as the root directory
   - Click "Deploy"

3. **Set Environment Variables on Vercel**
   After deployment, go to **Settings** → **Environment Variables** and add:
   ```
   VITE_API_BASE_URL=https://your-backend.render.com/api
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   ```

4. **Redeploy**
   - After adding environment variables, redeploy from the Deployments tab
   - Or push a new commit to trigger auto-deployment

---

## Environment Variables Summary

### Backend (.env)
```
PORT=5000
MONGO_URI=your_mongodb_uri
CORS_ORIGIN=http://localhost:5173,https://your-frontend.vercel.app
JWT_SECRET=your_secret
JWT_REFRESH_SECRET=your_secret
NODE_ENV=production
EMAIL_USER=your_email
EMAIL_PASS=your_password
GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret
GOOGLE_CALLBACK_URL=https://your-backend.render.com/auth/google/callback
```

### Frontend (.env)
```
VITE_API_BASE_URL=https://your-backend.render.com/api
VITE_GOOGLE_CLIENT_ID=your_id
```

---

## Important Notes

1. **Render Free Tier**: Free instances spin down after 15 minutes of inactivity. Use paid tier for production.
2. **CORS**: Make sure `CORS_ORIGIN` includes both localhost (for development) and production URLs.
3. **Database**: Use MongoDB Atlas with IP whitelist (allow all IPs for Render: 0.0.0.0/0)
4. **Secrets**: Never commit `.env` files. Use `.env.example` as template.
5. **Build Time**: First build may take 2-3 minutes on Render.

---

## Troubleshooting

### CORS Errors
- Check `CORS_ORIGIN` in backend includes your frontend URL
- Ensure credentials are enabled in both frontend and backend

### 502 Bad Gateway on Render
- Check build logs for TypeScript compilation errors
- Verify all environment variables are set

### API not responding on Vercel
- Check `VITE_API_BASE_URL` in frontend environment variables
- Verify backend is running and accessible

---

## Local Development with Production URLs

To test with production backend locally:
```bash
# Frontend
VITE_API_BASE_URL=https://your-backend.render.com/api npm run dev

# Update backend CORS to include localhost
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```
