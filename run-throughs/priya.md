# Run-Through: Priya Sharma

**Profile**: 29, Salaried Tech Professional, Bengaluru  
**Goal**: ₹8,00,000 Personal Loan for wedding expenses  

---

## 1. Questions Asked & Answers Given

### Must Questions (Tier 1: Core Financial Profile)
| # | Question Prompt | Answer Given | Engine Implication |
|---|---|---|---|
| 1 | What do you need the loan for? | **Wedding / Family event** | Maps to Personal Loan product |
| 2 | How much do you want to borrow? | **₹8,00,000** | Sets requested principal |
| 3 | What type of income do you earn? | **Salaried** | Full income recognized (1.0 factor, no haircut) |
| 4 | What is your net monthly income? | **₹1,10,000** | Baseline for FOIR calculation |
| 5 | What is your total monthly existing EMI outflow? | **₹14,000** | Existing car loan obligation (12.7% baseline FOIR) |
| 6 | What are your monthly household expenses? | **₹40,000** | Used for safe carry calculation (rent ₹28k + living) |
| 7 | How old are you? | **29** | Max tenure available up to retirement (31 years left) |
| 8 | What is your credit score (CIBIL)? | **780** | Prime tier (750+), unlocks lowest base rate band |

### Additional Questions (Tier 2: Range Refinement)
*(Note: Every question below has a **"Skip this question →"** button. You can also click **"Skip remaining & Show Results →"** at any point!)*

| # | Question Prompt | Answer Given / Action | Engine Implication |
|---|---|---|---|
| 9 | How many years have you been in your current job? | **5** | Tenure stability benefit (-50 bps rate discount) |
| 10 | Do you own any property or gold you could offer as collateral? | **No** (or *Skip*) | Unsecured personal loan; no collateral pledged |
| 11 | How many EMI payments have bounced in the last 12 months? | **0** | Clean repayment track record, zero bounce penalty |
| 12 | What is the interest rate on your most expensive existing loan? | **8.5** (Car loan) | Prime car loan rate; does not trigger high-cost debt warning |
| 13 | How many months of expenses could you cover from savings? | **6** | Exceptional emergency buffer, drops buffer requirement to 5% |
| 14 | How many dependents do you support? | **0** (or *Skip*) | No dependent load pressure on cash flow |
| 15 | Can someone co-apply with you? | **No** (or *Skip*) | Single applicant assessment |
| 16 | Do you have any large expenses coming up in next 12 months? | **No** (or *Skip*) | Uninterrupted monthly debt servicing surplus |
| 17 | Have you already received a loan offer from a lender? | **No** (or *Skip*) | Generates baseline market negotiation range |

---

## 2. Four Outputs Produced

### O1: Verdict
- **Decision**: **`Borrow` (Clear to borrow)**
- **Reason**: *"Your total EMI stays at 27% of income — well within comfortable limits."*
- **Supporting Reasons**:
  - Net monthly surplus after existing EMIs and living expenses exceeds ₹50,000.
  - 6 months emergency savings provides an exceptional safety buffer against job disruption.
  - Clean credit score (780) ensures high likelihood of bank approval at prime terms.

### O2: Maximum Amount
- **Lender Likely Sanction**: **₹18,50,000 – ₹22,00,000** (Driven by 55% lender FOIR cap)
- **Borrower Safe Carry**: **₹14,20,000 – ₹16,80,000** (Driven by actual living costs + savings buffer)
- **Recommendation**: **Use Safe Carry**.
- **Rule Insight**: Even though banks will happily sanction up to ₹22L, Priya should limit total borrowing to ₹16.8L to maintain her current lifestyle and savings rate. Her requested ₹8L is well within safe carry.

### O3: Fair Interest Rate & True APR
- **Nominal Rate Band**: **10.50% – 12.50%**
- **True APR (IRR on cash flows)**: **11.45% – 13.68%** (incorporates 1.0%–2.0% processing fee)
- **Fee Expectation**: Max processing fee should not exceed 1.5% (approx. ₹12,000).

### O4: Safe EMI Ceiling & Stress Test
- **Safe EMI Ceiling**: **₹31,500 / month**
- **Recommended Tenure**: **36 months** (Expected EMI: ₹26,000 – ₹26,800/mo)
- **Stress Test**:
  - **Rate rise (+200 bps)**: EMI rises to ₹26,820/mo — still comfortably below the ₹31,500 ceiling.
  - **Income shock (-20% drop)**: Monthly surplus remains positive; EMI remains fully serviceable.

---

## 3. Negotiation Card

```
┌─────────────────────────────────────────────────────────────────┐
│                    LOKTA NEGOTIATION CARD                       │
│  Borrower: Priya Sharma (Salaried · CIBIL 780+)                 │
├─────────────────────────────────────────────────────────────────┤
│  VERDICT: BORROW — Strong profile, high leverage                │
│  REQUESTED: ₹8,00,000   |   SAFE LIMIT: ₹14,50,000              │
├─────────────────────────────────────────────────────────────────┤
│  FAIR RATE: 10.50% – 12.50% (True APR: 11.45% – 13.68%)        │
│  TARGET EMI: ₹26,000 – ₹26,800 / month (36 months)              │
│  MAX EMI CEILING: Do not agree to an EMI above ₹31,500          │
├─────────────────────────────────────────────────────────────────┤
│  NEGOTIATION SCRIPTS FOR THE BRANCH:                            │
│  1. "My CIBIL is 780 and I have 5 years at my current employer; │
│     I qualify for your prime rate band (10.5% - 11.5%)."        │
│  2. "Cap processing fee at 1.0% (₹8,000). Do not bundle loan    │
│     insurance into the sanctioned principal."                   │
│  3. "Confirm zero prepayment penalty after 12 months."          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. UI Screenshots

*(Screenshots can be added here)*
- `[Screenshot 1: Core Questions Flow]`
- `[Screenshot 2: Dashboard Results & Stress Test]`
- `[Screenshot 3: Branch Negotiation Card]`
