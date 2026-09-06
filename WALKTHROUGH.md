# WALKTHROUGH.md — Lokta Borrower Copilot

A 5-minute technical and product walkthrough of the Borrower Copilot: design decisions, domain logic, persona trajectories, and future roadmap.

---

## 1. The Core Problem & Philosophy

When an Indian borrower walks into a bank branch or talks to a Direct Selling Agent (DSA), they encounter an extreme information asymmetry:
- **The Lender's Model**: Maximizes credit disbursement, pushes nominal rates that disguise 2–3% processing fees, stretches FOIR (Fixed Obligations to Income Ratio) up to 55–60%, and pushes expensive unsecured personal loans when the borrower could pledge property for LAP at 400 basis points lower.
- **The Borrower's Position**: Walks in blind, accepts the first sanction letter, and discovers years later that they overpaid by points and overcommitted 65% of their net household budget.

**Borrower Copilot is NOT a credit scoring model.** It is a **self-assessment engine** designed to make the borrower the most informed negotiator in the room.

```
┌─────────────────────────────────────────────────────────────┐
│                    Borrower Self-Assessment                 │
│               (No Login · No Bureau Pull · Client-Side)      │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
       Adaptive Questions               Domain Rules Engine
    (10 Must + 14 Additional)             (rules.ts + RULES.md)
               │                               │
               └───────────────┬───────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            │         The 4 Core Outputs          │
            │  O1: Rules-Driven Verdict           │
            │  O2: Lender Sanction vs Safe Carry  │
            │  O3: Fair Rate Band & True APR (IRR)│
            │  O4: Safe EMI Ceiling & Stress Test │
            └──────────────────┬──────────────────┘
                               │
                    The Negotiation Card
            (Branch dossier with leverage & scripts)
```

---

## 2. Key Architecture & Lending Judgment Decisions

### A. Pure TypeScript Rules Engine (`src/engine/`)
All financial logic is strictly separated from UI components:
- Zero React dependencies in `src/engine/`.
- Single source of truth in [`src/engine/rules.ts`](./src/engine/rules.ts), mirrored in human-readable documentation at [`RULES.md`](./RULES.md).
- Instant unit testing with Vitest (67 tests passing in <100ms).

### B. True APR via Cash-Flow IRR
Nominal interest rates deceive borrowers because upfront processing fees (1%–3%) significantly elevate effective borrowing cost. We compute true **Annual Percentage Rate (APR)** using Newton-Raphson internal rate of return (IRR) on net disbursed cash flows:
$$CF_0 = +(Principal - ProcessingFee)$$
$$CF_1 \dots CF_n = -EMI$$
This reveals the real annual cost to the borrower before they sign.

### C. Cash-Flow Safe Carry vs. Lender Sanction (O2)
Lenders evaluate eligibility based solely on gross FOIR (up to 50–55%). In reality, household obligations, living costs, and emergency buffers dictate what can actually be repaid:
- **Lender Likely Sanction**: How much an underwriting algorithm will approve based on stated/ITR income and standard lender FOIR caps.
- **Borrower Safe Carry**: What the borrower can afford after deducting existing EMIs, essential household expenses, and a conservative emergency buffer derived from their actual savings months.
- The app explicitly highlights the lower of the two and explains why.

### D. "Unknown" is Never Zero
Borrowers who do not know their CIBIL score are not treated as subprime (300). Instead:
- Score is mapped to `'unknown'`.
- The rate band widens symmetrically to reflect market dispersion.
- The UI explicitly explains: *"Not knowing your credit score widens your rate band. Checking your score before applying could save you up to 3%."*

---

## 3. How the Engine Solves the Three Borrowers

### 1. Priya (Salaried Techie, Bengaluru)
- **Profile**: ₹1,50,000/mo salary, 760+ CIBIL, ₹15,000 existing EMI, ₹45,000 expenses, 6 months emergency savings. Seeking ₹8,00,000 loan.
- **Engine Behavior**:
  - Full salary verified with 0% discount.
  - FOIR stays at a comfortable 28% (well below the 45% safe cap).
  - Clear **`✓ Go ahead and borrow`** verdict.
  - Safe carry capacity (**₹17.5L – ₹32.5L**) easily covers requested ₹8L.
  - Quoted fair rate band of **10.3% – 12.8%** (True APR 11.3% – 14.9%).
  - Safe EMI ceiling of **₹82,500/mo** with recommended 12-month tenure at ₹70,892/mo.

### 2. Ravi (Kirana Store Owner, Mysuru)
- **Profile**: Stated business income ₹60,000/mo, ITR ₹4,20,000/yr (₹35,000/mo base), unencumbered ₹45,00,000 shop property, unknown credit score, seeking ₹15,00,000 for expansion.
- **Engine Behavior**:
  - Lender uses verified ITR income (₹35,000/mo) with 50% FOIR cap.
  - An unsecured business loan would stretch FOIR to 96% and cap safe carry at ₹13.8L.
  - **The Copilot detects his ₹45L collateral and routes him to compare Loan Against Property (LAP) / Secured Business Loan**.
  - Pledging property unlocks safe carry of **₹18.9L – ₹30.7L**, safely covering his ₹15L goal at 10.5% – 16.5% interest.
  - Verdict: **`⚠ Consider borrowing less`** to maintain safety against lean-season 20% income drops under his ₹34,000/mo safe ceiling.

### 3. Anita (Informal Earner, Hubballi)
- **Profile**: Delivery rider + home tailoring, ₹28,000/mo cash, ₹11,500 existing EMIs (41% FOIR) at 36% interest, 1 bounced EMI, 0 savings. Seeks ₹30,000 emergency loan.
- **Engine Behavior**:
  - 50% discount on informal cash income.
  - High existing obligations (41% FOIR) + zero savings trigger hard stop.
  - **Hard `✗ Don't borrow right now` verdict fires**.
  - Both lender max and safe carry calculate to **₹0**.
  - Lender offer comparison exposes a 30% digital app quote as **+16.5% above fair range** (12%–15%), giving actionable advice to seek non-predatory alternatives (SHG / employer advance) and build a 2–3 month buffer.

---

## 4. What We Would Build Next

1. **Account Aggregator (AA) & CamScanner/PDF Statement Ingestion**:
   - Allow borrowers to securely share 3 months of bank statements via RBI Account Aggregator framework (or upload a PDF statement) to automatically extract average monthly balance, recurring EMIs, and real expenses in 15 seconds.
2. **Sanction Letter OCR & Red-Flag Scanner**:
   - Enable borrowers to snap a photo of a lender's sanction letter. The Copilot extracts the nominal rate, insurance cross-sells, documentation fees, and foreclosure lock-ins, immediately highlighting: *"They quoted 12.5% but added ₹18,000 insurance — your true APR is 16.2%."*
3. **Vernacular & Voice-First Question Flow**:
   - Support Hindi, Kannada, Tamil, and Telugu with voice prompts so informal borrowers like Anita can speak their answers naturally without navigating complex financial form inputs.

---

## 5. What We Would Cut

1. **Granular Dependent & Micro-Expense Breakdown**:
   - When borrowers provide net monthly household expenses directly, asking separate granular questions about dependents, utility splits, and food costs yields diminishing analytical value while increasing form abandonment.
2. **Ultra-Niche Loan Products**:
   - Education loans and consumer durable loans require very specific subsidy and subvention rules (e.g. zero-cost EMIs with manufacturer kickbacks) that are better addressed as specialized add-ons rather than expanding the core general lending grid.
