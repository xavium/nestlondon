'use client';

import { useState } from 'react';
import { boroughGuides } from '@/data/boroughGuides';
import { useRouter } from 'next/navigation';

const STEPS = [
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
    q: "Who are you renting with?",
    type: 'single' as const,
    options: ['Just me','Me and a partner','Housemates','Family with kids'],
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
  {
    id: 'rent',
    q: "What's your maximum monthly rent?",
    type: 'slider' as const,
    min: 800,
    max: 5000,
    step: 50,
    default: 2000,
  },
];

type Answers = Record<string, string | string[] | number>;

interface BoroughResult {
  name: string;
  matchPercent: number;
  tags: string[];
  bullets: string[];
  avgRent: string;
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

function fmtRent(v: number) {
  return v >= 5000 ? '£5,000+' : `£${v.toLocaleString()}`;
}

export default function BoroughQuiz() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [phase, setPhase] = useState<'quiz' | 'loading' | 'results'>('quiz');
  const [results, setResults] = useState<BoroughResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const current = STEPS[step];

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
    if (step < STEPS.length - 1) setStep(step + 1);
    else submit();
  };

  const submit = async () => {
    setPhase('loading');
    setError(null);
    const rentVal = (answers.rent as number) || 2000;
    const prompt = `You are a London property expert helping someone find their ideal borough to rent in.

Based on this person's preferences, recommend exactly 3 London boroughs. Return ONLY valid JSON, no markdown, no explanation.

Preferences:
- Lifestyle priorities: ${((answers.priorities as string[]) || []).join(', ') || 'none specified'}
- Transport preference: ${answers.transport || 'not specified'}
- Neighbourhood vibe: ${answers.vibe || 'not specified'}
- Renting with: ${answers.who || 'not specified'}
- Commute destination: ${answers.commute || 'not specified'}
- Max commute time: ${answers.commuteTime || 'not specified'}
- Life stage: ${answers.lifeStage || 'not specified'}
- Must-haves: ${answers.extra || 'none'}
- Max monthly rent: ${fmtRent(rentVal)}

Return this exact JSON shape:
{
  "boroughs": [
    {
      "name": "Borough name",
      "matchPercent": 94,
      "tags": ["tag1","tag2","tag3"],
      "bullets": ["Positive reason 1","Positive reason 2","Positive reason 3"],
      "avgRent": "£1,800–£2,400/mo",
      "searchSlug": "hackney"
    }
  ]
}

Rules:
- You MUST choose from these 32 London boroughs only: City of London, Westminster, Camden, Islington, Hackney, Tower Hamlets, Southwark, Lambeth, Wandsworth, Kensington and Chelsea, Hammersmith and Fulham, Ealing, Brent, Greenwich, Lewisham, Bromley, Croydon, Merton, Richmond upon Thames, Kingston upon Thames, Hounslow, Haringey, Enfield, Waltham Forest, Redbridge, Newham, Barking and Dagenham, Havering, Bexley, Sutton, Barnet, Harrow
- Do NOT return neighborhoods (e.g. use "Lambeth" not "Brixton", "Hackney" not "Shoreditch", "Camden" not "Hampstead")
- name: exact borough name from the list above, matching capitalisation
- matchPercent: integer 75-98, highest first
- tags: 3 short vibe tags (e.g. "Young crowd", "Cafe culture", "Great transport")
- bullets: 3 specific, warm, positive reasons this borough suits them
- searchSlug: lowercase borough name for URL (e.g. "hammersmith-and-fulham")
- Only recommend boroughs where average rents are achievable within their budget
- If a commute destination is given, prioritise boroughs with good transport links to that destination within the stated commute time
- If the person is a student, factor in proximity to universities, student-friendly amenities, and affordable areas
- Tailor the bullet points to reflect their life stage naturally`;

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
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
    setStep(0);
    setAnswers({});
    setPhase('quiz');
    setResults([]);
    setError(null);
  };

  const pct = Math.round((step / STEPS.length) * 100);

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
                    <span className="text-xs text-[#3D3A38]/60 bg-[#F5EBE0] px-3 py-1 rounded-full">{b.avgRent}</span>
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
                    onClick={() => router.push(`/search?location=${encodeURIComponent(b.name)}`)}
                    className="bg-[#1B2E4B] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1B2E4B]/90 transition-colors"
                  >
                    Search listings in {b.name} →
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
          <h2 className="text-3xl font-medium text-[#1B2E4B] mb-2">Find your perfect borough</h2>
          <p className="text-[#3D3A38]/60">Answer a few questions and we'll match you with your ideal London boroughs.</p>
        </div>

        <div className="mb-8">
          <div className="h-1 bg-black/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#D3755A] rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-[#3D3A38]/50 mt-2">Step {step + 1} of {STEPS.length}</p>
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
                const sel = answers[current.id] === o;
                return (
                  <button
                    key={o}
                    onClick={() => {
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
                <span className="text-xl font-medium text-[#D3755A] min-w-[90px]">
                  {fmtRent((answers[current.id] as number) || current.default)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-[#3D3A38]/40">
                <span>{fmtRent(current.min)}</span>
                <span>{fmtRent(current.max)}</span>
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
