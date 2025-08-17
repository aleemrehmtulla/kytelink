Acknowledged constraints from @liugod:

- Repository name stays as liugod/linktech. Do not rename the repo.
- Do NOT change package, module, or published artifact names (e.g., package names, module paths, artifactId, npm package name, Go module path, etc.). Keep existing import paths and published identifiers intact.
- Display capitalization preference: "TradLink" for UI and documentation. Use case-appropriate variants elsewhere (tradlink, TradLink, TRADLINK) only for non-identifier strings, cache keys, etc. Avoid touching identifiers that would change importability or published identities.
- Update all external-facing surfaces owned by this repository: UI text, titles, manifests’ display names, docs/README, badges, GitHub Actions workflow names and display strings, environment variable prefixes/keys, Docker Compose service names and labels (when internal), Kubernetes/Helm display names/labels/selectors (when internal), artifact names in CI (non-published), and filenames/dirs containing the brand string. Do not modify third-party dependency names or external URLs pointing to other vendors.

Working rules for this PR:
- Mapping (context-aware):
  - linktech -> tradlink
  - Linktech -> TradLink
  - LinkTech -> TradLink
  - LINKTECH -> TRADLINK
  - link-tech -> trad-link
  - link_tech -> trad_link
  - "link tech" -> "TradLink" (UI/docs, prefer single word per branding)
- Exclusions: package/module/bundle identifiers, published package names, external import paths, release names in registries.
- Keep repo path references as liugod/linktech (don’t rewrite).

I will apply these constraints and push updates incrementally to this PR, ensuring builds/tests/lint pass. If any rename risks breaking external consumers, I will skip it and document the reason in the PR description.