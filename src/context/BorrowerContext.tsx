/**
 * BorrowerContext.tsx — State management for the borrower's session.
 *
 * All state is session-only. Nothing is persisted. When the user
 * refreshes, everything resets. This is deliberate — no personal data stored.
 */

import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { BorrowerAnswers, FullAssessment } from '../engine/types';
import { runAssessment } from '../engine/assessment';

// ─── App Flow States ────────────────────────────────────────────────────────

export type AppScreen =
  | 'welcome'
  | 'must_questions'
  | 'must_results_preview'
  | 'additional_questions'
  | 'results'
  | 'negotiation_card';

// ─── State ──────────────────────────────────────────────────────────────────

interface BorrowerState {
  screen: AppScreen;
  answers: BorrowerAnswers;
  skippedQuestions: string[];
  assessment: FullAssessment | null;
  questionIndex: number;
  animationDirection: 'forward' | 'backward';
}

const initialState: BorrowerState = {
  screen: 'welcome',
  answers: {},
  skippedQuestions: [],
  assessment: null,
  questionIndex: 0,
  animationDirection: 'forward',
};

// ─── Actions ────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_SCREEN'; screen: AppScreen }
  | { type: 'SET_ANSWER'; field: string; value: unknown }
  | { type: 'SKIP_QUESTION'; field: string }
  | { type: 'SET_ASSESSMENT'; assessment: FullAssessment }
  | { type: 'LOAD_PROFILE'; answers: BorrowerAnswers }
  | { type: 'NEXT_QUESTION' }
  | { type: 'PREV_QUESTION' }
  | { type: 'SET_QUESTION_INDEX'; index: number }
  | { type: 'RESET' };

function reducer(state: BorrowerState, action: Action): BorrowerState {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.screen, questionIndex: 0 };

    case 'SET_ANSWER':
      return {
        ...state,
        answers: { ...state.answers, [action.field]: action.value },
      };

    case 'SKIP_QUESTION':
      return {
        ...state,
        skippedQuestions: state.skippedQuestions.includes(action.field)
          ? state.skippedQuestions
          : [...state.skippedQuestions, action.field],
      };

    case 'SET_ASSESSMENT':
      return { ...state, assessment: action.assessment };

    case 'LOAD_PROFILE': {
      const assessment = runAssessment(action.answers);
      return {
        ...state,
        answers: action.answers,
        assessment,
        screen: 'results',
        questionIndex: 0,
      };
    }

    case 'NEXT_QUESTION':
      return {
        ...state,
        questionIndex: state.questionIndex + 1,
        animationDirection: 'forward',
      };

    case 'PREV_QUESTION':
      return {
        ...state,
        questionIndex: Math.max(0, state.questionIndex - 1),
        animationDirection: 'backward',
      };

    case 'SET_QUESTION_INDEX':
      return { ...state, questionIndex: action.index };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────────────────────

interface BorrowerContextType {
  state: BorrowerState;
  dispatch: React.Dispatch<Action>;
}

const BorrowerContext = createContext<BorrowerContextType | null>(null);

export function BorrowerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <BorrowerContext.Provider value={{ state, dispatch }}>
      {children}
    </BorrowerContext.Provider>
  );
}

export function useBorrower(): BorrowerContextType {
  const context = useContext(BorrowerContext);
  if (!context) {
    throw new Error('useBorrower must be used within BorrowerProvider');
  }
  return context;
}
