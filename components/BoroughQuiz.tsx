'use client';

import { useState, useMemo } from 'react';
import { boroughGuides } from '@/data/boroughGuides';
import { useRouter } from 'next/navigation';

type Intent = 'rent' | 'buy'

// Intent question is always step 0. After intent is picked we render the remaining steps,
// some of which depend on intent (e.g. budget slider range, household question wording).
const INTENT_STEP = {
  id: 'intent',
  q: "First — are you looking to rent or buy?",
  type: 'single' as const,
  options: ['Renting', 'Buying'],
}

function buildSteps(intent: Intent) {
  return [
    {
      id: 'priorities',
      q: "What matters most to your day-to-day life?",
      hint: 'Pick all that apply',
      type: 'multi' as const,
      options: ['Green spaces','Nightlife','Coffee shops','Restaurants & food','Arts & culture','Young community','Family-friendly','Quiet streets','Markets & indie shops','Sport & fitness'],
    },
    {
      id: 'transport',
      q: "How do you get around?",
      type: 'single' as const,
      options: ['Tube / Elizabeth line','Bus','Cycling','Walking everywhere','Car'],
    },
    {
      id: 'vibe',
      q: "What kind of neighbourhood vibe are you after?",
      type: 'single' as const,
      options: ['Village feel — quiet, local, community-oriented','Buzzy & urban — always something on','Up-and-coming — edgy, evolving, affordable','Leafy & residential — calm, green, spacious'],
    },
    {
      id: 'who',
      q: "Who will live in the home?",
      type: 'single' as const,
      options: ['Just me','Me and a partner','With family','With parents','With housemates'],
    },
    {
      id: 'commute',
      q: 'Where do you need to commute to?',
      hint: 'Optional — helps us find well-connected boroughs',
      type: 'text' as const,
      placeholder: 'e.g. London Bridge, Canary Wharf, Oxford Street…',
    },
    {
      id: 'commuteTime',
      q: 'How long are you happy to commute?',
      type: 'single' as const,
      options: ['Under 15 minutes','Up to 30 minutes','Up to 45 minutes','Up to 1 hour','I work from home'],
    },
    {
      id: 'lifeStage',
      q: 'Which best describes you?',
      type: 'single' as const,
      options: ['Student','Young professional','Established professional','Family','Retired / semi-retired'],
    },
    {
      id: 'extra',
      q: "Anything you absolutely can't live without nearby?",
      hint: 'Optional — skip if not sure',
      type: 'text' as const,
      placeholder: 'e.g. a good park, a farmers market, a live music venue…',
    },
    intent === 'rent'
      ? {
          id: 'budget',
          q: "What's your maximum monthly rent?",
          type: 'slider' as const,
          min: 500,
          max: 5000,
          step: 50,
          default: 2000,
          intent: 'rent' as const,
        }
      : {
          id: 'budget',
          q: "What's your maximum purchase price?",
          type: 'slider' as const,
          min: 150_000,
          max: 5_000_000,
          step: 50_000,
          default: 500_000,
          curve: 2.5 as const,  // non-linear; £500k sits near the middle, big jumps above £1m
          intent: 'buy' as const,
        },
  ]
}

type Answers = Record<string, string | string[] | number>;

interface BoroughResult {
  name: string;
  matchPercent: number;
  tags: string[];
  bullets: string[];
  avgPrice: string;          // formatted, e.g. '£1,800–£2,400/mo' or '£500k–£700k'
  searchSlug: string;
}

// Neighborhood -> borough mapping (fallback if AI returns a neighborhood instead of a borough)
const NEIGHBORHOOD_TO_BOROUGH: Record<string, string> = {
  'Brixton': 'Lambeth', 'Clapham': 'Lambeth', 'Vauxhall': 'Lambeth', 'Kennington': 'Lambeth',
  'Shoreditch': 'Hackney', 'Dalston': 'Hackney', 'Stoke Newington': 'Hackney', 'Hackney Central': 'Hackney',
  'Bermondsey': 'Southwark', 'Peckham': 'Southwark', 'Camberwell': 'Southwark', 'Borough': 'Southwark', 'Elephant and Castle': 'Southwark',
  'Bethnal Green': 'Tower Hamlets', 'Canary Wharf': 'Tower Hamlets', 'Whitechapel': 'Tower Hamlets', 'Bow': 'Tower Hamlets',
  'Hampstead': 'Camden', 'Primrose Hill': 'Camden', 'Kentish Town': 'Camden',
  'Highbury': 'Islington', 'Clerkenwell': 'Islington',
  'Battersea': 'Wandsworth', 'Tooting': 'Wandsworth', 'Balham': 'Wandsworth', 'Wandsworth': 'Wandsworth',
  'Wimbledon': 'Merton',
  'Fulham': 'Hammersmith and Fulham', 'Hammersmith': 'Hammersmith and Fulham', 'Shepherd Bush': 'Hammersmith and Fulham', 'Shepherds Bush': 'Hammersmith and Fulham',
  'Chiswick': 'Hounslow',
  'Notting Hill': 'Kensington and Chelsea',
  'Richmond': 'Richmond upon Thames', 'Twickenham': 'Richmond upon Thames', 'Kew': 'Richmond upon Thames',
  'Kingston': 'Kingston upon Thames',
  'Forest Hill': 'Lewisham', 'Lewisham': 'Lewisham',
  'Crystal Palace': 'Bromley',
  'Stratford': 'Newham', 'Walthamstow': 'Waltham Forest',
  'Tower Hamlets': 'Tower Hamlets',
};

