'use client';

import { useState } from 'react';
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

const BOROUGH_IMAGES: Record<string, string> = {
  'Hackney': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Hackney_Empire.jpg/800px-Hackney_Empire.jpg',
  'Richmond': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Richmond_Bridge_2008.jpg/800px-Richmond_Bridge_2008.jpg',
  'Brixton': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Brixton_market_day.jpg/800px-Brixton_market_day.jpg',
  'Islington': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Upper_St_Islington.jpg/800px-Upper_St_Islington.jpg',
  'Clapham': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Clapham_Common_-_geograph.org.uk_-_1008.jpg/800px-Clapham_Common_-_geograph.org.uk_-_1008.jpg',
  'Bermondsey': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Shad_Thames_-_geograph.org.uk_-_1531079.jpg/800px-Shad_Thames_-_geograph.org.uk_-_1531079.jpg',
  'Walthamstow': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Walthamstow_Central.jpg/800px-Walthamstow_Central.jpg',
  'Lewisham': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Lewisham_Clock_Tower.jpg/800px-Lewisham_Clock_Tower.jpg',
  'Battersea': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Battersea_Power_Station_2016.jpg/800px-Battersea_Power_Station_2016.jpg',
  'Bethnal Green': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Victoria_Park%2C_Bethnal_Green.jpg/800px-Victoria_Park%2C_Bethnal_Green.jpg',
  'Peckham': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Peckham_-_Rye_Lane.jpg/800px-Peckham_-_Rye_Lane.jpg',
  'Dalston': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Dalston_Junction.jpg/800px-Dalston_Junction.jpg',
  'Stoke Newington': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Stoke_Newington_Church_Street.jpg/800px-Stoke_Newington_Church_Street.jpg',
  'Camberwell': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Camberwell_Green_2.jpg/800px-Camberwell_Green_2.jpg',
  'Shoreditch': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Shoreditch_High_Street_station.jpg/800px-Shoreditch_High_Street_station.jpg',
  'Camden': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Camden_Lock_2.jpg/800px-Camden_Lock_2.jpg',
  'Notting Hill': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Portobello_road.jpg/800px-Portobello_road.jpg',
  'Greenwich': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Greenwich_Park_August_2012.jpg/800px-Greenwich_Park_August_2012.jpg',
  'Hampstead': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Hampstead_Heath_-_geograph.org.uk_-_990829.jpg/800px-Hampstead_Heath_-_geograph.org.uk_-_990829.jpg',
  'Fulham': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Fulham_Palace_-_geograph.org.uk_-_1570898.jpg/800px-Fulham_Palace_-_geograph.org.uk_-_1570898.jpg',
  'Wandsworth': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Wandsworth_town_centre.jpg/800px-Wandsworth_town_centre.jpg',
  'Wimbledon': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Wimbledon_village.jpg/800px-Wimbledon_village.jpg',
  'Canary Wharf': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Canary_Wharf_from_Reuters_Plaza.jpg/800px-Canary_Wharf_from_Reuters_Plaza.jpg',
  'Stratford': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Stratford_Centre.jpg/800px-Stratford_Centre.jpg',
  'Whitechapel': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Whitechapel_Road_E1.jpg/800px-Whitechapel_Road_E1.jpg',
  'Clerkenwell': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Exmouth_Market.jpg/800px-Exmouth_Market.jpg',
  'Hammersmith': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Hammersmith_Bridge_-_geograph.org.uk_-_1070916.jpg/800px-Hammersmith_Bridge_-_geograph.org.uk_-_1070916.jpg',
  'Shepherd Bush': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Shepherds_Bush_Green.jpg/800px-Shepherds_Bush_Green.jpg',
  'Chiswick': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Chiswick_House_-_geograph.org.uk_-_1126891.jpg/800px-Chiswick_House_-_geograph.org.uk_-_1126891.jpg',
  'Ealing': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Ealing_Broadway_Centre.jpg/800px-Ealing_Broadway_Centre.jpg',
  'Tooting': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Tooting_Bec_Common.jpg/800px-Tooting_Bec_Common.jpg',
  'Balham': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Balham_Station.jpg/800px-Balham_Station.jpg',
  'Highbury': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Highbury_Fields.jpg/800px-Highbury_Fields.jpg',
  'Primrose Hill': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Primrose_Hill_-_geograph.org.uk_-_1083833.jpg/800px-Primrose_Hill_-_geograph.org.uk_-_1083833.jpg',
  'Kingston': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Kingston_upon_Thames_-_geograph.org.uk_-_1008.jpg/800px-Kingston_upon_Thames_-_geograph.org.uk_-_1008.jpg',
  'Twickenham': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Twickenham_riverside.jpg/800px-Twickenham_riverside.jpg',
  'Vauxhall': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Vauxhall_Bridge_-_geograph.org.uk_-_1531079.jpg/800px-Vauxhall_Bridge_-_geograph.org.uk_-_1531079.jpg',
  'Elephant and Castle': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Elephant_and_Castle_-_geograph.org.uk_-_1765.jpg/800px-Elephant_and_Castle_-_geograph.org.uk_-_1765.jpg',
  'Borough': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Borough_Market_-_geograph.org.uk_-_1139346.jpg/800px-Borough_Market_-_geograph.org.uk_-_1139346.jpg',
  'Tower Hamlets': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Tower_of_London_-_2012.jpg/800px-Tower_of_London_-_2012.jpg',
  'Bow': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Bow_Church_Cheapside.jpg/800px-Bow_Church_Cheapside.jpg',
  'Crystal Palace': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Crystal_Palace_Park_-_geograph.org.uk_-_1416522.jpg/800px-Crystal_Palace_Park_-_geograph.org.uk_-_1416522.jpg',
  'Kennington': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Kennington_Park.jpg/800px-Kennington_Park.jpg',
  'Forest Hill': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Horniman_Museum_and_Gardens.jpg/800px-Horniman_Museum_and_Gardens.jpg',
  'Kew': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Kew_Gardens_Palm_House%2C_London_-_Sept_2008.jpg/800px-Kew_Gardens_Palm_House%2C_London_-_Sept_2008.jpg',
};
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
- matchPercent: integer 75-98, highest first
- tags: 3 short vibe tags (e.g. "Young crowd", "Cafe culture", "Great transport")
- bullets: 3 specific, warm, positive reasons this borough suits them
- searchSlug: lowercase borough name for URL
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
                  src={BOROUGH_IMAGES[b.name] || DEFAULT_IMG}
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
                <input
                  type="range"
                  min={current.min}
                  max={current.max}
                  step={current.step}
                  value={(answers[current.id] as number) || current.default}
                  onChange={e => setAnswers({ ...answers, [current.id]: parseInt(e.target.value) })}
                  className="flex-1 accent-[#D3755A]"
                />
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
