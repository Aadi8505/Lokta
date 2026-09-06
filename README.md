# Lokta — Borrower Copilot

A personal assistant that helps an Indian borrower answer four critical questions **before** walking into a lender:
1. **Should I borrow at all?** (Borrow / Borrow Less / Don't Borrow)
2. **How much am I really eligible for?** (Lender likely sanction vs Safe carry capacity)
3. **What is a fair rate for me?** (Nominal rate band, processing fee, and true IRR-based APR)
4. **What EMI should I agree to?** (Safe EMI ceiling with expenses, emergency savings buffer & stress tests)
5. **Negotiation Card**: A one-page exportable/printable dossier to level the playing field against loan sales agents.

---

## ⚡ Quick Start (< 2 minutes)

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Run engine test suite (67 unit tests)
npm test
```

App runs on `http://localhost:5173`. No backend, no login, no bureau pull needed.

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

## 🧪 Built-in Borrower Personas for Testing

### 1. Priya Sharma (Salaried Tech Professional, Bengaluru)
- **Goal**: ₹8,00,000 Personal Loan for wedding
- **Profile**: ₹1,15,000/mo salary, 780 CIBIL, ₹15,000 existing EMI, ₹40,000 expenses, 6 months emergency savings.
- **Expected Outcome**: Clear **Borrow** verdict, ₹8L fully covered by safe carry (₹14.5L+ safe), ~10.5%–12.5% rate band.

### 2. Ravi Kumar (Kirana Store Owner, Mysuru)
- **Goal**: ₹15,00,000 Business Loan for shop expansion
- **Profile**: Self-employed, ₹40k–₹80k monthly income, ₹4.2L annual ITR, ₹45,00,000 property collateral available, unknown credit score, 4 months savings.
- **Expected Outcome**: **Borrow** (or Borrow Less under unsecured alone) with recommendation to **compare secured business financing / LAP** over expensive unsecured credit; safe carry considers productive income boost.

### 3. Anita Devi (Home Tailoring Business, Hubballi)
- **Goal**: ₹1,50,000 Two-Wheeler / Personal Loan
- **Profile**: Informal cash income ₹26k–₹30k, ₹35,000 existing loan at 30% interest, 1 bounced EMI, 0 savings.
- **Expected Outcome**: Strong **Don't borrow yet** verdict with an actionable **Debt-First Recommendation** to clear/restructure the 30% high-cost loan and avoid debt trap.