function getBoroughImage(name: string): string | null {
  // Try direct borough match
  let match = boroughGuides.find(b => b.name.toLowerCase() === name.toLowerCase());
  // Try neighborhood -> borough fallback
  if (!match) {
    const boroughName = NEIGHBORHOOD_TO_BOROUGH[name];
    if (boroughName) {
      match = boroughGuides.find(b => b.name === boroughName);
    }
  }
  return match?.heroImage || null;
}

const DEFAULT_IMG = 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80';

// Format money for the budget slider. Handles both rent (£/mo, cap £5k) and buy (£total, cap £5m+).
// At the slider max, show '+' so the user understands the cap is open-ended.
function fmtMoney(v: number, intent: Intent, max?: number) {
  if (intent === 'rent') {
    if (max != null && v >= max) return '£' + max.toLocaleString() + '/mo'
    return '£' + v.toLocaleString() + '/mo'
  }
  // buy
  const atMax = max != null && v >= max
  // Display millions as e.g. £1.5m, hundreds-of-thousands as £750k
  let display: string
  if (v >= 1_000_000) display = '£' + (v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1).replace(/\.0$/, '') + 'm'
  else display = '£' + Math.round(v / 1000) + 'k'
  return atMax ? display + '+' : display
}

// Slider curve helpers. For a curve exponent k > 1, slider position t in [0,1] maps to value
//   v = min + (max - min) * t^k
// so the visual middle (t=0.5) sits at a low value. Inverse: t = ((v - min) / (max - min))^(1/k).
function curveValueToPos(value: number, min: number, max: number, k: number): number {
  if (max === min) return 0
  const t = Math.pow(Math.max(0, Math.min(1, (value - min) / (max - min))), 1 / k)
  return t
}
function curvePosToValue(t: number, min: number, max: number, k: number, step: number): number {
  const raw = min + (max - min) * Math.pow(t, k)
  // Snap to nearest step so the displayed value isn't, say, £472,683.
  return Math.round(raw / step) * step
}

