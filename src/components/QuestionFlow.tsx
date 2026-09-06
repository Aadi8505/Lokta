/**
 * QuestionFlow.tsx — Adaptive questionnaire in an executive split card layout.
 *
 * Left column: Question and interactive inputs.
 * Right column: Copilot insights on why lenders evaluate this metric & affected outputs.
 */

import { useState, useCallback, useEffect } from 'react';
import { useBorrower } from '../context/BorrowerContext';
import { getVisibleQuestions, getProgress } from '../engine/questions';
import { runAssessment } from '../engine/assessment';
import type { QuestionDefinition, BorrowerAnswers } from '../engine/types';

interface Props {
  tier: 'must' | 'additional';
}

const COPILOT_INSIGHTS: Record<string, { title: string; text: string }> = {
  loanPurpose: {
    title: 'Product Rate Differentials',
    text: 'Loan products vary drastically in cost. Home renovation loans (8.5–10%) or secured LAP (9–11.5%) have far lower risk premiums than unsecured personal loans (12–18%). Choosing the right category can save lakhs in interest.',
  },
  amountWanted: {
    title: 'FOIR & Capacity Thresholds',
    text: 'Lenders evaluate whether your requested principal causes monthly debt servicing to breach 40–50% of net income (FOIR). We calculate your safe debt ceiling first.',
  },
  monthlyIncome: {
    title: 'Net Debt-Servicing Baseline',
    text: 'Your regular take-home pay sets your legal borrowing ceiling. Lenders apply conservative haircuts if income is undocumented or informal.',
  },
  incomeType: {
    title: 'Employment Risk Premiums',
    text: 'Salaried employees receive prime rates. Self-employed income is pegged to ITR with a 15–25% discount, while informal cash earners face up to 40% haircuts due to lack of verifiable trail.',
  },
  existingEmis: {
    title: 'Fixed Obligation (FOIR) Cap',
    text: 'Every rupee of existing EMI directly cuts into your new borrowing capacity. When existing obligations exceed 40% of income, lenders frequently reject or demand co-borrowers.',
  },
  monthlyExpenses: {
    title: 'Living Buffer & Safe Carry',
    text: 'Lenders push loans up to 50% of income regardless of your rent, school fees, or household costs. We verify your cash margin so loan servicing never starves essentials.',
  },
  age: {
    title: 'Max Tenure & Monthly Burden',
    text: 'Lenders cap loan tenure at retirement age (usually 58–60 for salaried, 65 for business). Shorter tenures compress repayment and push monthly EMIs higher.',
  },
  creditScore: {
    title: 'The CIBIL Pricing Grid',
    text: 'Scores 750+ unlock prime rate slabs (8.5–10.5%). Scores below 700 or unknown bureau files trigger 200–500 bps risk markups from banks and NBFCs.',
  },
  incomeVariability: {
    title: 'Cash Flow Volatility Buffer',
    text: 'Irregular income requires larger emergency savings (at least 6 months) so a sudden dry spell does not cause bank bounces and compounding penalties.',
  },
  incomeRangeLow: {
    title: 'Worst-Month Stress Testing',
    text: 'We benchmark your safe EMI against your leanest month—not your peak month—ensuring you never face default stress during seasonal downturns.',
  },
  yearsInJob: {
    title: 'Stability Requirement',
    text: 'Lenders look for at least 1–2 years of continuous employment or trade continuity. Higher stability lowers the perceived attrition risk.',
  },
  itrFiled: {
    title: 'Verifiable Tax Records',
    text: 'Mainstream banks require 2–3 years of filed ITRs. Without ITR, borrowers are often pushed to higher-cost NBFCs or micro-lenders.',
  },
  collateralAvailable: {
    title: 'Collateral Power (Secured vs Unsecured)',
    text: 'Offering property or gold drops default risk to near zero for the lender, cutting interest rates from 18–24% down to 9–11%.',
  },
  emergencySavingsMonths: {
    title: 'Default Shock Absorber',
    text: 'Having under 1 month of living expenses in emergency savings is the #1 predictor of early loan default. We strongly advise building a buffer before borrowing.',
  },
  existingDebtRate: {
    title: 'High-Cost Debt Spiral',
    text: 'Instant loan apps and revolving credit cards charge 36–48% APR. Paying these off first is mathematically superior to taking new loans.',
  },
  offeredRate: {
    title: 'True APR vs Nominal Rate',
    text: 'Processing fees (1–3%) and documentation charges make the actual IRR significantly higher than the advertised rate. We solve for true IRR.',
  },
};

