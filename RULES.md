# RULES.md — Lokta Borrower Copilot

Every rule, threshold, band, and assumption used in the app. This document is the human-readable mirror of `src/engine/rules.ts`.

## How to read this table

| Column | Meaning |
|--------|---------|
| **What** | The rule or threshold |
| **Value** | The exact number or formula used |
| **Why** | Rationale for this value |
| **Source** | Published source, or "my judgement" if estimated |

---

## 1. FOIR (Fixed Obligations to Income Ratio)

FOIR = (all EMIs + new EMI) ÷ net monthly income. This is the primary affordability test used by Indian lenders.

| What | Value | Why | Source |
|------|-------|-----|--------|
| FOIR cap — salaried (lender) | 55% | Stable, verifiable salary allows higher tolerance | RBI guidelines + SBI/HDFC published norms |
| FOIR cap — salaried (safe) | 45% | Leaves 55% of income for expenses + savings | My judgement — industry best practice |
| FOIR cap — self-employed (lender) | 50% | More variable income, lenders apply tighter cap | BankBazaar aggregated data |
| FOIR cap — self-employed (safe) | 40% | Conservative to absorb income swings | My judgement |
| FOIR cap — informal (lender) | 40% | Hardest to verify; lenders heavily discount | My judgement — limited formal data |
| FOIR cap — informal (safe) | 30% | Must survive volatile months | My judgement |
| FOIR hard ceiling (don't borrow) | 75% | Beyond this, no household budget is sustainable | My judgement — universal distress threshold |
| FOIR warning zone (borrow less) | 60% | Between 60–75%, borrower is stretching | My judgement |

---

## 2. Income Consideration

Lenders do not use stated income at face value for everyone.

| What | Value | Why | Source |
|------|-------|-----|--------|
| Salaried income discount | 1.00 (100%) | Salary slips verifiable; lender uses full amount | Industry standard |
| Self-employed income discount (no ITR) | 0.75 (75%) | Without tax documentation, lender discounts stated income | BankBazaar, CIBIL lending guidelines |
| Self-employed income (with ITR) | ITR figure / 12 | Lenders prefer documented income; ITR overrides stated | Industry standard |
| Informal income discount | 0.50 (50%) | Cash income is unverifiable; heavy discounting by lenders | My judgement — based on microfinance norms |
| Variable income: lender uses | Lower end of range | Conservative approach to protect lender | Industry standard |
| Variable income: safe-carry uses | Midpoint of range | Balance between conservative and realistic | My judgement |

---

## 3. Interest Rate Grid

Rates by product × credit score band. Self-employed and informal pay an income-type premium on top.

### 3a. Base Rate Bands (Annual %)

| Product | Score 750+ | 700–749 | 650–699 | Below 650 | Unknown |
|---------|-----------|---------|---------|-----------|---------|
| Personal | 10.5–13.0 | 13.0–16.0 | 16.0–20.0 | 20.0–26.0 | 12.0–22.0 |
| Home | 8.5–9.5 | 9.5–10.5 | 10.5–12.0 | 12.0–14.0 | 9.0–13.0 |
| Loan Against Property (LAP) | 9.0–11.0 | 11.0–13.0 | 13.0–15.5 | 15.0–18.0 | 10.0–16.0 |
| Gold | 9.0–12.0 | 9.0–12.0 | 9.0–12.0 | 9.0–13.0 | 9.0–12.0 |
| Two-wheeler | 12.0–16.0 | 16.0–20.0 | 20.0–24.0 | 24.0–30.0 | 14.0–26.0 |
| Business (unsecured) | 14.0–18.0 | 18.0–22.0 | 22.0–26.0 | 26.0–32.0 | 16.0–28.0 |
| Business (secured) | 10.0–13.0 | 13.0–16.0 | 16.0–19.0 | 19.0–22.0 | 11.0–19.0 |

| What | Value | Why | Source |
|------|-------|-----|--------|
| Source of rate bands | Aggregated from BankBazaar, PaisaBazaar, SBI, HDFC, ICICI published rates | Cross-referenced multiple sources for realistic ranges | BankBazaar.com, PaisaBazaar.com, bank websites (mid-2026) |
| Unknown score band | Widest range, NOT worst case | Unknown ≠ bad. Could be a first-time borrower with no history. Range spans from near-best to near-worst | My judgement — never treat unknown as zero |
| Gold loan rates are score-insensitive | Same range for all scores | Gold loans are fully collateral-backed; credit score has minimal impact | Industry practice |

### 3b. Income-Type Rate Premium

| What | Value | Why | Source |
|------|-------|-----|--------|
| Salaried premium | 0% | Base rate; no adjustment | — |
| Self-employed premium | +1.5% | Higher risk, less verifiable income | BankBazaar aggregated data |
| Informal premium | +3.0% | Highest risk; lenders charge significantly more | My judgement — based on NBFC/MFI rate differentials |

### 3c. Stability Adjustment

| What | Value | Why | Source |
|------|-------|-----|--------|
| Salaried, 5+ years at job | −0.5% | Long tenure = stable, preferred customer | My judgement |
| Salaried, 2+ years at job | −0.25% | Some stability demonstrated | My judgement |
| Self-employed/informal, 10+ years | −1.0% | Proven business longevity | My judgement |
| Self-employed/informal, 5+ years | −0.5% | Moderate stability | My judgement |
| Self-employed/informal, <2 years | +0.5% | New business = higher risk | My judgement |

### 3d. Bounce Penalty

| What | Value | Why | Source |
|------|-------|-----|--------|
| Per bounced EMI (last 12 months) | +1.0% per bounce, max +3.0% | Each bounce signals cash-flow stress; lenders charge more | My judgement — based on CIBIL impact studies |

---

## 4. Processing Fees

| Product | Fee Range (% of principal) | Source |
|---------|---------------------------|--------|
| Personal | 1.5–3.0% | BankBazaar, PaisaBazaar |
| Home | 0.25–1.0% | SBI, HDFC published rates |
| LAP | 0.50–1.5% | BankBazaar |
| Gold | 0.50–1.5% | Muthoot, Manappuram published |
| Two-wheeler | 1.0–2.5% | BankBazaar |
| Business (unsecured) | 1.5–3.0% | My judgement |
| Business (secured) | 0.50–1.5% | My judgement |

---

## 5. APR Calculation

| What | Value | Why | Source |
|------|-------|-----|--------|
| Method | IRR (Internal Rate of Return) on actual cash flows | The naive "nominal + fee/tenure" approximation understates cost. IRR captures the true time-value impact | RBI's all-in-cost disclosure guidelines |
| Cash flow at time 0 | +(Principal − Processing fee) | Borrower receives the net disbursement, not the full principal | Standard practice |
| Cash flows at time 1…n | −EMI each month | Monthly repayment | Standard EMI |
| Solver | Newton-Raphson iteration, 100 max iterations, 1e-10 convergence | Standard numerical method for IRR | Textbook |

---

## 6. Product Configuration

| Product | Min Tenure | Max Tenure | Min Amount | Max Amount | Secured? | Max LTV |
|---------|-----------|-----------|-----------|-----------|----------|---------|
| Personal | 12 months | 60 months | ₹50,000 | ₹25,00,000 | No | — |
| Home | 60 months | 360 months | ₹5,00,000 | ₹5,00,00,000 | Yes | 80% |
| LAP | 36 months | 180 months | ₹3,00,000 | ₹5,00,00,000 | Yes | 60% |
| Gold | 3 months | 36 months | ₹10,000 | ₹50,00,000 | Yes | 75% |
| Two-wheeler | 12 months | 48 months | ₹25,000 | ₹3,00,000 | Yes | 85% |
| Business (unsecured) | 12 months | 60 months | ₹1,00,000 | ₹50,00,000 | No | — |
| Business (secured) | 36 months | 180 months | ₹1,00,000 | ₹5,00,00,000 | Yes | 60% |

| What | Value | Why | Source |
|------|-------|-----|--------|
| LTV for LAP/business secured | 60% | Conservative; most lenders offer 50–65% | SBI, HDFC LAP terms |
| LTV for home | 80% | RBI guideline | RBI circular on home loan LTV |
| LTV for gold | 75% | RBI maximum for gold loans | RBI circular Aug 2020, reaffirmed |
| Max tenure adjusted for age | Min(product max, (60 − age) × 12) | Loan should end before retirement at 60 | Industry practice |

---

## 7. Verdict Rules (Borrow / Don't / Borrow Less)

### "Don't Borrow" triggers

| What | Condition | Why | Source |
|------|-----------|-----|--------|
| FOIR hard ceiling | Projected FOIR > 75% | Unsustainable debt burden | My judgement |
| High-cost debt + bounce | Existing debt at 20%+ AND bounced EMI in last 12 months | Already in distress; more debt worsens the cycle | My judgement |
| Multiple bounces + unsecured | 2+ bounces AND seeking unsecured loan | Cash-flow stress is chronic; lenders will reject anyway | My judgement |
| No savings + no collateral + high FOIR | Savings < 1 month AND no collateral AND current FOIR > 40% | Zero safety net; any shock causes default | My judgement |
| Zero safe EMI headroom | Safe EMI ceiling ≤ 0 after expenses and obligations | Literally no money left for new EMI | Arithmetic |

### "Borrow Less" triggers

| What | Condition | Why | Source |
|------|-----------|-----|--------|
| FOIR warning zone | Projected FOIR between 60–75% | Manageable but risky | My judgement |
| Amount exceeds safe carry | Requested > safe-carry amount (with 10% tolerance) | Lender may approve, but expenses say you can't handle it | My judgement |
| Low savings | Savings < 2 months of expenses | Insufficient buffer for emergencies | My judgement |
| Stressed EMI unaffordable | EMI > stressed safe ceiling (income −20%) | Not resilient to income shocks | My judgement |
| Single bounce | 1 bounced EMI in last year | Occasional tightness, not chronic | My judgement |
| High-cost debt, no bounce | Existing debt at 20%+ without bounces | Should consider refinancing before or alongside new borrowing | My judgement |

### Debt-first recommendation

| What | Condition | Value | Source |
|------|-----------|-------|--------|
| Trigger | Existing rate ≥ 20% AND outstanding ≥ ₹10,000 | Recommends clearing/restructuring high-cost debt first | My judgement |

---

## 8. Emergency Savings

The app uses the borrower's actual savings months, NOT a fixed percentage buffer.

| Savings (months) | Classification | Buffer applied to safe-carry | Why |
|------------------|---------------|------------------------------|-----|
| 6+ months | Strong | 5% of income | Strong savings = minimal additional buffer needed |
| 3–6 months | Adequate | 10% of income | Standard prudent buffer |
| 2–3 months | Low | 15% of income | Higher buffer to compensate for thin savings |
| 0–1 month | Critical | 20% of income | Significant buffer needed; affects verdict |
| Unknown | — | 12% of income | Moderate assumption; app suggests answering for accuracy |

| What | Value | Why | Source |
|------|-------|-----|--------|
| Buffer approach | Graduated by actual savings | Fixed 15% is inaccurate — someone with 12 months savings needs less buffer than someone with 0 | My judgement |
| Unknown ≠ zero | 12% default buffer | Unknown savings is not the same as zero savings; we don't penalise unknowns | My judgement |

---

## 9. Productive Loan Adjustment

When a loan is expected to generate income (business stock, delivery vehicle, etc.).

| What | Value | Why | Source |
|------|-------|-----|--------|
| Income offset factor (normal) | 50% of expected incremental monthly income | Conservative — not all expected income materialises | My judgement |
| Income offset factor (stressed) | 30% of expected incremental income | Under stress, even less materialises | My judgement |
| Effect | Offsets EMI burden in safe-carry calculation | Productive debt is fundamentally different from consumption debt | Lending theory |

---

## 10. Confidence System

Confidence is output-specific, not based on total questions answered.

### Relevant fields per output

| Output | Relevant fields |
|--------|----------------|
| Verdict | monthlyIncome, incomeType, existingEmis, monthlyExpenses, creditScore, emergencySavingsMonths, emiBounces, loanPurpose |
| Eligibility | monthlyIncome, incomeType, existingEmis, creditScore, yearsInJob, itrIncome, collateralValue, coApplicantIncome |
| Rate | creditScore, incomeType, monthlyIncome, yearsInJob, collateralValue, emiBounces |
| EMI | monthlyIncome, existingEmis, monthlyExpenses, emergencySavingsMonths, incomeVariability |

### Confidence levels

| Level | Condition | Range width |
|-------|-----------|-------------|
| High | ≥ 75% of relevant fields known | Narrow |
| Medium | 50–74% known | Moderate widening |
| Low | < 50% known | Wide ranges |

### Unknown field widening

| Unknown field | Affected outputs | Extra widening | Explanation shown to borrower |
|---------------|-----------------|----------------|-------------------------------|
| Credit score | Rate, Eligibility | +15% | "Without a credit score, lenders will quote a wider range. Getting your CIBIL score (₹550 online) could narrow your rate by 3–5%." |
| Emergency savings | Verdict, EMI | +8% | "Without knowing your savings buffer, we assume moderate risk." |
| Monthly expenses | Verdict, EMI | +10% | "Without detailed expenses, we use income-based estimates." |
| Years in job | Eligibility, Rate | +5% | "Job/business tenure affects lender confidence." |
| ITR income | Eligibility | +12% | "Without ITR documentation, lenders will use a lower income figure." |
| Collateral value | Eligibility, Rate | +10% | "If you have property or gold, a secured loan could cut your rate significantly." |
| Income variability | Verdict, EMI | +8% | "Knowing whether your income is stable or seasonal helps set a safer EMI ceiling." |
| Generic unknown | Affected output | +8% per field | Default widening for fields without specific penalty |

---

## 11. Stress Test Parameters

| What | Value | Why | Source |
|------|-------|-----|--------|
| Rate rise scenario | +2.0% (200 bps) | Simulates RBI rate hike cycle; typical tightening cycle is 1.5–2.5% | RBI rate history 2022–2024 |
| Income drop scenario | −20% | Simulates job loss of a month in 5, or business downturn | My judgement — conservative but realistic |

---

## 12. Lender Offer Comparison

| What | Value | Why | Source |
|------|-------|-----|--------|
| Good deal | Offered rate ≤ fair midpoint − 0.5% | Below fair range midpoint by 50+ bps = competitive | My judgement |
| Fair deal | Offered rate ≤ fair midpoint + 1.0% | Within 100 bps of midpoint = reasonable | My judgement |
| Overpaying | Offered rate > fair midpoint + 1.0% | More than 100 bps above midpoint = negotiate | My judgement |
| APR calculation for comparison | Same IRR method as fair rate | Apples-to-apples comparison including fees | Consistency |

---

## 13. Co-Applicant

| What | Value | Why | Source |
|------|-------|-----|--------|
| Co-applicant income weighting | 50% | Not full income — lenders discount non-primary applicant | Industry practice (varies 30–100% by lender) |
| Effect | Added to effective income for eligibility | Boosts eligible amount; does not affect safe-carry (safe-carry uses actual expenses) | Standard practice |

---

## 14. What This App Does NOT Know

| Gap | Consequence | What we do about it |
|-----|-------------|---------------------|
| Actual credit bureau data | Cannot verify score or see trade lines | Accept stated score or widen ranges for unknown |
| Bank statement analysis | Cannot verify real cash flows | Use stated income with appropriate discounts |
| Property valuation | Cannot confirm collateral value | Accept stated value; note it as estimate |
| Specific lender policies | Each bank has its own FOIR/rate grid | Use industry ranges; tell borrower actual may vary |
| Location-specific rates | Removed city-based adjustment (no documented source) | Use national averages; noted in confidence |
| Insurance loading | Do not model loan insurance premiums | Excluded from APR; noted as limitation |
| Prepayment penalties | Not modeled | Included in lender questions on Negotiation Card |
| Tax benefits (Sec 24, 80C) | Not factored into effective cost | Out of scope for self-assessment |

---

## 15. Assumptions About the Three Borrowers

### Priya (Salaried, Bengaluru)
- Treated as salaried with full income consideration
- Credit score 780 → "750+" band → best rates
- Existing EMI ₹14,000 reduces FOIR headroom
- Rent ₹28,000 included in expenses
- Expected verdict: Borrow (comfortable FOIR)
- Product: Personal loan (wedding purpose)

### Ravi (Self-employed, Mysuru)
- Treated as self-employed; ITR income (₹4,20,000/yr = ₹35,000/mo) used for lender eligibility
- No credit score → "unknown" band → wide rate range
- Collateral ₹45,00,000 → LAP and secured business loan offered for **comparison** (not auto-prescribed)
- Wife's income ₹18,000 as co-applicant (50% = ₹9,000 added)
- 14 years in business → strong stability adjustment
- Expected verdict: Borrow (with secured product recommendation for better rate)

### Anita (Informal, Hubballi)
- Treated as informal; income heavily discounted (50%)
- No credit score → "unknown" band + informal premium → wide, high rate range
- Existing app loans at 30%+ with ₹35,000 outstanding → high-cost debt flag
- 1 EMI bounce → compounds with high-cost debt → "Don't borrow" with debt-first recommendation
- Expected verdict: Don't borrow yet — clear existing high-cost debt first
