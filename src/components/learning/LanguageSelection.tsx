'use client';

import { ArrowRight, Check } from 'lucide-react';

export function LanguageSelection({ name, saving, onSelect }: {
  name: string; saving: boolean; onSelect: () => void;
}) {
  return (
    <main className="language-selection">
      <span className="eyebrow">YOUR NEXT ADVENTURE</span>
      <h1>What would you like to learn, {name}?</h1>
      <p>Choose your course. Your selection and learning progress will be saved to your account.</p>
      <div className="language-option">
        <span className="language-flag" aria-hidden="true">🇫🇷</span>
        <div><h2>French</h2><p>France · English explanations · A1 foundations</p></div>
        <Check size={24} aria-label="Available course" />
      </div>
      <p className="small-copy">French is our first available course. More languages will follow.</p>
      <button className="primary" disabled={saving} onClick={onSelect}>
        {saving ? 'Saving your selection…' : 'Start learning French'}<ArrowRight size={18} />
      </button>
    </main>
  );
}
