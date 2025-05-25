## Lightweight Git Branching Model for Your MVP

The goal is **simplicity**: keep production code safe (`main`), give yourself a sandbox (`develop`), and create short-lived topic branches for each task.  
Below is a starter policy you can copy into a `docs/branching.md` file and share with anyone who joins the project later.

---

### 1. Permanent Branches

| Branch    | Purpose                                                  | Who pushes                 |
|-----------|----------------------------------------------------------|----------------------------|
| `main`    | Always deployable. Tagged releases (`v1.2.0`, `v1.2.1`). | **CI only** after PR merge |
| `develop` | Integration branch for the next release / demo.          | All contributors via PR    |

`main` → production (Render/Fly);  
`develop` → staging (optional) or local testing.

---

### 2. Temporary (“Topic”) Branches

Prefix + short description, one feature/bug per branch:

```
feature/join-code
feature/vote-endpoint
fix/duplicate-session
chore/docker-deploy
```


Rules
1. Branch off **`develop`**.
2. Open a Pull Request immediately (“draft” mode) so CI runs, and teammates can follow.
3. Rebase onto `develop` if it drifts (`git fetch; git rebase origin/develop`).
4. Delete the branch after merge—history lives in the PR.

---

### 3. Release / Hotfix Branches (optional for MVP)

• `release/2024-06-10-demo` – cut from `develop`, polish, tag `v0.3.0`, merge into `main` **and** `develop`.  
• `hotfix/fix-null-vote` – cut from `main` when prod is broken; quick patch, tag `v0.3.1`, merge back into both branches.

You may skip these until you have external users.

---

### 4. Protection & Automation

1. GitHub → Settings → Branches  
   • Protect `main` and `develop`:  
   – Require PR review (1 approval)  
   – Require status checks to pass (`build-backend`, `build-frontend`)  
   – Disallow force pushes

2. CI Pipeline (GitHub Actions)  
   • On `pull_request`: build + test  
   • On `main` push: build, test, deploy backend & frontend  
   • On `develop` push: build, test, deploy to staging (optional)

---

### 5. Suggested Commands

```shell script
# Clone & set up upstream
git clone git@github.com:<you>/foodie-friends.git
cd foodie-friends
git checkout -b develop origin/develop   # first time only

# Start a new task
git checkout develop
git pull
git checkout -b feature/join-code

# Commit work
git add .
git commit -m "feat: generate and persist join code"

# Push & open PR
git push -u origin feature/join-code     # GitHub will offer to create a PR

# Update branch if develop has moved
git fetch origin
git rebase origin/develop
git push --force-with-lease              # safe force-push

# After PR merge
git checkout develop
git pull
```


---

### 6. Commit Message Convention (optional but helpful)

```
<type>: <subject>

[type]  feat | fix | chore | docs | refactor | test
```


Examples
```
feat: add progress API endpoint
fix: prevent duplicate votes (unique constraint)
chore: configure Flyway migrations
```


Keeps `git log --oneline --decorate --graph` readable.

---

### 7. Visualization Cheat-Sheet

```
main ──────●───────────────●─── (prod)
            \             /
develop ────●─●─●─●─●─●─●─●──── (next demo)
              \   \
feature/foo    ●   \
                \   \
feature/bar      ●   ●
```


---

### 8. Next Steps

1. Add the above policy to your repo (`docs/branching.md`).
2. Enable branch protection rules.
3. Create `develop`, push it, and migrate current work there (`git branch -m develop`).
4. Create your first `feature/…` branch and open a draft PR.

That’s it—you now have a structured yet lightweight branching model that supports solo development today and team collaboration tomorrow.