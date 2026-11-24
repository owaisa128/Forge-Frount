import React, { useState, useEffect, useRef } from 'react';
import { HugeiconsIcon, Play, Pause, RefreshCw, CheckCircle2, AlertCircle, Dumbbell, Sparkles, Flame, Droplets, Timer, Check, Award, ShieldCheck } from "../ui/icons";

/**
 * Audio cue using Web Audio API (no external file needed, works offline & 100% reliable)
 */
const playChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(587.33, now, 0.12); // D5
    playTone(880.0, now + 0.12, 0.15); // A5
    playTone(1174.66, now + 0.25, 0.35); // D6
  } catch (err) {
    console.debug('Web Audio not allowed or failed:', err);
  }
};

/**
 * 1. WORKOUT ROUTINE GENERATIVE UI WIDGET
 * Interactive checklist, set completion, duration & muscle badges.
 */
export function WorkoutWidget({ data, onStartTimer }) {
  const {
    title = 'Custom Workout Routine',
    difficulty = 'Intermediate',
    durationMinutes = 45,
    targetMuscles = ['Chest', 'Triceps', 'Shoulders'],
    exercises = [],
  } = data || {};

  // Track completed sets per exercise: { [exerciseIndex]: [set1Done, set2Done, ...] }
  const [completedSets, setCompletedSets] = useState({});
  const [copied, setCopied] = useState(false);

  const toggleSet = (exIdx, setIdx) => {
    setCompletedSets((prev) => {
      const current = prev[exIdx] || [];
      const updated = [...current];
      updated[setIdx] = !updated[setIdx];
      return { ...prev, [exIdx]: updated };
    });
  };

  const copyToClipboard = () => {
    const text = `${title} (${difficulty} • ${durationMinutes} mins)\nTarget: ${targetMuscles.join(', ')}\n\n` +
      exercises
        .map((ex, i) => `${i + 1}. ${ex.name} - ${ex.sets} sets x ${ex.reps} (Rest: ${ex.restSeconds || 60}s)${ex.tip ? `\n   Tip: ${ex.tip}` : ''}`)
        .join('\n\n');
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const difficultyColors = {
    Beginner: 'bg-forma-status-success/10 text-forma-status-success border-forma-status-success/30',
    Intermediate: 'bg-forma-brand-ember/15 text-forma-brand-ember border-forma-brand-ember/30',
    Advanced: 'bg-forma-status-warning/10 text-forma-status-warning border-forma-status-warning/30',
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-forma-brand-ember/30 bg-forma-bg-surface p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-forma-brand-ember/20 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forma-brand-ember/20 text-forma-brand-ember">
            <HugeiconsIcon aria-hidden="true" icon={Dumbbell} className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-forma-text-primary">{title}</h4>
            <div className="flex items-center gap-2 text-xs text-forma-text-secondary">
              <span>~{durationMinutes} mins</span>
              <span>•</span>
              <span className="capitalize">{targetMuscles.slice(0, 3).join(', ')}</span>
            </div>
          </div>
        </div>

        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            difficultyColors[difficulty] || difficultyColors.Intermediate
          }`}
        >
          {difficulty}
        </span>
      </div>

      {/* Exercise List */}
      <div className="mt-3 space-y-2.5">
        {exercises.map((ex, exIdx) => {
          const numSets = Number(ex.sets) || 3;
          const setsArr = Array.from({ length: Math.min(numSets, 8) });
          const exCompleted = completedSets[exIdx] || [];

          return (
            <div
              key={exIdx}
              className="rounded-lg border border-forma-brand-ember/15 bg-forma-bg-surface-raised/40 p-2.5 transition hover:border-forma-brand-ember/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-semibold text-forma-text-primary">
                    {exIdx + 1}. {ex.name}
                  </span>
                  {ex.tip && (
                    <p className="mt-0.5 break-words text-sm text-forma-text-secondary">
                      {ex.tip}
                    </p>
                  )}
                </div>
                <div className="flex max-w-full flex-wrap items-center justify-end gap-1.5 text-right">
                  <span className="max-w-full break-words rounded bg-forma-brand-ember/10 px-1.5 py-0.5 text-xs font-mono font-medium text-forma-brand-ember">
                    {ex.sets} × {ex.reps}
                  </span>
                  {ex.restSeconds && onStartTimer && (
                    <button
                      type="button"
                      onClick={() => onStartTimer(ex.restSeconds, `Rest for ${ex.name}`)}
                      title={`Start ${ex.restSeconds}s rest timer`}
                      className="inline-flex max-w-full flex-wrap items-center gap-1 rounded bg-forma-bg-surface px-1.5 py-0.5 text-xs text-forma-text-secondary transition hover:bg-forma-brand-ember/20 hover:text-forma-brand-ember"
                    >
                      <HugeiconsIcon aria-hidden="true" icon={Timer} className="h-3 w-3" /> {ex.restSeconds}s
                    </button>
                  )}
                </div>
              </div>

              {/* Set Checkboxes */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-medium text-forma-text-disabled">Sets:</span>
                {setsArr.map((_, sIdx) => {
                  const isDone = Boolean(exCompleted[sIdx]);
                  return (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => toggleSet(exIdx, sIdx)}
                      className={`flex h-auto min-h-11 min-w-11 items-center justify-center rounded px-1.5 text-xs font-semibold transition ${
                        isDone
                          ? 'bg-forma-status-success text-forma-text-on-ember'
                          : 'border border-forma-border-subtle bg-forma-bg-surface text-forma-text-secondary hover:border-forma-brand-ember hover:text-forma-brand-ember'
                      }`}
                    >
                      {isDone ? '✓' : `S${sIdx + 1}`}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action footer */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-forma-brand-ember/15 pt-2">
        <span className="min-w-0 flex-1 text-xs text-forma-text-secondary">
          Select sets to log them as complete.
        </span>
        <button
          type="button"
          onClick={copyToClipboard}
          className="inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-full border border-forma-brand-ember/40 bg-forma-brand-ember/10 px-3 py-2 text-xs font-semibold text-forma-brand-ember transition hover:bg-forma-brand-ember hover:text-forma-text-on-ember"
        >
          {copied ? <HugeiconsIcon aria-hidden="true" icon={Check} className="h-3 w-3" /> : <HugeiconsIcon aria-hidden="true" icon={Award} className="h-3 w-3" />}
          <span>{copied ? 'Copied!' : 'Copy Routine'}</span>
        </button>
      </div>
    </div>
  );
}

/**
 * 2. NUTRITION & MACROS GENERATIVE UI WIDGET
 * Interactive calorie slider, macro percentage rings, hydration tracker.
 */
export function MacroWidget({ data }) {
  const initialCalories = Number(data?.calories) || 2400;
  const initialProtein = Number(data?.proteinGrams) || 180;
  const initialCarbs = Number(data?.carbsGrams) || 240;
  const initialFat = Number(data?.fatGrams) || 70;
  const goal = data?.goal || 'Muscle Hypertrophy';
  const initialWater = Number(data?.waterLiters) || 3.5;

  const [calories, setCalories] = useState(initialCalories);
  const [waterGlasses, setWaterGlasses] = useState(0);

  // Scaled macros when user tweaks calories slider
  const scale = calories / initialCalories;
  const protein = Math.round(initialProtein * scale);
  const carbs = Math.round(initialCarbs * scale);
  const fat = Math.round(initialFat * scale);

  const proteinCals = protein * 4;
  const carbsCals = carbs * 4;
  const fatCals = fat * 9;
  const totalCals = proteinCals + carbsCals + fatCals || 1;

  const proteinPct = Math.round((proteinCals / totalCals) * 100);
  const carbsPct = Math.round((carbsCals / totalCals) * 100);
  const fatPct = Math.max(0, 100 - proteinPct - carbsPct);

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-forma-brand-ember/30 bg-forma-bg-surface p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-forma-brand-ember/20 pb-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forma-brand-ember/20 text-forma-brand-ember">
            <HugeiconsIcon aria-hidden="true" icon={Flame} className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h4 className="break-words text-sm font-bold text-forma-text-primary">Daily macro targets</h4>
            <p className="break-words text-xs text-forma-text-secondary">{goal}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className="font-display text-2xl font-normal text-forma-brand-ember tabular-nums">
            {calories}
          </span>
          <span className="block text-xs text-forma-text-secondary">kcal / day</span>
        </div>
      </div>

      {/* Interactive Calorie Slider */}
      <div className="mt-3 rounded-lg bg-forma-bg-surface-raised/40 p-2.5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-1 text-xs text-forma-text-secondary">
          <span>Adjust Calorie Target:</span>
          <span className="font-semibold text-forma-text-primary">{calories} kcal</span>
        </div>
        <input
          type="range"
          min={1400}
          max={4000}
          step={50}
          value={calories}
          onChange={(e) => setCalories(Number(e.target.value))}
          className="h-2 w-full cursor-pointer accent-forma-brand-ember"
        />
        <div className="mt-1 flex flex-wrap justify-between gap-1 text-xs text-forma-text-disabled">
          <span>1,400 Deficit</span>
          <span>2,400 Maint.</span>
          <span>4,000 Bulk</span>
        </div>
      </div>

      {/* Visual Macro Split Bar */}
      <div className="mt-3">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-forma-bg-surface">
          <div
            style={{ width: `${proteinPct}%` }}
            className="bg-forma-brand-ember transition-all duration-300"
            title={`Protein: ${proteinPct}%`}
          />
          <div
            style={{ width: `${carbsPct}%` }}
            className="bg-forma-brand-teal transition-all duration-300"
            title={`Carbs: ${carbsPct}%`}
          />
          <div
            style={{ width: `${fatPct}%` }}
            className="bg-forma-text-disabled transition-all duration-300"
            title={`Fats: ${fatPct}%`}
          />
        </div>

        {/* Macro Numbers */}
        <div className="mt-2.5 grid grid-cols-1 gap-2 text-center text-xs sm:grid-cols-3">
          <div className="rounded-lg border border-forma-brand-ember/20 bg-forma-brand-ember/10 p-2">
            <span className="block break-words font-mono text-xs font-bold uppercase tracking-wider text-forma-brand-ember">Protein</span>
            <span className="text-sm font-black text-forma-brand-ember tabular-nums">{protein}g</span>
            <span className="block break-words text-xs text-forma-text-disabled">{proteinPct}%</span>
          </div>
          <div className="rounded-lg border border-forma-brand-teal/20 bg-forma-brand-teal/10 p-2">
            <span className="block break-words font-mono text-xs font-bold uppercase tracking-wider text-forma-brand-teal">Carbs</span>
            <span className="text-sm font-black text-forma-brand-teal tabular-nums">{carbs}g</span>
            <span className="block break-words text-xs text-forma-text-disabled">{carbsPct}%</span>
          </div>
          <div className="rounded-lg border border-forma-border-subtle bg-forma-bg-surface-raised p-2">
            <span className="block break-words font-mono text-xs font-bold uppercase tracking-wider text-forma-text-secondary">Fats</span>
            <span className="text-sm font-black text-forma-text-primary tabular-nums">{fat}g</span>
            <span className="block break-words text-xs text-forma-text-disabled">{fatPct}%</span>
          </div>
        </div>
      </div>

      {/* Hydration Tracker */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-forma-brand-teal/20 bg-forma-brand-teal/10 p-2.5 text-xs">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <HugeiconsIcon aria-hidden="true" icon={Droplets} className="h-4 w-4 text-forma-brand-teal" />
          <div className="min-w-0 break-words">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-forma-brand-teal">Hydration Target: {initialWater}L</span>
            <span className="block break-words text-xs text-forma-text-secondary">
              Logged: {waterGlasses * 250}ml ({waterGlasses} glasses)
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setWaterGlasses((prev) => prev + 1)}
          className="rounded-full bg-forma-brand-ember px-3 py-1 text-xs font-bold text-forma-text-on-ember transition hover:bg-forma-brand-ember-hover"
        >
          +250ml
        </button>
      </div>
    </div>
  );
}

/**
 * 3. INTERACTIVE REST TIMER WIDGET
 * Real countdown with Web Audio API chime and interval controls.
 */
export function TimerWidget({ data }) {
  const initialSeconds = Number(data?.seconds) || 60;
  const label = data?.label || 'Inter-set Rest Interval';

  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [remaining, setRemaining] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isRunning && remaining > 0) {
      interval = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            setIsRunning(false);
            setCompleted(true);
            playChime();
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, remaining]);

  const toggleTimer = () => {
    if (remaining === 0) {
      setRemaining(totalSeconds);
      setCompleted(false);
      setIsRunning(true);
    } else {
      setIsRunning((prev) => !prev);
    }
  };

  const resetTimer = (newSec = totalSeconds) => {
    setIsRunning(false);
    setCompleted(false);
    setRemaining(newSec);
    setTotalSeconds(newSec);
  };

  const addTime = (extra) => {
    setRemaining((r) => r + extra);
    setTotalSeconds((t) => t + extra);
    setCompleted(false);
  };

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const formattedTime = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  const progressPct = totalSeconds > 0 ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0;

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-forma-brand-ember/30 bg-forma-bg-surface p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-forma-brand-ember/20 pb-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-forma-brand-ember/20 text-forma-brand-ember">
            <HugeiconsIcon aria-hidden="true" icon={Timer} className="h-4 w-4" />
          </div>
          <span className="break-words text-xs font-bold text-forma-text-primary">{label}</span>
        </div>
        {completed && (
          <span className="rounded-full bg-forma-status-success/10 px-2 py-0.5 text-xs font-bold text-forma-status-success">
            Rest complete.
          </span>
        )}
      </div>

      {/* Countdown Display with Circular Progress */}
      <div className="mt-4 flex flex-col items-center justify-center">
        <div className="relative flex aspect-square w-full max-w-36 items-center justify-center">
          <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              className="stroke-forma-border-subtle/30"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              className="stroke-forma-brand-ember transition-all duration-500 ease-linear"
              strokeWidth="6"
              strokeDasharray={263.89}
              strokeDashoffset={263.89 - (263.89 * progressPct) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute text-center">
            <span className="font-display text-4xl font-normal tabular-nums tracking-tight text-forma-text-primary">
              {formattedTime}
            </span>
            <span className="block break-words text-xs font-medium uppercase tracking-wider text-forma-text-secondary">
              {isRunning ? 'Resting...' : completed ? 'Finished' : 'Ready'}
            </span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTimer}
              className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-bold transition ${
              isRunning
                  ? 'bg-forma-brand-teal hover:brightness-110 text-forma-text-on-ember'
                  : 'bg-forma-brand-ember hover:bg-forma-brand-ember-hover text-forma-text-on-ember'
            }`}
          >
            {isRunning ? (
              <>
                <HugeiconsIcon aria-hidden="true" icon={Pause} className="h-4 w-4" /> Pause
              </>
            ) : (
              <>
                <HugeiconsIcon aria-hidden="true" icon={Play} className="h-4 w-4" /> Start
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => resetTimer()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-forma-border-subtle bg-forma-bg-surface text-forma-text-secondary transition hover:bg-forma-bg-surface-raised hover:text-forma-text-primary"
            title="Reset timer"
          >
            <HugeiconsIcon aria-hidden="true" icon={RefreshCw} className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => addTime(15)}
            className="inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-forma-border-subtle bg-forma-bg-surface px-3 text-xs font-semibold text-forma-text-secondary transition hover:bg-forma-bg-surface-raised hover:text-forma-text-primary"
            title="Add 15 seconds"
          >
            +15s
          </button>
        </div>

        {/* Quick Presets */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-forma-text-disabled">Presets:</span>
          {[30, 45, 60, 90, 120].map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => resetTimer(sec)}
              className={`min-h-11 min-w-11 rounded-full px-3 py-2 text-xs font-semibold transition ${
                totalSeconds === sec
                  ? 'bg-forma-brand-ember text-forma-text-on-ember'
                  : 'bg-forma-bg-surface border border-forma-border-subtle text-forma-text-secondary hover:text-forma-brand-ember'
              }`}
            >
              {sec}s
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 4. FORM & TECHNIQUE CHECKLIST GENERATIVE UI WIDGET
 * Biomechanical cues, checkable steps, and error avoidance.
 */
export function FormChecklistWidget({ data }) {
  const {
    exercise = 'Exercise Form Check',
    keyCues = [],
    commonMistakes = [],
    safetyTip = 'Maintain controlled breathing and never sacrifice form for weight.',
  } = data || {};

  const [checkedCues, setCheckedCues] = useState({});

  const toggleCue = (index) => {
    setCheckedCues((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-forma-brand-ember/30 bg-forma-bg-surface p-4">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-forma-brand-ember/20 pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forma-brand-ember/20 text-forma-brand-ember">
          <HugeiconsIcon aria-hidden="true" icon={Sparkles} className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h4 className="break-words text-sm font-bold text-forma-text-primary">{exercise}</h4>
          <span className="break-words text-xs text-forma-text-secondary">Form cues and safety notes</span>
        </div>
      </div>

      {/* Cues Checklist */}
      <div className="mt-3">
        <span className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-forma-brand-ember">
          Key cues
        </span>
        <div className="mt-1.5 space-y-1.5">
          {keyCues.map((cue, idx) => {
            const isDone = Boolean(checkedCues[idx]);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => toggleCue(idx)}
                className={`flex w-full items-start gap-2 rounded-lg border p-2 text-left text-sm transition ${
                  isDone
                    ? 'border-forma-status-success/30 bg-forma-status-success/10 text-forma-status-success'
                    : 'border-forma-border-subtle bg-forma-bg-surface-raised/40 text-forma-text-secondary hover:border-forma-brand-ember/40'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold ${
                    isDone ? 'bg-forma-status-success text-forma-text-on-ember' : 'border border-forma-border-subtle text-transparent'
                  }`}
                >
                  ✓
                </span>
                <span className={`min-w-0 break-words ${isDone ? 'line-through opacity-80' : ''}`}>
                  {cue}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Common Mistakes */}
      {commonMistakes.length > 0 && (
        <div className="mt-3 rounded-lg border border-forma-status-error/20 bg-forma-status-error/10 p-2.5 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-forma-status-error">
            <HugeiconsIcon aria-hidden="true" icon={AlertCircle} className="h-4 w-4" />
            <span>Common mistakes</span>
          </div>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-forma-text-secondary">
            {commonMistakes.map((mistake, mIdx) => (
              <li key={mIdx}>{mistake}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Safety Note */}
      {safetyTip && (
        <div className="mt-2 flex items-start gap-2 text-sm text-forma-text-secondary">
          <HugeiconsIcon aria-hidden="true" icon={ShieldCheck} className="mt-0.5 h-4 w-4 shrink-0 text-forma-status-warning" />
          <span>{safetyTip}</span>
        </div>
      )}
    </div>
  );
}