const OUTPUT_LABELS: Record<string, string> = {
  verdict: 'O1: Verdict',
  eligibility: 'O2: Capacity',
  rate: 'O3: Fair Rate',
  emi: 'O4: Safe EMI',
};

export function QuestionFlow({ tier }: Props) {
  const { state, dispatch } = useBorrower();
  const { answers } = state;

  const visibleQuestions = getVisibleQuestions(answers, tier);
  const progress = getProgress(answers, tier);

  // Find the next unanswered question
  const currentIndex = visibleQuestions.findIndex(q => {
    const val = (answers as Record<string, unknown>)[q.field];
    return val === undefined || val === null;
  });

  const question = currentIndex >= 0 ? visibleQuestions[currentIndex] : null;

  // If no more questions, navigate forward
  useEffect(() => {
    if (!question) {
      if (tier === 'must') {
        dispatch({ type: 'SET_SCREEN', screen: 'must_results_preview' });
      } else {
        const assessment = runAssessment(answers);
        dispatch({ type: 'SET_ASSESSMENT', assessment });
        dispatch({ type: 'SET_SCREEN', screen: 'results' });
      }
    }
  }, [question, tier, dispatch, answers]);

  if (!question) return null;

  const questionText = typeof question.question === 'function'
    ? (question.question as (a: BorrowerAnswers) => string)(answers)
    : question.question;

  const insight = COPILOT_INSIGHTS[question.id] || {
    title: 'Borrower Risk Factor',
    text: 'This parameter helps calibrate your safe debt ceiling against RBI FOIR guidelines and lender credit risk models.',
  };

  return (
    <div className="questionnaire-wrapper">
      <div className="questionnaire-card">
        {/* Header with progress */}
        <div className="questionnaire-card__header no-print">
          <div className="questionnaire-card__header-left">
            <span className="questionnaire-card__tier-badge">
              {tier === 'must' ? 'STEP 1: CORE PROFILE' : 'STEP 2: RANGE REFINEMENT'}
            </span>
            <span className="questionnaire-card__counter">
              Question {progress.answered + 1} of {progress.total}
            </span>
          </div>

          <div className="questionnaire-card__progress-track">
            <div
              className="questionnaire-card__progress-fill"
              style={{ width: `${(progress.answered / Math.max(progress.total, 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* 2-Column Split Layout */}
        <div className="questionnaire-card__split">
          {/* Left Column: Question & Interactive Input */}
          <div className="questionnaire-card__left">
            <div className="questionnaire-card__title-area">
              <h1 className="questionnaire__question">{questionText}</h1>
              {question.subtitle && (
                <p className="questionnaire__subtitle">{question.subtitle}</p>
              )}
            </div>

            <div className="questionnaire__input-container">
              <QuestionInput
                key={question.id}
                question={question}
                onAnswer={(value) => {
                  dispatch({ type: 'SET_ANSWER', field: question.field as string, value });
                }}
                onAnswerRange={(low, high) => {
                  dispatch({ type: 'SET_ANSWER', field: 'incomeRangeLow', value: low });
                  dispatch({ type: 'SET_ANSWER', field: 'incomeRangeHigh', value: high });
                }}
              />
            </div>

            {question.skipConsequence && (
              <div className="questionnaire__skip-consequence">
                <span className="questionnaire__skip-icon">⚠</span>
                <span><strong>Impact of skipping:</strong> {question.skipConsequence}</span>
              </div>
            )}
          </div>

          {/* Right Column: Copilot Insights & Impact Badges */}
          <div className="questionnaire-card__right">
            <div className="copilot-tip-box">
              <div className="copilot-tip-box__header">
                <span className="copilot-tip-box__icon">💡</span>
                <span className="copilot-tip-box__title">{insight.title}</span>
              </div>
              <p className="copilot-tip-box__text">{insight.text}</p>
            </div>

            <div className="copilot-impact-box">
              <span className="copilot-impact-box__label">AFFECTS OUTPUTS</span>
              <div className="copilot-impact-box__tags">
                {question.affectedOutputs.map(output => (
                  <span key={output} className="output-tag">
                    {OUTPUT_LABELS[output] || output}
                  </span>
                ))}
              </div>
            </div>

            <div className="copilot-privacy-note">
              <span className="privacy-icon">🛡</span>
              <span>Calculated 100% locally. Zero bureau inquiries.</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="questionnaire-card__footer no-print">
          <div>
            {tier === 'additional' && (
              <button
                className="btn btn--secondary"
                onClick={() => {
                  const assessment = runAssessment(answers);
                  dispatch({ type: 'SET_ASSESSMENT', assessment });
                  dispatch({ type: 'SET_SCREEN', screen: 'results' });
                }}
              >
                Skip to Results Dashboard →
              </button>
            )}
          </div>

          <div className="questionnaire-card__footer-right">
            {question.skipConsequence && (
              <button
                className="btn btn--ghost"
                onClick={() => {
                  if (question.field === 'creditScore') {
                    dispatch({ type: 'SET_ANSWER', field: question.field as string, value: 'unknown' });
                  } else {
                    dispatch({ type: 'SET_ANSWER', field: question.field as string, value: undefined });
                    dispatch({ type: 'SKIP_QUESTION' });
                  }
                }}
              >
                I don't know → Skip
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the appropriate input control for a question type.
 */
function QuestionInput({
  question,
  onAnswer,
  onAnswerRange,
}: {
  question: QuestionDefinition;
  onAnswer: (value: unknown) => void;
  onAnswerRange: (low: number, high: number) => void;
}) {
  const [inputValue, setInputValue] = useState('');

  const handleSubmitNumber = useCallback(() => {
    const num = parseFloat(inputValue.replace(/,/g, ''));
    if (!isNaN(num)) {
      onAnswer(num);
    }
  }, [inputValue, onAnswer]);

  switch (question.type) {
    case 'select':
      return (
        <div className="option-list">
          {question.options?.map(opt => (
            <button
              key={opt.value}
              className="option-btn"
              id={`option-${question.id}-${opt.value}`}
              onClick={() => onAnswer(opt.value)}
            >
              <span className="option-btn__title">{opt.label}</span>
              {opt.description && (
                <span className="option-btn__desc">{opt.description}</span>
              )}
            </button>
          ))}
        </div>
      );

    case 'boolean':
      return (
        <div className="boolean-group">
          <button
            className="option-btn"
            id={`option-${question.id}-yes`}
            onClick={() => onAnswer(true)}
          >
            <span className="option-btn__title">Yes</span>
          </button>
          <button
            className="option-btn"
            id={`option-${question.id}-no`}
            onClick={() => onAnswer(false)}
          >
            <span className="option-btn__title">No</span>
          </button>
        </div>
      );

    case 'currency':
      return (
        <div className="input-group">
          <div className="input-wrapper">
            <span className="input-prefix">₹</span>
            <input
              type="text"
              inputMode="numeric"
              className="input input--with-prefix"
              id={`input-${question.id}`}
              placeholder={question.placeholder}
              value={inputValue}
              onChange={e => {
                const raw = e.target.value.replace(/[^\d]/g, '');
                if (raw) {
                  setInputValue(parseInt(raw).toLocaleString('en-IN'));
                } else {
                  setInputValue('');
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSubmitNumber();
              }}
              autoFocus
            />
          </div>
          <button
            className="btn btn--primary btn--full btn--lg"
            disabled={!inputValue}
            onClick={handleSubmitNumber}
          >
            Continue →
          </button>
        </div>
      );

    case 'number':
      return (
        <div className="input-group">
          <div className="input-wrapper">
            <input
              type="text"
              inputMode="numeric"
              className={`input ${question.unit === '%' ? 'input--with-suffix' : ''}`}
              id={`input-${question.id}`}
              placeholder={question.placeholder}
              value={inputValue}
              onChange={e => setInputValue(e.target.value.replace(/[^\d.]/g, ''))}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSubmitNumber();
              }}
              autoFocus
            />
            {question.unit && <span className="input-suffix">{question.unit}</span>}
          </div>
          <button
            className="btn btn--primary btn--full btn--lg"
            disabled={!inputValue}
            onClick={handleSubmitNumber}
          >
            Continue →
          </button>
        </div>
      );

    case 'credit_score':
      return (
        <div className="input-group">
          <div className="input-wrapper">
            <input
              type="text"
              inputMode="numeric"
              className="input"
              id={`input-${question.id}`}
              placeholder={question.placeholder}
              value={inputValue}
              onChange={e => setInputValue(e.target.value.replace(/[^\d]/g, ''))}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSubmitNumber();
              }}
              autoFocus
            />
          </div>
          <button
            className="btn btn--primary btn--full btn--lg"
            disabled={!inputValue}
            onClick={handleSubmitNumber}
          >
            Continue →
          </button>
          <button
            className="btn btn--ghost btn--full"
            onClick={() => onAnswer('unknown')}
          >
            I don't know my credit score
          </button>
        </div>
      );

    case 'range':
      return <RangeInput onAnswerRange={onAnswerRange} />;

    default:
      return null;
  }
}

/**
 * Range input for income variability (low–high).
 */
function RangeInput({
  onAnswerRange,
}: {
  onAnswerRange: (low: number, high: number) => void;
}) {
  const [low, setLow] = useState('');
  const [high, setHigh] = useState('');

  const handleSubmit = () => {
    const lowNum = parseFloat(low.replace(/,/g, ''));
    const highNum = parseFloat(high.replace(/,/g, ''));
    if (!isNaN(lowNum) && !isNaN(highNum) && lowNum <= highNum) {
      onAnswerRange(lowNum, highNum);
    }
  };

  return (
    <div className="input-group">
      <div className="range-inputs-row">
        <div className="input-wrapper" style={{ flex: 1 }}>
          <span className="input-prefix">₹</span>
          <input
            type="text"
            inputMode="numeric"
            className="input input--with-prefix"
            placeholder="Worst month"
            value={low}
            onChange={e => {
              const raw = e.target.value.replace(/[^\d]/g, '');
              setLow(raw ? parseInt(raw).toLocaleString('en-IN') : '');
            }}
            autoFocus
          />
        </div>
        <span className="range-separator">to</span>
        <div className="input-wrapper" style={{ flex: 1 }}>
          <span className="input-prefix">₹</span>
          <input
            type="text"
            inputMode="numeric"
            className="input input--with-prefix"
            placeholder="Best month"
            value={high}
            onChange={e => {
              const raw = e.target.value.replace(/[^\d]/g, '');
              setHigh(raw ? parseInt(raw).toLocaleString('en-IN') : '');
            }}
          />
        </div>
      </div>
      <button
        className="btn btn--primary btn--full btn--lg"
        disabled={!low || !high}
        onClick={handleSubmit}
      >
        Continue →
      </button>
    </div>
  );
}
