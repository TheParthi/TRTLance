# TrustLance v2 — UX audit and design direction

Written for the TrustLance team. It records the audit of the first v2 build (5 Oct 2026) and the design decisions taken for the second pass.

## How the audit was done

- A separate copy of the app ran against a local database seeded with every state that matters: a draft, open projects with 0 and 3 proposals, contracts awaiting signatures, awaiting funding, active with a revised milestone under review, disputed (unassigned) and completed with reviews, plus a dispute settled on-chain by the escrow contract.
- 8 personas (visitor, client, two freelancers, a "both" member, an empty account, a not-onboarded account, an arbitrator, an admin) × every route × desktop (1440) and phone (390): 118 captures, with horizontal overflow and console errors recorded for each.
- Loading, error and not-found states were reviewed in code (`loading.tsx`, `error.tsx`, `not-found.tsx`, component states).

## Map of the product

| Area | Routes | Key components | Financial states shown |
|---|---|---|---|
| Public | `/`, `/work`, `/projects/[id]`, `/u/[username]`, `/search` | Landing sections, project card, trust signals | Budget, client funding history |
| Auth | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/onboarding` | Split auth layout, 8-step onboarding | — |
| Home | `/dashboard` | Next-action banners, contract rows, side panels | Funds secured, earned |
| Projects | `/projects`, `/projects/new`, `/projects/[id]/edit`, `/apply`, `/proposals` | 9-step wizard, proposal composer, comparison table + cards | Budget, proposal totals, milestone split |
| Contracts | `/contracts`, `/contracts/[id]` (+ tabs) | Next-action banner, sign panel, milestone cards, escrow panel, transactions, activity, review | Not funded, secured, under review, changes requested, approved, released, disputed, refunded, settled |
| Messages | `/messages`, `/messages/[id]` | Conversation list, thread, composer | — |
| Notifications | `/notifications` | Category tabs, feed | Payment and escrow events |
| Disputes | `/disputes`, `/disputes/new`, `/disputes/[id]` | 5-step wizard, statements, evidence, chat, decision, on-chain card, audit trail | Frozen amount, requested split, decided split, settlement |
| Arbitration | `/arbitration`, `/arbitration/cases/[id]` | Eligibility, availability, case room, decision panel | Split preview |
| Wallet | `/wallet` | Verified wallet, device wallet, client/freelancer totals, transactions | All |
| Settings | `/settings/*` | Profile, portfolio, account, notification preferences | — |
| Admin | `/admin` | Attention queue, settlements, applications | Settlement split |

Repeated patterns: page header (eyebrow + serif title + description), bordered "panel" boxes (132 uses), callout banners (49), empty states (34), status badges (63), money figures (57). Navigation: left sidebar with 7 primary + 3 secondary items, top bar with search, "Post a project", bell and avatar; phone tab bar with 4 tabs + "More".

## Findings

### What works
- Every state has a label, icon and explanation; money always carries its unit; no fake data or raw colours anywhere; every page has empty and error handling; no console errors.
- The money flow itself is clear once inside a contract: deposits, releases and settlements show verified transaction hashes.

### Problems

| # | Problem | Where | Effect |
|---|---|---|---|
| 1 | **Everything is a box.** Boxes inside sections inside boxes; 132 bordered panels | Every page | Looks like a generic SaaS template; no hierarchy between important and incidental content |
| 2 | **Next actions are oversized banners** with a repeated "YOUR MOVE / Go →" frame; the contract they belong to is a 12 px grey caption | Dashboard, contract | The most important list on the site is the hardest to scan |
| 3 | **The money story is not visible at a glance.** Contracts show one total and an empty progress bar; the secured/released/disputed split hides in a side panel whose labels wrap | Contracts list, contract, dashboard | Users cannot answer "where is my money?" without opening and reading |
| 4 | **Duplicate alerts** — a dispute shows two red banners saying the same thing | Contract | Alarm fatigue |
| 5 | **Every funded milestone shows three full-width actions** (submit, return funds, dispute) at once | Contract, phone | Noisy; risky actions sit next to the primary one |
| 6 | **Navigation highlights the wrong section** — a freelancer reading a project from Find work sees "Proposals" active | Project pages | Users lose their place |
| 7 | **Sidebar costs 240 px** for 7 links, pushing content into a narrow column with a second right rail | Desktop | Cramped content, wasted space |
| 8 | **Notifications overflow on phones by 435 px** (category tabs), each row carries a redundant "Info" chip and three icons, no grouping by day | Notifications | Broken on mobile; noisy |
| 9 | **Empty accounts see five empty boxes** and "No matching projects" even when relevant open work exists | Dashboard (new member) | First impression is a dead end |
| 10 | **Trust signals list negatives** ("No funded contracts yet", "No reviews yet") on every card | Discovery, proposals | Visual noise that reads like warnings |
| 11 | **Money on phones is at the bottom** of the contract page, after every milestone | Contract, phone | The key financial state is the last thing seen |
| 12 | **System messages count as unread conversations** | Messages | Inflated unread counts |
| 13 | Minor: "— → 15 Dec 2026" timeline text; "Your open projects" lists drafts; dashboard shows two "Post a project" buttons | Project, dashboard | Polish |

## Design direction: "the ledger"

TrustLance should feel like a well-made financial statement — calm paper, precise ink, hairline rules, exact numbers and clear stamps of state — not a dashboard of cards.

1. **Rules, not boxes.** Content sits on the page and is organised by hairline rules, whitespace and type. A box is used only for (a) the escrow statement, (b) things you open (dialogs, sheets) and (c) inputs. At most one level of containment.
2. **The escrow rail** is TrustLance's signature element: a horizontal bar split into one segment per milestone, each coloured and textured by its money state (released, secured, under review, approved, disputed, refunded, not funded). It appears wherever a contract or proposal appears, so the money story is visible everywhere at a glance. It always has a text equivalent.
3. **The milestone spine.** Inside a contract, milestones form a vertical timeline. Only the milestone that needs attention shows its primary action; secondary and risky actions move into a "More" menu.
4. **One next action, said once.** Each page answers "what do I do next?" in a single compact line with one button. Alerts are never duplicated.
5. **Statements, not stats.** Money summaries read as a statement: total, secured, released, refunded, in dispute — tabular figures, aligned, with the rail on top.
6. **Only verified positives as trust signals.** Show what is true ("Wallet verified · 3 contracts funded · 5.0 from 1 review"); collapse the absence of facts into one quiet "New to TrustLance".
7. **Typography.** Fraunces only for page titles and the landing page; Geist for everything else; money in large tabular Geist with a small-caps unit; section labels in small caps.

## Information architecture

- **Top navigation replaces the sidebar.** Primary: Home · Find work (members who work) · Projects · Contracts · Messages. Right side: search, wallet chip (verification state and funds in escrow), notifications, account menu.
- **Disputes live under Contracts** (Contracts · Disputes sub-navigation), because every dispute belongs to a contract.
- **Account menu:** public profile, wallet, settings, arbitration, admin (admins only), theme, sign out.
- **Phone:** tab bar Home · Find work/Projects · Contracts · Messages · Wallet; the account menu opens from the avatar.
- **Pages declare their section**, so a project opened from Find work keeps "Find work" active.

## Page decisions

| Page | Decision |
|---|---|
| Home | "Next up" ledger of actions (contract name first, one button each) → contracts with rails → money statement → deadlines and recent activity as plain lists. New members get a "Get started" checklist and live projects instead of empty boxes. |
| Find work | Search field and category chips on top; filters in a collapsible column (sheet on phones); projects as ledger rows with budget, milestone rail and verified client facts. |
| Project | Reads like a brief: summary, scope, numbered deliverables, milestone plan with rail. A sticky "terms" column holds budget, timeline, the primary action and client facts. |
| Proposals | Side-by-side comparison with each proposal's milestone rail; details expand inline. |
| Contracts | Contracts · Disputes sub-nav; each row shows status, counterpart, rail and the next action. |
| Contract | Header with parties and the escrow statement (rail + figures); one next-action line; milestone spine; tabs for agreement, transactions and activity. On phones the statement comes first and the current action sticks to the bottom. |
| Notifications | Grouped by day, quiet rows, category filter that scrolls inside its own strip. |
| Wallet | Statement layout: verified wallet, money as client and as freelancer, transactions. |
