# CodeMark Deployment Guide

This guide covers deploying CodeMark to production environments, with a focus on Vercel deployment.

## Pre-Deployment Checklist

### Environment Variables

- [ ] `OPENAI_API_KEY` - Production OpenAI API key configured
- [ ] Verify API key has sufficient quota for expected usage
- [ ] Optional: Configure `NEXT_PUBLIC_ENABLE_ANALYTICS=true` for production analytics

### Code Quality

- [ ] All TypeScript errors resolved (`npm run build` succeeds)
- [ ] No console errors in browser developer tools
- [ ] ESLint passes (`npm run lint`)
- [ ] Bundle size within targets (run `npm run analyze`)

### Security

- [ ] API keys are NOT committed to repository
- [ ] `.env` is in `.gitignore`
- [ ] No sensitive data in client-side code
- [ ] CORS settings appropriate for production domain

### Testing

- [ ] Manual testing of core features:
  - [ ] Code input and syntax highlighting
  - [ ] Code selection and review creation
  - [ ] AI response streaming
  - [ ] Thread management (create, filter, delete)
  - [ ] LocalStorage persistence
- [ ] Health endpoint returns 200 (`/api/health`)
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)

---

## Vercel Deployment

### Initial Setup

1. **Connect Repository**
   ```
   1. Go to https://vercel.com/new
   2. Import your GitHub/GitLab/Bitbucket repository
   3. Vercel auto-detects Next.js configuration
   ```

2. **Configure Environment Variables**
   ```
   Project Settings → Environment Variables

   Required:
   - OPENAI_API_KEY = your_production_api_key

   Optional:
   - NEXT_PUBLIC_ENABLE_ANALYTICS = true
   - NEXT_PUBLIC_ENABLE_DEVTOOLS = false
   ```

3. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)
   - Verify deployment at provided `.vercel.app` URL

### Environment Variable Configuration

| Variable | Environment | Value |
|----------|-------------|-------|
| `OPENAI_API_KEY` | Production | Your production API key |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | Production | `true` |
| `NEXT_PUBLIC_ENABLE_DEVTOOLS` | Production | `false` |
| `NEXT_PUBLIC_ENABLE_SW` | Production | `true` |

### Custom Domain Setup

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS:
   - **A Record**: `76.76.21.21`
   - **CNAME**: `cname.vercel-dns.com`
4. Wait for SSL certificate provisioning (automatic)

### Build Settings

Vercel auto-detects these settings, but verify if needed:

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Build Command | `next build` |
| Output Directory | `.next` |
| Install Command | `npm install` or `pnpm install` |
| Node.js Version | 18.x or 20.x |

---

## Post-Deployment Verification

### Immediate Checks

1. **Health Check**
   ```bash
   curl https://your-domain.com/api/health
   ```
   Expected: `{"status":"healthy",...}`

2. **Home Page**
   - Visit `https://your-domain.com`
   - Verify Monaco Editor loads
   - Check browser console for errors

3. **AI Functionality**
   - Create a test review
   - Verify AI response streams correctly
   - Check response quality

### Performance Validation

1. **Lighthouse Audit**
   ```
   1. Open Chrome DevTools
   2. Go to Lighthouse tab
   3. Run audit for Performance, Accessibility, Best Practices
   ```

   Targets:
   - Performance: >80
   - Accessibility: >90
   - Best Practices: >90

2. **Core Web Vitals**
   - LCP: <2.5s
   - FID: <100ms
   - CLS: <0.1

3. **Bundle Size**
   - Verify no chunks exceed 244KB
   - Run `npm run analyze` locally to check

---

## Rollback Procedures

### Vercel Instant Rollback

1. Go to Project → Deployments
2. Find the last working deployment
3. Click "..." menu → "Promote to Production"
4. Confirm rollback

### Git-Based Rollback

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit (use with caution)
git reset --hard <commit-hash>
git push --force origin main
```

---

## Monitoring Setup

### Health Monitoring

Configure uptime monitoring with one of these services:

**UptimeRobot (Free)**
1. Create account at uptimerobot.com
2. Add new monitor:
   - Type: HTTP(s)
   - URL: `https://your-domain.com/api/health`
   - Interval: 5 minutes
3. Configure alerts (email, Slack, etc.)

**Vercel Analytics**
- Automatically enabled for Pro/Enterprise plans
- View at: Project → Analytics

### Error Tracking (Optional)

**Sentry Integration**
1. Create Sentry project
2. Add to environment variables:
   ```
   NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
   ```
3. Install SDK: `npm install @sentry/nextjs`
4. Follow Sentry Next.js setup wizard

---

## Troubleshooting

### Build Failures

**"Module not found" errors**
```bash
# Clear cache and reinstall
rm -rf node_modules .next package-lock.json
npm install
npm run build
```

**TypeScript errors**
```bash
# Check for type errors
npm run build 2>&1 | grep "error TS"
```

**Memory issues during build**
```bash
# Increase Node memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### Runtime Issues

**500 errors on API routes**
- Check Vercel function logs: Project → Deployments → Functions
- Verify environment variables are set
- Check OpenAI API key validity

**Slow initial load**
- Verify Monaco Editor is lazy-loaded
- Check for large unoptimized images
- Review bundle analyzer output

**Service Worker issues**
- Clear browser cache and service workers
- Check `public/sw.js` is being served
- Verify HTTPS is configured

### OpenAI API Issues

**401 Unauthorized**
- Verify `OPENAI_API_KEY` is set in Vercel
- Check key hasn't expired
- Verify key has API access (not just ChatGPT Plus)

**429 Rate Limited**
- Check OpenAI usage dashboard
- Consider implementing request queuing
- Upgrade OpenAI plan if needed

**Timeout errors**
- OpenAI responses can take 30-60s for long code
- Vercel functions have 10s timeout on Hobby plan
- Consider Vercel Pro for extended timeouts (60s)

---

## Environment-Specific Configurations

### Development
```env
OPENAI_API_KEY=sk-dev-...
NEXT_PUBLIC_ENABLE_DEVTOOLS=true
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_SW=false
```

### Staging/Preview
```env
OPENAI_API_KEY=sk-staging-...
NEXT_PUBLIC_ENABLE_DEVTOOLS=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_SW=true
```

### Production
```env
OPENAI_API_KEY=sk-prod-...
NEXT_PUBLIC_ENABLE_DEVTOOLS=false
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_SW=true
```

---

## Deployment Automation

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml` for automated deployments:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Support

For deployment issues:
1. Check this guide's troubleshooting section
2. Review Vercel deployment logs
3. Check OpenAI API status: https://status.openai.com
4. Open an issue on GitHub

---

*Last Updated: December 2024*
