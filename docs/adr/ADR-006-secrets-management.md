# ADR-006: Doppler as the Single Source of Truth for Secrets

| Field       | Value                                   |
| ----------- | --------------------------------------- |
| **Status**  | Accepted                                |
| **Date**    | 2026-04-17                              |
| **Deciders**| Engineering Team                        |
| **Tags**    | security, secrets, devops, environment  |

---

## Context

After completing ADR-001 through ADR-005 the project has **20+ secrets** spread across:
- Two deployment targets (Vercel for `apps/web`, Railway for microservices)
- Three lifecycle environments (development, staging, production)
- Six external API providers (Amadeus, Numbeo, Mapbox, Stripe, Supabase, Resend)

The naive approach — each developer keeps a local `.env`, CI has environment variables baked into each provider's dashboard, and secrets are shared via Slack DMs — creates three failure modes:

1. **Drift**: Vercel production has a different `MAPBOX_SECRET_TOKEN` than Railway production because they were set months apart.
2. **Sprawl**: A new team member must request secrets from 6 different places before being productive.
3. **No rotation path**: When an API key is compromised, there is no systematic way to atomically update it across all deployment targets.

We need a **single sources of truth** for all secrets, with environment isolation, audit logging, and native integrations for Vercel and Railway.

---

## Decision

We adopt **Doppler** as the centralized secrets manager.

### Why Doppler over AWS Parameter Store / Secrets Manager

| Criterion | Doppler | AWS Parameter Store | AWS Secrets Manager |
|-----------|---------|--------------------|--------------------|
| Setup time (new project) | < 5 min (CLI `doppler setup`) | ~30 min (IAM roles, policies) | ~30 min + rotation Lambda |
| Native Vercel sync | ✅ First-class integration | ❌ Custom GitHub Action only | ❌ Custom action |
| Native Railway sync | ✅ Service tokens + CLI | ❌ | ❌ |
| Monorepo project scoping | ✅ One project, multiple configs | ⚠️ Path prefixes (manual) | ⚠️ Multiple secrets (manual) |
| Audit log | ✅ Per-secret access log | ✅ CloudTrail | ✅ CloudTrail |
| Secret rotation UI | ✅ Built-in | ❌ Manual or Lambda | ✅ Built-in (AWS-native only) |
| Free tier | ✅ Unlimited secrets, 3 users | ✅ 10K parameters free | ❌ $0.40/secret/month |
| Ops burden | Near-zero | Medium | Medium |

> **Migration path**: Doppler is not a lock-in. Every `doppler run` invocation simply injects standard env vars. Migrating to AWS Parameter Store later requires only replacing the `doppler run --` prefix with `aws ssm get-parameters-by-path` in CI scripts — all application code is unchanged.

### Environment Structure

```
Doppler Project: anywhere
│
├── Config: dev          → development (local machines + dev preview deployments)
├── Config: stg          → staging (Railway staging + Vercel preview branch)
└── Config: prd          → production (Railway prod + Vercel production)
```

Configs **inherit** from a root config. Shared non-sensitive values (e.g., `NODE_ENV`, `NEXT_PUBLIC_API_URL`) live in the root; environment-specific secrets override at the config level.

---

## Alternatives Considered

### Option A: `.env` files committed to a private repo
- **Rejected**: Still requires distributing a repo secret (deploy key). Rotation requires a PR and a redeployment of all services simultaneously.

### Option B: HashiCorp Vault (self-hosted or HCP)
- **Rejected**: Operational overhead is significant for a small team. Vault requires its own HA deployment, unseal key management, and lease renewal logic in applications.

### Option C: 1Password Secrets Automation
- **Considered**: Excellent UX, strong audit trails. ~2× Doppler's price at team scale. Deferred — keep as a future migration target if the team moves to 1Password as its password manager.

### Option D: GitHub Actions Secrets + Vercel/Railway dashboards directly
- **Rejected**: This is exactly the drift/sprawl problem described in Context. No single source of truth; no programmatic rotation.

---

## Consequences

### Positive
- A new developer runs `doppler setup` + `doppler run -- npm run dev` and has a fully-configured local environment in under 2 minutes.
- Rotating a compromised key (e.g., `AMADEUS_CLIENT_SECRET`) requires updating one Doppler secret — the change propagates to Vercel and Railway automatically via their sync integrations.
- Audit log shows exactly which CI job or human accessed which secret at what time.
- Per-environment isolation means a staging Stripe webhook cannot accidentally bill real customers.

### Negative
- Doppler is a third-party SaaS — if Doppler is unavailable, CI cannot fetch secrets. Mitigated by caching secrets in GitHub Actions encrypted store as a fallback (see `scripts/secrets/ci-fallback.sh`).
- Free tier is limited to 3 seats — upgrade to Team plan ($6/user/month) as the team grows beyond 3.
- Developers must install the Doppler CLI locally. Documented in `README.md` onboarding section.

---

## References
- [Doppler Documentation](https://docs.doppler.com/)
- [Doppler × Vercel Integration](https://docs.doppler.com/docs/vercel)
- [Doppler × Railway Integration](https://docs.doppler.com/docs/railway)
- [docs/secrets-management.md](../secrets-management.md) — Full operational runbook
