'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SignInButton } from '@clerk/nextjs';
import { resolveDynamicRedirectUrl } from '@/lib/auth-redirect';
import {
  Compass, ArrowUpRight, ArrowRight, Check, CheckCircle2, Users,
  Layers3, MapPin, CalendarDays, TentTree, Flame, ShieldCheck, Sparkles,
  ChevronRight, Mountain, Backpack, Menu, X,
} from 'lucide-react';

const demoItems = [
  { id: 1, name: 'Shared shelter', detail: '4-person tent · 1 needed', owner: 'A', color: 'bg-[#d7e7b5]', packed: true },
  { id: 2, name: 'Water filter', detail: 'Gravity system · 1 kit', owner: 'M', color: 'bg-[#f4d9a2]', packed: true },
  { id: 3, name: 'First-aid kit', detail: 'Group safety · 1 pack', owner: 'J', color: 'bg-[#f1c6b3]', packed: false },
  { id: 4, name: 'Camp stove + fuel', detail: 'Cooking · 1 set', owner: 'R', color: 'bg-[#cbded7]', packed: false },
];

const faqs = [
  { q: 'Is Cohort just another checklist app?', a: 'No. Cohort is built around a trip and the people going on it. Everyone can see shared gear, who is bringing what, and what is still left to pack.' },
  { q: 'Can friends join without creating a trip?', a: 'Yes. A trip organizer can share an invite code or link. Guests sign in, join the private trip, and work from the same checklist.' },
  { q: 'What happens after a trip is complete?', a: 'Completed trips become read-only records, so the group can look back at what was packed without accidentally changing the final list.' },
];

