/**
 * QuestionFlow.tsx — One-question-per-screen adaptive questionnaire.
 *
 * Shows questions filtered by tier and show-conditions.
 * Supports skip with visible consequence. Handles all input types.
 */

import { useState, useEffect, useCallback } from 'react';
import { useBorrower } from '../context/BorrowerContext';
import { getVisibleQuestions, getProgress } from '../engine/questions';
import { runAssessment } from '../engine/assessment';
import type { QuestionDefinition, BorrowerAnswers } from '../engine/types';

interface Props {
  tier: 'must' | 'additional';
}

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

  return (
    <div className="questionnaire">
      <div className="questionnaire__header no-print">
        <div className="questionnaire__header-top">
          <span className="questionnaire__step">
            {tier === 'must' ? 'Core Questions' : 'Refining Questions'}
          </span>
          <span className="questionnaire__step">
            {progress.answered + 1} of {progress.total}
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar__fill"
            style={{ width: `${(progress.answered / Math.max(progress.total, 1)) * 100}%` }}
          />
        </div>
      </div>

      <div className="questionnaire__body">
        <h2 className="questionnaire__question">{questionText}</h2>
        {question.subtitle && (
          <p className="questionnaire__subtitle">{question.subtitle}</p>
        )}

        <QuestionInput
          key={question.id}
          question={question}
          onAnswer={(value) => {
            dispatch({ type: 'SET_ANSWER', field: question.field as string, value });
          }}
        />
      </div>

      <div className="questionnaire__footer no-print">
        {tier === 'additional' && (
          <button
            className="btn btn--secondary"
            onClick={() => {
              const assessment = runAssessment(answers);
              dispatch({ type: 'SET_ASSESSMENT', assessment });
              dispatch({ type: 'SET_SCREEN', screen: 'results' });
            }}
          >
            Show results now
          </button>
        )}
        {question.skipConsequence && (
          <button
            className="btn btn--ghost"
            onClick={() => {
              // For credit score, set to 'unknown'
              if (question.field === 'creditScore') {
                dispatch({ type: 'SET_ANSWER', field: question.field as string, value: 'unknown' });
              } else {
                // Skip by setting a sentinel or moving on
                dispatch({ type: 'SET_ANSWER', field: question.field as string, value: undefined });
                // Force re-render by using a special skip value
                dispatch({ type: 'SKIP_QUESTION' });
              }
            }}
          >
            I don't know → Skip
          </button>
        )}
      </div>

      {question.skipConsequence && (
        <div className="questionnaire__skip-consequence no-print" style={{ padding: '0 var(--space-lg) var(--space-md)' }}>
          ⚠ If you skip: {question.skipConsequence}
        </div>
      )}
    </div>
  );
}

/**
 * Renders the appropriate input control for a question type.
 */
function QuestionInput({
  question,
  onAnswer,
}: {
  question: QuestionDefinition;
  onAnswer: (value: unknown) => void;
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
              {opt.label}
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
            Yes
          </button>
          <button
            className="option-btn"
            id={`option-${question.id}-no`}
            onClick={() => onAnswer(false)}
          >
            No
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
            className="btn btn--primary btn--full"
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
            className="btn btn--primary btn--full"
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
            className="btn btn--primary btn--full"
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
      return <RangeInput onAnswer={onAnswer} />;

    default:
      return null;
  }
}

/**
 * Range input for income variability (low–high).
 */
function RangeInput({
  onAnswer,
}: {
  onAnswer: (value: unknown) => void;
}) {
  const [low, setLow] = useState('');
  const [high, setHigh] = useState('');

  const handleSubmit = () => {
    const lowNum = parseFloat(low.replace(/,/g, ''));
    const highNum = parseFloat(high.replace(/,/g, ''));
    if (!isNaN(lowNum) && !isNaN(highNum) && lowNum <= highNum) {
      // Store both values — onAnswer stores low, we need to dispatch high separately
      onAnswer(lowNum);
      // This is a bit of a hack — we'll handle the high value in the flow
      // by also setting incomeRangeHigh
      window.dispatchEvent(new CustomEvent('lokta:range-high', {
        detail: { field: 'incomeRangeHigh', value: highNum }
      }));
    }
  };

  return (
    <div className="input-group">
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
        <span style={{ color: 'var(--text-muted)' }}>to</span>
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
        className="btn btn--primary btn--full"
        disabled={!low || !high}
        onClick={handleSubmit}
      >
        Continue →
      </button>
    </div>
  );
}