export default function BoroughQuiz() {
  const router = useRouter();
  // step = -1 → intent question (always first); step >= 0 → into the main quiz.
  const [step, setStep] = useState<number>(-1);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [phase, setPhase] = useState<'quiz' | 'loading' | 'results'>('quiz');
  const [results, setResults] = useState<BoroughResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // The active step list depends on intent. Once intent is chosen, switch to the built steps.
  // STEPS rebuilds when intent changes or when the commute answer flips between blank/non-blank.
  // We deliberately don't depend on every answer change — only the conditions that gate steps.
  const commuteAnswered = ((answers.commute as string) || '').trim().length > 0
  const STEPS = useMemo(() => {
    if (!intent) return []
    const all = buildSteps(intent)
    // Hide commuteTime if commute address is blank/skipped.
    return all.filter(s => s.id !== 'commuteTime' || commuteAnswered)
  }, [intent, commuteAnswered])
  const current = step < 0 ? INTENT_STEP : STEPS[step];

  const canAdvance = () => {
    if (current.type === 'multi') return ((answers[current.id] as string[]) || []).length > 0;
    if (current.type === 'single') return !!answers[current.id];
    return true;
  };

  const toggleMulti = (key: string, val: string) => {
    const arr = (answers[key] as string[]) || [];
    setAnswers({ ...answers, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] });
  };

  const advance = () => {
    if (step < 0) {
      // Coming out of the intent question. Move into the main quiz at step 0.
      if (!intent) return;
      setStep(0);
      return;
    }
    if (step < STEPS.length - 1) setStep(step + 1);
    else submit();
  };

  const submit = async () => {
    setPhase('loading');
    setError(null);

    try {
      // Budget falls back to the per-intent default when the user never touched the slider.
      const budgetDefault = intent === 'buy' ? 500_000 : 2000
      const budget = (answers.budget as number) || budgetDefault
      const res = await fetch('/api/borough-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, intent, budget }),
      });
      const data = await res.json();
      const parsed: { boroughs: BoroughResult[] } = JSON.parse(
        data.text.replace(/```json|```/g, '').trim()
      );
      setResults(parsed.boroughs);
      setPhase('results');
    } catch {
      setError('Something went wrong. Please try again.');
      setPhase('quiz');
    }
  };

  const retake = () => {
    setStep(-1);
    setIntent(null);
    setAnswers({});
    setPhase('quiz');
    setResults([]);
    setError(null);
  };

  // Progress includes the intent step at the front. Total = 1 + main steps. Current = step<0 ? 0 : step+1.
  const totalSteps = 1 + (STEPS.length || 9)  // 9 = main quiz length when intent set; falls back so the meter is non-zero on intent screen
  const completedSteps = step < 0 ? 0 : step + 1
  const pct = Math.round((completedSteps / totalSteps) * 100);

  if (phase === 'loading') {
    return (
      <section className="py-16 px-4 bg-[#F5EBE0]">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-10 h-10 border-4 border-[#D3755A]/20 border-t-[#D3755A] rounded-full animate-spin mx-auto mb-6" />
          <h3 className="text-xl font-medium text-[#1B2E4B] mb-2">Matching you with your boroughs…</h3>
          <p className="text-[#3D3A38]/60">Analysing your preferences across all 32 London boroughs</p>
        </div>
      </section>
    );
  }

  if (phase === 'results') {
    return (
      <section className="py-16 px-4 bg-[#F5EBE0]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-medium text-[#1B2E4B] mb-2">Your top borough matches</h2>
          <p className="text-[#3D3A38]/70 mb-8">Based on your priorities, here are the London boroughs we think you'll love.</p>
          <div className="flex flex-col gap-6">
            {results.map((b) => (
              <div key={b.name} className="bg-white rounded-2xl overflow-hidden border border-black/5 shadow-sm">
                <img
                  src={getBoroughImage(b.name) || DEFAULT_IMG}
                  alt={b.name}
                  onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG }}
                  className="h-48 w-full object-cover"
                />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-2xl font-medium text-[#1B2E4B]">{b.name}</h3>
                    <span className="text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                      {b.matchPercent}% match
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {b.tags.map(t => (
                      <span key={t} className="text-xs text-[#3D3A38]/60 bg-[#F5EBE0] px-3 py-1 rounded-full">{t}</span>
                    ))}
                    <span className="text-xs text-[#3D3A38]/60 bg-[#F5EBE0] px-3 py-1 rounded-full">{b.avgPrice}</span>
                  </div>
                  <ul className="mb-5 space-y-2">
                    {b.bullets.map(bul => (
                      <li key={bul} className="flex gap-3 text-sm text-[#3D3A38]/70">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D3755A] flex-shrink-0 mt-2" />
                        {bul}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => router.push(`/search?type=${intent || 'rent'}&location=${encodeURIComponent(b.name)}`)}
                    className="bg-[#1B2E4B] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1B2E4B]/90 transition-colors"
                  >
                    {intent === 'buy' ? `View homes for sale in ${b.name}` : `View rentals in ${b.name}`} →
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-[#3D3A38]/50 mt-6">
            Not quite right?{' '}
            <button onClick={retake} className="underline hover:text-[#3D3A38] transition-colors">
              Retake the quiz
            </button>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 bg-[#F5EBE0]">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-medium text-[#1B2E4B] mb-2">Find your perfect London borough</h2>
          <p className="text-[#3D3A38]/60">Answer a few questions and we'll match you with your ideal London boroughs.</p>
        </div>

        <div className="mb-8">
          <div className="h-1 bg-black/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#D3755A] rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-[#3D3A38]/50 mt-2">Step {completedSteps + 1} of {totalSteps}</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>
        )}

        <div className="bg-white rounded-2xl border border-black/5 p-6 shadow-sm">
          <p className="text-lg font-medium text-[#3D3A38] mb-1">{current.q}</p>
          {'hint' in current && current.hint && (
            <p className="text-sm text-[#3D3A38]/50 mb-5">{current.hint}</p>
          )}
          {!('hint' in current) && <div className="mb-5" />}

          {current.type === 'multi' && (
            <div className="flex flex-wrap gap-2">
              {current.options.map(o => {
                const sel = ((answers[current.id] as string[]) || []).includes(o);
                return (
                  <button
                    key={o}
                    onClick={() => toggleMulti(current.id, o)}
                    className={`px-4 py-2 rounded-full text-sm border transition-all ${
                      sel
                        ? 'bg-[#D3755A] border-[#D3755A] text-white'
                        : 'bg-[#F5EBE0] border-transparent text-[#3D3A38] hover:border-[#D3755A] hover:text-[#D3755A]'
                    }`}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          )}

          {current.type === 'single' && (
            <div className="flex flex-col gap-2">
              {current.options.map(o => {
                const sel = current.id === 'intent'
                  ? (intent === 'buy' && o === 'Buying') || (intent === 'rent' && o === 'Renting')
                  : answers[current.id] === o;
                return (
                  <button
                    key={o}
                    onClick={() => {
                      if (current.id === 'intent') {
                        const next: Intent = o === 'Buying' ? 'buy' : 'rent'
                        setIntent(next)
                        setAnswers({ ...answers, intent: next });
                        // Wait a beat for the highlight, then transition to step 0 of the main quiz.
                        setTimeout(() => setStep(0), 200);
                        return;
                      }
                      setAnswers({ ...answers, [current.id]: o });
                      setTimeout(advance, 200);
                    }}
                    className={`text-left px-4 py-3 rounded-xl text-sm border transition-all ${
                      sel
                        ? 'bg-[#D3755A] border-[#D3755A] text-white'
                        : 'bg-[#F5EBE0] border-transparent text-[#3D3A38] hover:border-[#D3755A]'
                    }`}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          )}

          {current.type === 'slider' && (
            <>
              <div className="flex items-center gap-4 mb-3">
                {(() => {
                  const val = (answers[current.id] as number) || current.default;
                  const curve = (current as any).curve as number | undefined
                  if (curve) {
                    // Non-linear: slider position is in [0, 1000] integer space; we map to/from value via the curve.
                    const t = curveValueToPos(val, current.min, current.max, curve)
                    const pos = Math.round(t * 1000)
                    return (
                      <input
                        type="range"
                        min={0}
                        max={1000}
                        step={1}
                        value={pos}
                        onChange={e => {
                          const nextT = parseInt(e.target.value) / 1000
                          const nextVal = curvePosToValue(nextT, current.min, current.max, curve, current.step)
                          setAnswers({ ...answers, [current.id]: nextVal })
                        }}
                        className="flex-1 range-fill accent-[#D3755A]"
                        style={{ ['--value' as any]: `${t * 100}%` }}
                      />
                    )
                  }
                  // Linear slider (rent path).
                  const pct = ((val - current.min) / (current.max - current.min)) * 100;
                  return (
                    <input
                      type="range"
                      min={current.min}
                      max={current.max}
                      step={current.step}
                      value={val}
                      onChange={e => setAnswers({ ...answers, [current.id]: parseInt(e.target.value) })}
                      className="flex-1 range-fill accent-[#D3755A]"
                      style={{ ['--value' as any]: `${pct}%` }}
                    />
                  );
                })()}
                <span className="text-xl font-medium text-[#D3755A] min-w-[110px] text-right">
                  {fmtMoney((answers[current.id] as number) || current.default, intent || 'rent', current.max)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-[#3D3A38]/40">
                <span>{fmtMoney(current.min, intent || 'rent')}</span>
                <span>{fmtMoney(current.max, intent || 'rent', current.max)}</span>
              </div>
            </>
          )}

          {current.type === 'text' && (
            <textarea
              rows={3}
              placeholder={current.placeholder}
              value={(answers[current.id] as string) || ''}
              onChange={e => setAnswers({ ...answers, [current.id]: e.target.value })}
              className="w-full p-3 rounded-xl border border-black/10 text-sm bg-[#F5EBE0] text-[#3D3A38] resize-none focus:outline-none focus:border-[#D3755A]"
            />
          )}
        </div>

        <div className="flex justify-between items-center mt-5">
          {step > 0
            ? <button onClick={() => setStep(step - 1)} className="text-sm text-[#3D3A38]/50 hover:text-[#3D3A38] transition-colors">← Back</button>
            : <div />
          }
          <div className="flex items-center gap-4">
            {current.type === 'text' && (
              <button onClick={advance} className="text-sm text-[#3D3A38]/50 underline hover:text-[#3D3A38]">Skip</button>
            )}
            {current.type !== 'single' && (
              <button
                onClick={advance}
                disabled={!canAdvance()}
                className="bg-[#D3755A] text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-[#D3755A]/90 transition-all"
              >
                {step === STEPS.length - 1 ? 'Find my boroughs' : 'Next →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