export function LandingPageView() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [packed, setPacked] = useState<number[]>([1, 2]);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const submitInvite = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = inviteCode.trim().toUpperCase();
    if (code.length < 6) {
      setInviteError('Enter the invite code shared by your organizer.');
      return;
    }
    setInviteError('');
    router.push(`/join/${code}`);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-canvas text-ink">
      <header className="relative z-30 mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link href="/" className="group flex items-center gap-3" aria-label="Cohort home">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink text-pine-100 transition-transform group-hover:-rotate-6">
            <Compass className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[23px] font-semibold tracking-[-.07em]">cohort<span className="text-pine-600">.</span></span>
            <span className="mt-1 font-mono text-[9px] uppercase tracking-[.2em] text-ink-subtle">Go together</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-[13px] font-semibold text-ink-muted md:flex" aria-label="Main navigation">
          <a href="#how-it-works" className="transition hover:text-ink">How it works</a>
          <a href="#field-notes" className="transition hover:text-ink">Field notes</a>
          <a href="#faq" className="transition hover:text-ink">FAQ</a>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <SignInButton mode="modal" fallbackRedirectUrl={resolveDynamicRedirectUrl('/', '/')} forceRedirectUrl={resolveDynamicRedirectUrl('/', '/')}>
            <button className="rounded-full px-4 py-2.5 text-[13px] font-semibold text-ink-muted transition hover:bg-white hover:text-ink">Sign in</button>
          </SignInButton>
          <SignInButton mode="modal" fallbackRedirectUrl={resolveDynamicRedirectUrl('/', '/')} forceRedirectUrl={resolveDynamicRedirectUrl('/', '/')}>
            <button className="group inline-flex items-center gap-2 rounded-full bg-pine-600 px-5 py-3 text-[13px] font-semibold text-white shadow-[0_5px_0_#34521c] transition hover:-translate-y-0.5 hover:bg-pine-700 hover:shadow-[0_7px_0_#34521c]">
              Start planning <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </SignInButton>
        </div>

        <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-canvas-border bg-white md:hidden" aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {mobileMenuOpen && (
        <nav className="relative z-20 mx-5 mb-3 grid gap-1 rounded-2xl border border-canvas-border bg-white p-3 shadow-lg md:hidden" aria-label="Mobile navigation">
          <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-semibold hover:bg-canvas-subtle">How it works</a>
          <a href="#field-notes" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-semibold hover:bg-canvas-subtle">Field notes</a>
          <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-semibold hover:bg-canvas-subtle">FAQ</a>
        </nav>
      )}

      <section className="px-4 pb-16 pt-3 sm:px-8 sm:pb-24 lg:px-10">
        <div className="cohort-grain relative mx-auto max-w-7xl overflow-hidden rounded-[30px] bg-[#172b24] text-[#f3f3ed] sm:rounded-[38px]">
          <div className="cohort-grid absolute inset-0 opacity-50" aria-hidden="true" />
          <div className="absolute -right-24 -top-32 h-[420px] w-[420px] rounded-full border border-white/10 sm:h-[620px] sm:w-[620px]" aria-hidden="true" />
          <div className="absolute -right-8 -top-16 h-[300px] w-[300px] rounded-full border border-white/10 sm:h-[480px] sm:w-[480px]" aria-hidden="true" />
          <div className="relative grid min-h-[590px] items-center gap-12 px-6 py-12 sm:px-10 sm:py-16 lg:min-h-[650px] lg:grid-cols-[1.05fr_.95fr] lg:gap-5 lg:px-16 lg:py-20">
            <div className="cohort-enter relative z-10 max-w-[610px]">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.07] px-3.5 py-2 font-mono text-[10px] uppercase tracking-[.16em] text-[#d7efaa]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#b5e46a] shadow-[0_0_12px_#b5e46a]" />
                Built for the whole crew
              </div>
              <h1 className="max-w-[680px] text-[clamp(3.4rem,7.2vw,6.5rem)] font-semibold leading-[.91] tracking-[-.075em]">
                The trip is better when <span className="font-normal italic text-[#b5e46a]">everyone</span> is ready.
              </h1>
              <p className="mt-7 max-w-[470px] text-[15px] leading-7 text-white/65 sm:text-base">
                One shared plan for the people, the gear, and all the little things that make getting out there feel easy.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <SignInButton mode="modal" fallbackRedirectUrl={resolveDynamicRedirectUrl('/', '/')} forceRedirectUrl={resolveDynamicRedirectUrl('/', '/')}>
                  <button className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#b5e46a] px-6 text-sm font-bold text-[#172b24] transition hover:bg-[#c9f28a]">
                    Build your trip <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </SignInButton>
                <a href="#how-it-works" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-white/20 px-6 text-sm font-semibold text-white transition hover:bg-white/10">
                  Take a look <ChevronRight className="h-4 w-4" />
                </a>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/15 pt-6 text-xs text-white/55">
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#b5e46a]" /> Private by default</span>
                <span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-[#b5e46a]" /> Made for groups</span>
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#b5e46a]" /> No gear left behind</span>
              </div>
            </div>

            <div className="cohort-enter-delay relative mx-auto w-full max-w-[490px] lg:ml-auto lg:mr-0">
              <div className="absolute -right-2 top-5 z-20 hidden -rotate-6 rounded-xl bg-[#f4d9a2] px-4 py-3 text-[#3b3528] shadow-xl sm:block">
                <span className="block font-mono text-[9px] uppercase tracking-[.17em] opacity-60">Crew status</span>
                <span className="mt-1 block text-sm font-semibold">Almost trail-ready</span>
              </div>
              <div className="relative rounded-[26px] border border-white/15 bg-[#f7f7f0] p-4 text-ink shadow-[0_32px_80px_rgba(0,0,0,.28)] sm:p-5">
                <div className="flex items-start justify-between border-b border-[#d8ded1] px-1 pb-4">
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-[.2em] text-pine-700">Shared checklist / 01</div>
                    <h2 className="mt-2 text-[25px] font-semibold tracking-[-.06em]">High Sierra weekend</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted"><MapPin className="h-3.5 w-3.5" /> Tuolumne Meadows, CA</p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e2edcf] text-pine-700"><TentTree className="h-5 w-5" /></span>
                </div>
                <div className="flex items-end justify-between px-1 pb-2 pt-4">
                  <div><span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-subtle">Packing progress</span><p className="mt-1 text-2xl font-semibold tracking-[-.06em]">{packed.length}<span className="text-ink-subtle">/4</span> <span className="text-sm font-medium tracking-normal text-ink-muted">ready</span></p></div>
                  <span className="font-mono text-xs text-pine-700">{Math.round((packed.length / 4) * 100)}%</span>
                </div>
                <div className="mx-1 mb-3 h-2 overflow-hidden rounded-full bg-[#e0e5d9]"><div className="h-full rounded-full bg-pine-600 transition-all duration-500" style={{ width: `${(packed.length / 4) * 100}%` }} /></div>
                <div className="space-y-1">
                  {demoItems.map((item) => {
                    const checked = packed.includes(item.id);
                    return (
                      <button key={item.id} type="button" onClick={() => setPacked((prev) => checked ? prev.filter((id) => id !== item.id) : [...prev, item.id])} className="group flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-[#ecefe6]">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition ${checked ? 'border-pine-600 bg-pine-600 text-white' : 'border-[#b9c3b3] bg-white text-transparent'}`}><Check className="h-3.5 w-3.5" /></span>
                        <span className="min-w-0 flex-1"><span className={`block truncate text-[13px] font-semibold ${checked ? 'text-ink' : 'text-ink-muted'}`}>{item.name}</span><span className="mt-1 block truncate text-[10px] text-ink-subtle">{item.detail}</span></span>
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${item.color}`}>{item.owner}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-2xl bg-[#e9eee2] px-4 py-3">
                  <div className="flex -space-x-2"><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#e9eee2] bg-[#e8c6aa] text-[9px] font-bold">A</span><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#e9eee2] bg-[#c4d9d1] text-[9px] font-bold">M</span><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#e9eee2] bg-[#e6d39d] text-[9px] font-bold">J</span><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#e9eee2] bg-white text-[9px] font-bold">+2</span></div>
                  <span className="font-mono text-[9px] uppercase tracking-[.13em] text-ink-muted">5 people · one plan</span>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-2 hidden -rotate-3 items-center gap-2 rounded-xl border border-[#d5e2c4] bg-[#e9f2dd] px-4 py-3 text-xs font-semibold text-pine-800 shadow-lg sm:flex"><Sparkles className="h-4 w-4" /> Less scrambling. More outside.</div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-12 sm:px-8 sm:py-20 lg:grid-cols-[.75fr_1.25fr] lg:gap-20 lg:px-10">
        <div className="max-w-md">
          <p className="font-mono text-[10px] uppercase tracking-[.2em] text-pine-700">The method / no. 01</p>
          <h2 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-.065em] sm:text-5xl">Good trips start before you leave.</h2>
          <p className="mt-5 text-sm leading-7 text-ink-muted">The group chat is for the jokes. Cohort keeps the plan, the responsibilities, and the last-minute details in one place.</p>
          <form onSubmit={submitInvite} className="mt-8 rounded-[22px] border border-canvas-border bg-white p-4 shadow-[0_8px_30px_rgba(23,43,36,.04)]">
            <label htmlFor="invite-code" className="mb-2 block font-mono text-[10px] uppercase tracking-[.16em] text-ink-muted">Already have an invite?</label>
            <div className="flex gap-2">
              <input id="invite-code" value={inviteCode} onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setInviteError(''); }} placeholder="ENTER CODE" maxLength={16} autoCapitalize="characters" className="min-w-0 flex-1 rounded-xl border border-canvas-border bg-canvas px-3.5 py-3 font-mono text-sm uppercase tracking-[.13em] outline-none transition placeholder:text-ink-subtle/60 focus:border-pine-600 focus:ring-2 focus:ring-pine-600/15" />
              <button type="submit" aria-label="Join trip with invite code" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink text-white transition hover:bg-pine-700"><ArrowRight className="h-5 w-5" /></button>
            </div>
            {inviteError && <p role="alert" className="mt-2 text-xs font-medium text-terracotta-700">{inviteError}</p>}
            <p className="mt-2 text-[11px] text-ink-subtle">Private trips are only visible to invited members.</p>
          </form>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <article className="group rounded-[24px] border border-canvas-border bg-white p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/5 sm:p-7">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e4edda] text-pine-700"><Users className="h-5 w-5" /></span>
            <p className="mt-8 font-mono text-[10px] uppercase tracking-[.17em] text-ink-subtle">01 / Share the load</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-.04em]">One crew. One checklist.</h3>
            <p className="mt-3 text-sm leading-6 text-ink-muted">Assign gear, quantities, and ownership so the essentials are covered without ten duplicate messages.</p>
          </article>
          <article className="group rounded-[24px] border border-canvas-border bg-white p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/5 sm:p-7">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f8e9c9] text-[#85520a]"><Layers3 className="h-5 w-5" /></span>
            <p className="mt-8 font-mono text-[10px] uppercase tracking-[.17em] text-ink-subtle">02 / Start with a system</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-.04em]">Reuse your good lists.</h3>
            <p className="mt-3 text-sm leading-6 text-ink-muted">Keep personal packing templates and bring the right starting point to every new adventure.</p>
          </article>
          <article className="group rounded-[24px] border border-canvas-border bg-white p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/5 sm:p-7">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f7e0d5] text-terracotta-700"><ShieldCheck className="h-5 w-5" /></span>
            <p className="mt-8 font-mono text-[10px] uppercase tracking-[.17em] text-ink-subtle">03 / Keep the record</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-.04em]">Finish with confidence.</h3>
            <p className="mt-3 text-sm leading-6 text-ink-muted">Completed trips lock their final checklist, keeping a dependable record for the next time around.</p>
          </article>
          <article className="relative overflow-hidden rounded-[24px] bg-[#dce8cc] p-6 sm:p-7">
            <div className="absolute -bottom-10 -right-7 text-pine-700/10"><Mountain className="h-44 w-44" strokeWidth={1} /></div>
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-pine-800"><Backpack className="h-5 w-5" /></span>
            <p className="relative mt-8 font-mono text-[10px] uppercase tracking-[.17em] text-pine-800/70">The point of it all</p>
            <h3 className="relative mt-2 text-xl font-semibold tracking-[-.04em] text-pine-900">More trail time. Less admin.</h3>
            <p className="relative mt-3 text-sm leading-6 text-pine-900/75">Spend less time coordinating and more time making the memories you planned for.</p>
          </article>
        </div>
      </section>

      <section id="field-notes" className="px-5 py-10 sm:px-8 sm:py-16 lg:px-10">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[28px] bg-[#e8e9df] md:grid-cols-[.9fr_1.1fr]">
          <div className="p-7 sm:p-10 lg:p-14">
            <p className="font-mono text-[10px] uppercase tracking-[.2em] text-pine-700">Field notes / the philosophy</p>
            <h2 className="mt-4 max-w-md text-4xl font-semibold leading-[1.02] tracking-[-.065em] sm:text-5xl">The best gear is the gear you remembered.</h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-ink-muted">A small amount of shared planning makes a big difference. Know what is covered, who is bringing it, and what still needs attention before the trailhead.</p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/60 px-4 py-2.5 text-xs font-semibold"><CalendarDays className="h-4 w-4 text-pine-700" /> Plan together, then go.</div>
          </div>
          <div className="relative flex min-h-[300px] items-end overflow-hidden bg-[#243b2f] p-7 text-white sm:min-h-[420px] sm:p-10">
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(ellipse at 70% 25%, #b5e46a 0, transparent 28%), linear-gradient(155deg, transparent 35%, #0c1b14 35.2%, #0c1b14 49%, transparent 49.2%), linear-gradient(25deg, transparent 40%, #5c7a4c 40.2%, #5c7a4c 58%, transparent 58.2%)' }} />
            <div className="absolute inset-0 cohort-grid opacity-20" />
            <div className="relative max-w-md">
              <Flame className="mb-5 h-7 w-7 text-[#b5e46a]" />
              <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#b5e46a]">A better kind of together</p>
              <p className="mt-3 text-3xl font-medium leading-tight tracking-[-.05em] sm:text-4xl">You bring the people. We’ll help with the details.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-[.2em] text-pine-700">Field guide / FAQ</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-.065em] sm:text-5xl">Before you head out.</h2>
        </div>
        <div className="mt-10 divide-y divide-canvas-border border-y border-canvas-border">
          {faqs.map((faq, index) => (
            <div key={faq.q}>
              <button type="button" aria-expanded={faqOpen === index} onClick={() => setFaqOpen(faqOpen === index ? null : index)} className="flex w-full items-center justify-between gap-4 py-5 text-left text-sm font-semibold sm:py-6 sm:text-base">
                {faq.q}<span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${faqOpen === index ? 'rotate-90 bg-ink text-white' : 'bg-white text-ink-muted'}`}><ChevronRight className="h-4 w-4" /></span>
              </button>
              {faqOpen === index && <p className="max-w-2xl pb-6 pr-10 text-sm leading-7 text-ink-muted">{faq.a}</p>}
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-canvas-border bg-[#e9ece3] px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-pine-100"><Compass className="h-4 w-4" /></span>
            <span><span className="block text-lg font-semibold tracking-[-.06em]">cohort<span className="text-pine-600">.</span></span><span className="block font-mono text-[9px] uppercase tracking-[.17em] text-ink-subtle">Make room for the good part</span></span>
          </Link>
          <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-ink-muted"><a href="#how-it-works" className="hover:text-ink">How it works</a><a href="#faq" className="hover:text-ink">FAQ</a><SignInButton mode="modal" fallbackRedirectUrl={resolveDynamicRedirectUrl('/', '/')} forceRedirectUrl={resolveDynamicRedirectUrl('/', '/')}><button className="inline-flex items-center gap-1 hover:text-ink">Get started <ArrowUpRight className="h-3.5 w-3.5" /></button></SignInButton></div>
          <p className="font-mono text-[10px] uppercase tracking-[.12em] text-ink-subtle">Made for the miles ahead.</p>
        </div>
      </footer>
    </main>
  );
}
