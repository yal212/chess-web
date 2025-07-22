# 🔐 Security Setup Guide

## ⚠️ IMPORTANT: Environment Variables Setup

This repository does **NOT** include any production credentials. You must set up your own Supabase project and environment variables.

### 🚨 Required Environment Variables

Create a `.env.local` file in the root directory with your own credentials:

```env
# Supabase Configuration (Replace with YOUR values)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google OAuth (Optional - configure in Supabase dashboard)
# GOOGLE_CLIENT_ID=your_google_client_id
# GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 🛡️ Security Best Practices

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Use your own Supabase project** - Don't use example URLs
3. **Rotate keys regularly** - Especially service role keys
4. **Limit service role key usage** - Only use in secure server environments
5. **Enable RLS (Row Level Security)** - Protect your database

### 📋 Setup Steps

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Copy your project URL and anon key

2. **Set Up Database**
   - Run the SQL schema from `supabase-schema.sql`
   - Enable Row Level Security on all tables

3. **Configure Authentication**
   - Set up OAuth providers in Supabase dashboard
   - Configure redirect URLs for your domain

4. **Deploy Securely**
   - Set environment variables in your deployment platform
   - Never expose service role keys in client-side code

### 🔍 What's Safe to Share

✅ **Safe to commit:**
- Source code
- Configuration templates
- Documentation
- Database schema (without data)

❌ **Never commit:**
- `.env.local` or any env files with real values
- API keys or tokens
- Database URLs with credentials
- Service role keys

### 🆘 If You Accidentally Exposed Secrets

1. **Immediately rotate all keys** in your Supabase dashboard
2. **Remove the commit** from Git history if possible
3. **Update all deployment environments** with new keys
4. **Monitor for unauthorized access**

---

**Remember**: This is a template project. Set up your own infrastructure and never use example credentials in production!
