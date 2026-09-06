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
- **Profile**: ₹1.10L/mo salary, 780 CIBIL, ₹14k existing car EMI, ₹28k rent. Seeking ₹8L personal loan.
- **Engine Behavior**:
  - Full salary verified with 0% discount.
  - FOIR stays at a comfortable 27% (well below the 45% safe cap).
  - Clear **Borrow** verdict.
  - Safe carry capacity (₹14.5L+) easily covers requested ₹8L.
  - Quoted fair rate band of **10.50% – 13.00%** (APR ~11.5%–14.2% with fees).

### 2. Ravi (Kirana Store Owner, Mysuru)
- **Profile**: Stated cash income ₹40k–₹80k, ITR ₹4.2L/yr, unencumbered ₹45L shop premises, no credit score, seeking ₹15L for inventory & vehicle.
- **Engine Behavior**:
  - Lender discounts stated cash income and utilizes ITR figure (₹35,000/mo).
  - An unsecured business loan of ₹15L over 3 years would explode FOIR to >90%.
  - **The Copilot detects his ₹45L collateral and routes him to compare Loan Against Property (LAP) / Secured Business Loan**.
  - Over a 10-year LAP tenure at 10% interest, EMI drops to ~₹19,800/mo.
  - Factoring in ₹7,500/mo stressed productive income from the second stock line, his safe EMI capacity covers the loan.
  - Verdict: **Borrow** with strict advice to avoid expensive unsecured business credit.

### 3. Anita (Informal Earner, Hubballi)
- **Profile**: Delivery rider + home tailoring, ₹26k–₹30k/mo, 3 app loans totaling ₹35k at 30%+, 1 bounced EMI, 0 savings. Wants ₹1.5L for an e-scooter.
- **Engine Behavior**:
  - 50% discount on informal cash income.
  - High-cost debt detection triggers: existing debt exceeds 24% and borrower has a recent bounce.
  - **Hard "Don't borrow yet" verdict fires**.
  - The Copilot issues an actionable **Debt-First Recommendation**: Clear or restructure the 30% app loans first. Suggests alternative lower-rate channels (e.g. self-help groups, employer advance, or gold loan) rather than taking another predatory micro-loan.

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
