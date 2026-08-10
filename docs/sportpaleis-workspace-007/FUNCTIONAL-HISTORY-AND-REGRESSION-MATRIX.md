# Functional history and regression matrix — Workspace 007

Date: 2026-08-07  
Scope: repository evidence reviewed before implementation of Functional Recovery 007.

## Evidence hierarchy

- The earlier `sportpaleis-proof` implementation and its desktop/mobile captures prove the customer-first order flow, visual product catalogue, order-wide defaults and item deviations.
- The article/order models and tests prove article numbers, multiple order items, sizes and personalization state.
- Direct Print Foundation 003 and Optimization 004 prove colour-first batching, object provenance, the 450 mm hard limit, no scaling, nesting and efficiency metrics.
- Pilot Foundation 006 proves server authentication, RBAC, shared file storage, revisions/409, idempotency, audit, feedback, preferences, backup/restore and the hardware lock.
- A discussed feature without executable code, a test or a current screenshot is classified as concept; it is not represented as production fact.

## Regression matrix

| Function | Earlier presence and evidence | 006 status | Classification | 007 decision |
|---|---|---|---|---|
| Customer name, email, telephone first | Proof form and desktop capture | Only customer name visible | REGRESSION | Restore; validate email client and server side |
| Visual article choice and product photos | Proof catalogue, local WebP assets | Not visible | REGRESSION | Restore with image primary, SKU secondary |
| SKU/article number search context | Article model and proof cards | Not visible | REGRESSION | Restore as secondary metadata |
| Multiple articles | Order model/tests and proof | Retained in data, simplified input | VEREENVOUDIGD | Restore fast multi-item input |
| Multiple associations in one order | Item context permitted in earlier model | Order-level association required | REGRESSION | Make order dominant; derive associations from items |
| Clothing size | Proof item controls | Not visible in 006 input | REGRESSIE | Restore as supporting order data only |
| Clothing size controls print size | Explicitly not proven | Not present | BEWUST VERVANGEN | Keep separate; profile controls print size |
| Order-wide initials/name/back/short defaults | Proof form and state | Not visible | REGRESSION | Restore once per order |
| Per-item deviation | Proof control and visual marker | Not visible | REGRESSION | Restore as explicit exception |
| Duplicate similar item | Discussed workflow | Not found as validated implementation | ALLEEN CONCEPT | Add small local convenience |
| Foil colour/profile/font/size | Direct Print/profile data | Some production data visible | VERPLAATST | Keep automatic and secondary |
| Production instructions/placement/cm | Earlier design/profiles discussed | Not visible | NIET MEER ZICHTBAAR | Managed profiles with quiet disclosure |
| ORDER → CONTROL → PRINT → DONE | 006 service/tests | Present | BEHOUDEN | Preserve with revisions and audit |
| Search/filter | Earlier proof/workspace | Basic overview only | VEREENVOUDIGD | Compact search/filter UI |
| Multi-select/bulk transition | Requested/discussed; no complete 006 proof | Missing | ALLEEN CONCEPT | Add atomic server bulk action |
| Colour-first production batches | Direct Print 003/004 tests and artifacts | Foundation retained | BEHOUDEN | Surface in production UI |
| Partial colour hold | Planning rule described | Whole-order status only | NIET MEER ZICHTBAAR | Model colour states independently |
| 450 mm hard / 440 mm preferred / no scale | Direct Print 003/004 tests | Retained | BEHOUDEN | Keep immutable safety guidance |
| Roll use, waste, efficiency | Direct Print Optimization 004 | Technical metrics not visible | VERPLAATST | Surface verified metrics for admin |
| Roll price, source length, unit cost | No reliable source values found | Missing | ALLEEN CONCEPT | Editable admin fields; unknown remains explicit |
| Dashboard | Proof and 006 overview | Present, simplified | BEHOUDEN | Recompose without redesign |
| Article/profile management | Discussed and partial prototypes | Not visible | NIET MEER ZICHTBAAR | Small admin management views |
| Server auth/RBAC/shared truth/concurrency | 006 service and 316-test baseline | Present | BEHOUDEN | No client-side authority introduced |
| Durable per-user preferences | 006 service/store | Present for a few shell options | VEREENVOUDIGD | Extend to controlled columns/panels/order; core stays fixed |
| Free page builder | Never part of validated flow | Not present | BEWUST VERVANGEN | Explicitly excluded |
| Receipt/ready email connector | Copy direction only | No SMTP | ALLEEN CONCEPT | Store manageable copy foundation; send nothing |
| Local demo role switch | Review requirement | Missing | ALLEEN CONCEPT | Local-only, server-gated sessions; production disabled |
| Hardware send | Explicitly prohibited | `hardwareSendEnabled=false` | BEHOUDEN | Remains false; fallback stays manual |

## Controlled personalization contract

Personalization is a server-owned allow-list, not arbitrary layout editing. A user may hide and reorder optional order columns, optional dashboard panels and production helper panels. Customer/order identity, status, urgent attention, production state, safety limits and hardware-lock information remain fixed. Preferences are stored under the authenticated user ID and are never accepted for another user ID supplied by the client.

## Important workflow change

006 required an association before an order could be created. 007 removes that leading choice: the employee enters the customer, sets normal personalization once, and selects recognizable articles. Association, foil and production profile come from each managed article. Only deviations open item-specific input.
