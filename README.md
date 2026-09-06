# Lokta — Borrower Copilot

A personal assistant that helps an Indian borrower answer four critical questions **before** walking into a lender:
1. **Should I borrow at all?** (Borrow / Borrow Less / Don't Borrow)
2. **How much am I really eligible for?** (Lender likely sanction vs Safe carry capacity)
3. **What is a fair rate for me?** (Nominal rate band, processing fee, and true IRR-based APR)
4. **What EMI should I agree to?** (Safe EMI ceiling with expenses, emergency savings buffer & stress tests)
5. **Negotiation Card**: A one-page exportable/printable dossier to level the playing field against loan sales agents.

---

## 📦 Challenge Deliverables (At Root)

All four requested deliverables are available at the root of this repository:

| # | Deliverable | Location | Description |
|---|---|---|---|
| **1** | **The Working App** | `src/` | Pure client-side Vite + React + TypeScript web app. No backend, no bureau pull. Setup in <2 min. |
| **2** | **RULES.md** | [`RULES.md`](./RULES.md) | Comprehensive table documenting every lending rule, threshold, band, and source. |
| **3** | **Three Run-Throughs** | [`run-throughs/`](./run-throughs/) | Step-by-step questions, 4 outputs, and Negotiation Cards for [Priya](./run-throughs/priya.md), [Ravi](./run-throughs/ravi.md), and [Anita](./run-throughs/anita.md). |
| **4** | **5-Minute Walkthrough** | [`WALKTHROUGH.md`](./WALKTHROUGH.md) | Written walkthrough: domain reasoning, architecture, what we would build next, and what we would cut. |

---

## ⚡ Quick Start (< 2 minutes)

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Run engine test suite (67 unit tests)
npm test

# Typecheck build
npx tsc -b
```

The application runs locally on `http://localhost:5173`. No backend, no login, no bureau pull required.

---

## 🧱 Architecture & Single Source of Truth

- **`src/engine/rules.ts`**: **Single source of truth** for all thresholds, rate grids, FOIR caps, product constraints, fee ranges, stress assumptions, and confidence penalties.
- **`RULES.md`**: Human-readable documentation for every rule with rationale and regulatory/market sources.
- **`src/engine/affordability.ts`**: Effective income logic (ITR for self-employed, discounts for informal), safe EMI calculation using actual emergency savings buffer, and stress testing.
- **`src/engine/rateEngine.ts`**: Rate band calculations and **true APR via IRR on monthly cash flows** (incorporating processing fees and net loan disbursement).
- **`src/engine/verdict.ts`**: Objective rules-driven decision engine (`borrow`, `borrow_less`, `dont_borrow`) with actionable debt-first recommendations for high-cost debt.
- **`src/engine/eligibility.ts`**: Product filtering, secured comparison (LAP vs unsecured business), and LTV caps.
- **`src/engine/confidence.ts`**: Output-specific confidence scoring based on data completeness and impact.

---

## 🧪 Verified Borrower Personas

### 1. [Priya (Salaried Tech Professional, Bengaluru)](./run-throughs/priya.md)
- **Goal**: ₹8,00,000 Home Renovation / Personal Loan
- **Profile**: ₹1,50,000/mo salary, 760+ CIBIL, ₹15,000 existing EMI, ₹45,000 expenses, 6 months emergency savings.
- **Outcome**: Clear **`✓ Go ahead and borrow`** verdict, ₹8L fully covered by safe carry (₹17.5L – ₹32.5L), 10.3%–12.8% prime rate band.

### 2. [Ravi (Kirana Store Owner, Mysuru)](./run-throughs/ravi.md)
- **Goal**: ₹15,00,000 Business Loan for shop expansion
- **Profile**: Self-employed, ₹60,000/mo stated income, ₹4.2L annual ITR, ₹45,00,000 property collateral, unknown credit score, 4 months savings.
- **Outcome**: **`⚠ Consider borrowing less`** with recommendation to **compare Loan Against Property (LAP)** over expensive unsecured credit; safe carry covers ₹15L while keeping EMI resilient.

### 3. [Anita (Informal Earner, Hubballi)](./run-throughs/anita.md)
- **Goal**: ₹30,000 Emergency Loan
- **Profile**: Informal cash income ₹28,000/mo, ₹11,500 existing EMIs (41% FOIR) at 36% interest, 1 bounced EMI, 0 savings.
- **Outcome**: Strong **`✗ Don't borrow right now`** verdict with an actionable **Debt-First Recommendation** against predatory 30%+ digital lending apps.
