# Security Policy

## 🔒 Sensitive Data Protection

This repository has **ZERO TOLERANCE** for committed secrets or sensitive data.

### Protected Files

The following files are **NEVER** committed to git:

- `.env` - Environment variables
- `.env.local` - Local environment overrides
- `.env.production` - Production credentials
- `.env.development` - Development credentials
- `*.pem`, `*.key` - Private keys and certificates
- `credentials.json`, `secrets.json` - Credential files

### Automated Protection

This repository uses a **pre-commit hook** that automatically blocks commits containing:

1. **Forbidden files** (`.env`, `.env.local`, etc.)
2. **Sensitive patterns** (API keys, tokens, passwords)
3. **Certificate files** (`.pem`, `.key`, `.p12`, etc.)

### What to Do If You Accidentally Commit Secrets

If sensitive data is committed:

1. **DO NOT** push to GitHub
2. **Immediately** remove from git history:
   ```bash
   git reset --soft HEAD~1  # Undo last commit
   git restore --staged .env  # Unstage the file
   ```
3. **Rotate all exposed credentials** (API keys, tokens, passwords)
4. **Verify** the file is in `.gitignore`

### If Already Pushed to GitHub

1. **Immediately rotate ALL exposed credentials**
2. Remove from git history:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   
   git push --force --all
   ```
3. **Verify** on GitHub that the file is removed
4. Contact GitHub support to purge from cache if needed

### Credential Rotation Checklist

If `.env` was exposed, rotate:
- [ ] Mapbox API token (https://account.mapbox.com/)
- [ ] Supabase Anon Key (regenerate in Supabase dashboard)
- [ ] Any other API keys or tokens

### Prevention Best Practices

1. **Always use `.env.example`** for templates (no real values)
2. **Never hardcode** credentials in source files
3. **Use environment variables** for all secrets
4. **Review commits** before pushing
5. **Trust the pre-commit hook** - if it blocks, there's a reason

### Reporting Security Issues

If you discover a security vulnerability, please email the repository owner directly. Do not open a public issue.

---

**Last Updated**: February 1, 2026  
**Enforcement**: Automated via pre-commit hook
