"use client";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/learning/dialog";
import { Progress } from "@/components/ui/learning/progress";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/learning/radio-group";
const features = [
  "French sounds and pronunciation",
  "Gender and articles",
  "Everyday vocabulary",
  "English explanations at every step",
];
import type { Profile } from "@/lib/learning/model";
export function Choices({
  values,
  value,
  onChange,
}: {
  values: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="choice-list">
      {values.map((v) => (
        <label key={v} className={`choice ${value === v ? "chosen" : ""}`}>
          <RadioGroupItem value={v} />
          <span>{v}</span>
        </label>
      ))}
    </RadioGroup>
  );
}
export function Onboarding({
  profile,
  learnerName,
  onClose,
  onSave,
}: {
  profile: Profile | null;
  learnerName: string;
  onClose: () => void;
  onSave: (p: Profile) => void;
}) {
  const [step, setStep] = useState(0),
    [name, setName] = useState(profile?.name || learnerName),
    [level, setLevel] = useState(profile?.level || "Beginner"),
    [focus, setFocus] = useState(profile?.focus || "Everyday conversation"),
    [goal, setGoal] = useState(String(profile?.goal || 10));
  const titles = [
    "Bonjour! Let’s make this yours.",
    "Where are you starting?",
    "What brings you to French?",
    "A little time, every day.",
    "Your first chapter awaits.",
  ];
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flow-dialog">
        <div className="eyebrow">YOUR FRENCH JOURNEY · {step + 1} OF 5</div>
        <Progress value={(step + 1) * 20} />
        <DialogTitle className="flow-title">{titles[step]}</DialogTitle>
        <DialogDescription>
          {
            [
              "Learn French with English explanations. What should we call you?",
              "This first course covers A1 foundations. Experienced learners can use it as a refresher.",
              "We’ll keep your goal on your profile as your journey grows.",
              "Choose a goal that fits your day. You can change it anytime.",
              "A few things make French different from English. We’ll practise them one little step at a time.",
            ][step]
          }
        </DialogDescription>
        {step === 0 && (
          <label className="input-label">
            Your name or nickname
            <input
              autoFocus
              maxLength={30}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              autoComplete="nickname"
            />
            <small>
              Your preferences and progress are saved to your student account.
            </small>
          </label>
        )}
        {step === 1 && (
          <Choices
            values={["Beginner", "Some French", "Confident · here to review"]}
            value={level}
            onChange={setLevel}
          />
        )}
        {step === 2 && (
          <Choices
            values={[
              "Everyday conversation",
              "Travel & new places",
              "School & study",
              "Just for the joy of it",
            ]}
            value={focus}
            onChange={setFocus}
          />
        )}
        {step === 3 && (
          <Choices
            values={["5 minutes", "10 minutes", "15 minutes", "20 minutes"]}
            value={`${goal} minutes`}
            onChange={(v) => setGoal(v.split(" ")[0])}
          />
        )}
        {step === 4 && (
          <>
            <ul className="feature-list">
              {features.map((f) => (
                <li key={f}>
                  <Check size={16} />
                  {f}
                </li>
              ))}
            </ul>
            <div className="inline-note">
              Explore published lessons from your teachers, at your own pace.
            </div>
          </>
        )}
        <div className="flow-actions">
          {step > 0 && (
            <button className="plain-button" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          <button
            className="primary"
            disabled={!name.trim()}
            onClick={() =>
              step < 4
                ? setStep(step + 1)
                : onSave({
                    name: name.trim(),
                    level,
                    focus,
                    goal: Number(goal),
                    largeText: profile?.largeText || false,
                  })
            }
          >
            {step === 4 ? "Start my journey" : "Continue"}
            <ArrowRight size={18} />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
