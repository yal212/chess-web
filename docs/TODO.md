### To Do
- make the UI better
- move history improve
- account settings
- join game error (newly signed in user did not get added to users)
- ratings system



### useful commands

- npm run dev
    - run web with compile updates

# Remove the .env.local file from git tracking
git rm --cached .env.local

# Ensure .env.local is in .gitignore (already done)
echo ".env.local" >> .gitignore

- check privacy leak
Act as a security auditor. Review the following codebase and check for any potentially exposed secrets or sensitive data, such as API keys, access tokens, passwords, private keys, or database URLs. Highlight any hardcoded secrets or insecure patterns. if I publish to public github repo