# Functional Recovery & Workflow Polish 007 — delivery

Build/release: `SPW-007-20260807`  
Environment: local review only  
Date: 2026-08-07

## 1–16 delivery summary

1. **Earlier functionality found.** The repository proof contained customer-first input, a visual article catalogue, product images, SKUs, multiple items, clothing size, order-wide initials/back/short fields and item deviations. Direct Print 003/004 contained colour batching, provenance, no-scale constraints, nesting and efficiency. Foundation 006 contained server auth/RBAC, shared storage, revisions, idempotency, audit, feedback, preferences and backup.
2. **006 regressions restored.** Customer email/phone, visual article choice, size, order defaults, item deviation, association as item context, product profile guidance, compact orders and colour planning are visible again.
3. **Existing functions consciously retained.** Authentication, roles, shared server truth, 409 concurrency, idempotency, audit, durable preferences, backup, Direct Print geometry/provenance, manual fallback and `hardwareSendEnabled=false` are unchanged as authority.
4. **UX simplified.** No association-first step, no repeated personalization per item, no manual foil/font/print-size entry for normal work, and no always-open technical instruction. Only deviations need extra input.
5. **New order flow.** Four visible sections: customer → order-wide defaults → visual article choice → selected-item check/deviations. A standard three-article order needs customer confirmation, defaults confirmation, image selection and save.
6. **Articles/product images.** Ten local, managed pilot articles use real repository WebP product images. Image is primary; article number is secondary. No webshop stock sync was introduced.
7. **Order-wide printing and deviations.** Supported defaults are applied server-side from managed article capabilities. A checked deviation overrides only supplied item values and gets a quiet visual marker.
8. **Production instructions.** Five managed profiles provide placement, reference distance in cm, print size, font profile, colour, mirror/rotation and concise instruction. Operators open them only when needed.
9. **Order overview/multi-select.** Ten seeded review orders fit the compact desktop direction. Search, per-order selection and atomic bulk transition are present; revisions and idempotency remain enforced.
10. **Foil/on-hold.** Foil colour is automatic from the article profile. Colour states are independent; `Wacht op rood` does not block ready white work. Production groups by colour across orders and associations.
11. **Foil/finance.** Admin sees verified Direct Print material/efficiency measurements and editable roll source fields. Missing supplier, purchase price and original length remain explicitly unknown; unit cost is not guessed.
12. **Kevin/admin.** Kevin can access users, article activation/profile mapping, production profile instructions, processing days, mail-copy foundation and foil/financial data.
13. **Patrick/operator.** Patrick sees orders, entry, detail, production, feedback, preferences and relevant instructions. Beheer and financial data are absent in UI and denied server-side.
14. **Tests.** Full repository suite: 324 passed, 0 failed. Workspace-only production build and static verification also pass.
15. **Screenshots.** Sixteen current PNGs are recorded in `SCREENSHOT-MANIFEST.md` and `output/sportpaleis-workspace-007/screenshots`.
16. **Open employee tuning.** Real staff must still validate terminology, actual catalogue scope, default support fields per article, preferred compact density, club-logo assets, production distances/profiles, roll purchase data, mail wording and the physical Direct Print/Summa path.

## Controlled user personalization

Preferences remain server-owned per authenticated user. Users may show/hide and order optional dashboard panels, choose optional order columns, set order density and select helper production panels. Customer identity, status, attention, colour batches, hard width/safety rules and hardware-lock information cannot be hidden. No free page builder exists.

## Boundaries

- No production deployment, DNS change, mail credentials or paid service.
- No SMTP send.
- No Summa USB/PIPE/driver/WinPlot action.
- Demo login is exposed only when the local review server explicitly enables it; production runtime requires both local/non-production environment and the opt-in flag.

FUNCTIONAL HISTORY RECONSTRUCTED: YES  
REGRESSIONS RESTORED: YES  
FAST ORDER ENTRY READY FOR REVIEW: YES  
PRODUCTION GUIDANCE READY FOR REVIEW: YES  
ADMIN/OPERATOR DIFFERENCE READY FOR REVIEW: YES  
READY FOR VISUAL REVIEW: YES  
READY FOR PILOT USE: NO  
DIRECT PRINT HARDWARE VALIDATED: NO
