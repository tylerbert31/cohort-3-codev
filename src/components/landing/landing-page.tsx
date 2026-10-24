'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SignInButton } from '@clerk/nextjs';
import { resolveDynamicRedirectUrl } from '@/lib/auth-redirect';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Compass,
  CheckCircle2,
  Users,
  ArrowRight,
  Sparkles,
  KeyRound,
  Layers,
  Lock,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  Check,
  AlertCircle,
  Tent,
  Flame,
  HeartPulse,
} from 'lucide-react';

interface MockGearItem {
  id: string;
  name: string;
  category: 'camp' | 'cook' | 'safety';
  assignee: string;
  assigneeInitial: string;
  quantity: string;
  isPacked: boolean;
  isShared: boolean;
}

const INITIAL_MOCK_ITEMS: MockGearItem[] = [
  {
    id: 'item-1',
    name: 'MSR WindBurner Stove & 2x Isobutane Fuel',
    category: 'cook',
    assignee: 'Jordan',
    assigneeInitial: 'J',
    quantity: '1 kit',
    isPacked: true,
    isShared: true,
  },
  {
    id: 'item-2',
    name: 'BearVault BV500 Food Canisters',
    category: 'camp',
    assignee: 'Alex',
    assigneeInitial: 'A',
    quantity: '2 units',
    isPacked: true,
    isShared: true,
  },
  {
    id: 'item-3',
    name: 'Wilderness Trauma Kit & Sam Splint',
    category: 'safety',
    assignee: 'Sam',
    assigneeInitial: 'S',
    quantity: '1 pack',
    isPacked: true,
    isShared: true,
  },
  {
    id: 'item-4',
    name: '4-Person Ultralight Backcountry Shelter',
    category: 'camp',
    assignee: 'Alex',
    assigneeInitial: 'A',
    quantity: '1 tent',
    isPacked: false,
    isShared: true,
  },
  {
    id: 'item-5',
    name: 'Gravity Water Filter System (Katadyn 6L)',
    category: 'cook',
    assignee: 'Taylor',
    assigneeInitial: 'T',
    quantity: '1 system',
    isPacked: false,
    isShared: true,
  },
  {
    id: 'item-6',
    name: 'Satellite SOS Communicator (Garmin inReach)',
    category: 'safety',
    assignee: 'Jordan',
    assigneeInitial: 'J',
    quantity: '1 unit',
    isPacked: false,
    isShared: true,
  },
];

export function LandingPageView() {
  const router = useRouter();

  // Interactive Live Demo State
  const [mockItems, setMockItems] = useState<MockGearItem[]>(INITIAL_MOCK_ITEMS);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'camp' | 'cook' | 'safety'>('all');
  const [lastInteractedItem, setLastInteractedItem] = useState<string | null>(null);

  // Quick Invite Code Form State
  const [quickCodeInput, setQuickCodeInput] = useState('');
  const [quickCodeError, setQuickCodeError] = useState<string | null>(null);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleMockItem = (id: string) => {
    setMockItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextPacked = !item.isPacked;
          setLastInteractedItem(nextPacked ? `Packed: ${item.name}` : `Unpacked: ${item.name}`);
          return { ...item, isPacked: nextPacked };
        }
        return item;
      })
    );
  };

  const filteredItems = mockItems.filter((item) => {
    if (activeCategoryFilter === 'all') return true;
    return item.category === activeCategoryFilter;
  });

  const packedCount = mockItems.filter((i) => i.isPacked).length;
  const totalCount = mockItems.length;
  const packedPercent = Math.round((packedCount / totalCount) * 100);

  const handleQuickCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = quickCodeInput.trim().toUpperCase();
    if (!clean) {
      setQuickCodeError('Please enter an invite code.');
      return;
    }
    if (clean.length < 6) {
      setQuickCodeError('Invite codes are typically 8 characters long.');
      return;
    }
    setQuickCodeError(null);
    router.push(`/join/${clean}`);
  };

  const currentRedirectUrl = typeof window !== 'undefined' ? window.location.origin : '/';

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink antialiased selection:bg-pine-100 selection:text-pine-800">
      {/* Top Navigation Bar */}
      <header
        role="banner"
        className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-canvas-border px-4 py-3 sm:px-6 transition-colors"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600"
            aria-label="cohort home"
          >
            <div className="w-8 h-8 rounded-lg bg-pine-600 text-white flex items-center justify-center shadow-xs">
              <Compass className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="font-serif font-bold text-2xl tracking-tight text-ink">cohort</span>
            <span className="hidden sm:inline-flex items-center text-xs text-ink-muted font-medium bg-canvas-subtle px-2 py-0.5 rounded-full border border-canvas-border ml-1">
              Trailhead Notes
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1.5" aria-label="Landing Navigation">
            <a
              href="#features"
              className="px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink hover:bg-canvas-subtle rounded-lg transition-colors"
            >
              Features
            </a>
            <a
              href="#demo"
              className="px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink hover:bg-canvas-subtle rounded-lg transition-colors"
            >
              Field Demo
            </a>
            <a
              href="#how-it-works"
              className="px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink hover:bg-canvas-subtle rounded-lg transition-colors"
            >
              How It Works
            </a>
            <a
              href="#faq"
              className="px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink hover:bg-canvas-subtle rounded-lg transition-colors"
            >
              FAQ
            </a>
          </nav>

          {/* Right CTAs */}
          <div className="flex items-center gap-2.5">
            <a
              href="#join-strip"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-ink-muted hover:text-ink px-3 py-2 rounded-lg hover:bg-canvas-subtle transition-colors min-h-[44px]"
            >
              <KeyRound className="w-3.5 h-3.5 text-pine-600" />
              <span>Have a Code?</span>
            </a>

            <SignInButton
              mode="modal"
              fallbackRedirectUrl={resolveDynamicRedirectUrl(currentRedirectUrl, '/')}
              forceRedirectUrl={resolveDynamicRedirectUrl(currentRedirectUrl, '/')}
            >
              <button
                type="button"
                className="inline-flex items-center justify-center text-xs sm:text-sm font-medium text-ink hover:text-pine-700 px-3 py-2 rounded-lg hover:bg-canvas-subtle transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600"
              >
                Sign In
              </button>
            </SignInButton>

            <SignInButton
              mode="modal"
              fallbackRedirectUrl={resolveDynamicRedirectUrl(currentRedirectUrl, '/')}
              forceRedirectUrl={resolveDynamicRedirectUrl(currentRedirectUrl, '/')}
            >
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-pine-600 text-white text-xs sm:text-sm font-semibold hover:bg-pine-700 shadow-xs transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600"
              >
                <span>Start a Trip</span>
                <ArrowRight className="w-4 h-4 hidden sm:inline" />
              </button>
            </SignInButton>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section
          aria-labelledby="hero-title"
          className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6 overflow-hidden border-b border-canvas-border/80 bg-gradient-to-b from-canvas via-canvas to-canvas-subtle/50"
        >
          <div className="max-w-5xl mx-auto text-center space-y-6">
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-canvas-card border border-canvas-border shadow-xs">
              <span className="w-2 h-2 rounded-full bg-pine-500 animate-pulse" />
              <span className="text-xs font-semibold tracking-wide uppercase text-pine-700">
                Tactile Group Expedition Logistics
              </span>
            </div>

            {/* Main Headline */}
            <h1
              id="hero-title"
              className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-ink tracking-tight max-w-4xl mx-auto leading-[1.12]"
            >
              No more forgotten stoves.{' '}
              <span className="text-pine-700 underline decoration-pine-300 decoration-wavy decoration-1 underline-offset-8">
                Pack group trips
              </span>{' '}
              without the chaos.
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-xl text-ink-muted leading-relaxed max-w-2xl mx-auto font-sans">
              The collaborative packing coordinator for camping trips, backcountry treks, and friend getaways.
              Assign shared gear, split the weight, and wrap up every adventure into a permanent field log.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
              <SignInButton
                mode="modal"
                fallbackRedirectUrl={resolveDynamicRedirectUrl(currentRedirectUrl, '/')}
                forceRedirectUrl={resolveDynamicRedirectUrl(currentRedirectUrl, '/')}
              >
                <button
                  type="button"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-pine-600 text-white font-semibold text-base hover:bg-pine-700 shadow-sm hover:shadow transition-all min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600"
                >
                  <span>Plan Your First Trip</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </SignInButton>

              <a
                href="#demo"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white border border-canvas-border text-ink font-medium text-base hover:bg-canvas-subtle hover:border-ink-subtle transition-all min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600"
              >
                <Sparkles className="w-4 h-4 text-pine-600" />
                <span>Try Live Demo</span>
              </a>
            </div>

            {/* Value Indicators */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs sm:text-sm text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-pine-600" />
                <span>Zero spreadsheet headaches</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-pine-600" />
                <span>1-Tap Google Sign-In</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-pine-600" />
                <span>Works on phones at the trailhead</span>
              </span>
            </div>
          </div>
        </section>

        {/* Quick Invite Code Strip */}
        <section
          id="join-strip"
          aria-labelledby="join-strip-heading"
          className="bg-white border-b border-canvas-border py-8 px-4 sm:px-6"
        >
          <div className="max-w-4xl mx-auto bg-canvas-card rounded-2xl border border-canvas-border p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-pine-100 text-pine-700">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h2 id="join-strip-heading" className="text-lg font-serif font-bold text-ink">
                  Invited by a friend?
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-ink-muted max-w-lg">
                Enter the 8-character invite code from your trip organizer to review the packing list and claim your gear.
              </p>
            </div>

            <form onSubmit={handleQuickCodeSubmit} className="flex flex-col sm:flex-row items-stretch gap-2.5 shrink-0">
              <div className="relative">
                <input
                  type="text"
                  maxLength={12}
                  placeholder="e.g. 7K2M9XP4"
                  value={quickCodeInput}
                  onChange={(e) => {
                    setQuickCodeInput(e.target.value.toUpperCase());
                    if (quickCodeError) setQuickCodeError(null);
                  }}
                  className="w-full sm:w-44 px-3.5 py-2.5 rounded-xl border border-canvas-border bg-canvas-subtle font-mono text-sm tracking-widest uppercase font-semibold text-ink placeholder:text-ink-subtle focus:bg-white focus:border-pine-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 min-h-[44px]"
                  aria-label="Expedition invite code"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-pine-600 text-white text-sm font-semibold hover:bg-pine-700 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 shadow-xs"
              >
                <span>Join Trip</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
          {quickCodeError && (
            <p className="max-w-4xl mx-auto mt-2 text-xs text-terracotta-600 font-medium flex items-center gap-1 px-2">
              <AlertCircle className="w-3.5 h-3.5" />
              {quickCodeError}
            </p>
          )}
        </section>

        {/* Interactive "Trailhead Field Log" Live Demo */}
        <section
          id="demo"
          aria-labelledby="demo-heading"
          className="py-16 sm:py-24 px-4 sm:px-6 max-w-5xl mx-auto"
        >
          <div className="text-center space-y-3 mb-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pine-100 text-pine-700 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Interactive Field Simulation</span>
            </div>
            <h2 id="demo-heading" className="text-2xl sm:text-4xl font-serif font-bold text-ink">
              Experience the Trailhead Field Log
            </h2>
            <p className="text-sm sm:text-base text-ink-muted max-w-xl mx-auto">
              Tap checkmarks below to simulate packing gear in real-time. Notice how the readiness meter advances and responsibilities remain crystal clear.
            </p>
          </div>

          {/* Interactive Mock Card */}
          <div className="bg-canvas-card rounded-2xl border border-canvas-border shadow-md overflow-hidden">
            {/* Header / Trip Metadata */}
            <div className="p-5 sm:p-6 border-b border-canvas-border bg-canvas-subtle/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-mono font-semibold text-pine-700 bg-pine-100 px-2 py-0.5 rounded">
                    LIVE FIELD LOG
                  </span>
                  <Badge variant="neutral">Yosemite Wilderness</Badge>
                </div>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-ink">
                  High Sierra 4-Day Ridge Traverse
                </h3>
                <div className="flex items-center gap-4 text-xs text-ink-muted mt-1.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-pine-600" />
                    Tuolumne Meadows, CA
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-pine-600" />
                    Aug 14 – Aug 18
                  </span>
                </div>
              </div>

              {/* Expedition Members Face Pile */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-muted font-medium">Cohort:</span>
                <div className="flex -space-x-2">
                  <span
                    title="Alex (Organizer)"
                    className="w-8 h-8 rounded-full bg-pine-700 text-white text-xs font-bold flex items-center justify-center border-2 border-white ring-1 ring-canvas-border"
                  >
                    A
                  </span>
                  <span
                    title="Sam (Collaborator)"
                    className="w-8 h-8 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center border-2 border-white ring-1 ring-canvas-border"
                  >
                    S
                  </span>
                  <span
                    title="Jordan (Collaborator)"
                    className="w-8 h-8 rounded-full bg-slate-700 text-white text-xs font-bold flex items-center justify-center border-2 border-white ring-1 ring-canvas-border"
                  >
                    J
                  </span>
                  <span
                    title="Taylor (Collaborator)"
                    className="w-8 h-8 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center border-2 border-white ring-1 ring-canvas-border"
                  >
                    T
                  </span>
                </div>
              </div>
            </div>

            {/* Readiness Meter */}
            <div className="p-5 sm:p-6 border-b border-canvas-border bg-white">
              <div className="flex items-center justify-between text-xs sm:text-sm font-medium mb-2">
                <span className="flex items-center gap-1.5 text-ink">
                  <CheckCircle2 className="w-4 h-4 text-pine-600" />
                  <span>
                    <strong>{packedCount}</strong> of <strong>{totalCount}</strong> shared expedition essentials ready
                  </span>
                </span>
                <span className="font-mono font-bold text-pine-700">{packedPercent}%</span>
              </div>
              <Progress value={packedPercent} variant="pine" />

              {lastInteractedItem && (
                <div className="mt-3 text-xs text-pine-700 bg-pine-50 border border-pine-200 rounded-lg px-3 py-1.5 flex items-center gap-1.5 animate-fadeIn">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>{lastInteractedItem} · Real-time status synced to all members.</span>
                </div>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="px-5 sm:px-6 pt-4 pb-2 flex items-center gap-1.5 overflow-x-auto border-b border-canvas-border/60 bg-canvas-subtle/20">
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px] ${
                  activeCategoryFilter === 'all'
                    ? 'bg-pine-600 text-white font-semibold'
                    : 'text-ink-muted hover:text-ink hover:bg-canvas-subtle'
                }`}
              >
                All Gear ({mockItems.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('camp')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px] flex items-center gap-1.5 ${
                  activeCategoryFilter === 'camp'
                    ? 'bg-pine-600 text-white font-semibold'
                    : 'text-ink-muted hover:text-ink hover:bg-canvas-subtle'
                }`}
              >
                <Tent className="w-3 h-3" />
                <span>Shelter & Camp</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('cook')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px] flex items-center gap-1.5 ${
                  activeCategoryFilter === 'cook'
                    ? 'bg-pine-600 text-white font-semibold'
                    : 'text-ink-muted hover:text-ink hover:bg-canvas-subtle'
                }`}
              >
                <Flame className="w-3 h-3" />
                <span>Cook & Water</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('safety')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px] flex items-center gap-1.5 ${
                  activeCategoryFilter === 'safety'
                    ? 'bg-pine-600 text-white font-semibold'
                    : 'text-ink-muted hover:text-ink hover:bg-canvas-subtle'
                }`}
              >
                <HeartPulse className="w-3 h-3" />
                <span>Trauma & Safety</span>
              </button>
            </div>

            {/* Interactive Checklist Rows */}
            <div className="p-3 sm:p-4 space-y-2 divide-y divide-canvas-border/40">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleMockItem(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      toggleMockItem(item.id);
                    }
                  }}
                  role="checkbox"
                  aria-checked={item.isPacked}
                  tabIndex={0}
                  className={`pt-2.5 first:pt-0 group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                    item.isPacked
                      ? 'bg-canvas-subtle/40 border-canvas-border/60'
                      : 'bg-white hover:bg-pine-50/30 border-canvas-border hover:border-pine-300'
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 min-h-[52px]`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Checkbox Target */}
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        item.isPacked
                          ? 'bg-pine-600 border-pine-600 text-white'
                          : 'border-canvas-border group-hover:border-pine-600 bg-white'
                      }`}
                    >
                      {item.isPacked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </div>

                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium truncate transition-colors ${
                          item.isPacked ? 'line-through text-ink-muted' : 'text-ink font-semibold'
                        }`}
                      >
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-ink-muted mt-0.5">
                        <span className="font-mono">{item.quantity}</span>
                        <span>·</span>
                        <span className="capitalize">{item.category}</span>
                      </div>
                    </div>
                  </div>

                  {/* Assignee Chip */}
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="hidden sm:inline-flex text-xs text-ink-muted font-medium">
                      Assigned to
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-canvas-subtle border border-canvas-border text-xs font-semibold text-ink">
                      <span className="w-4 h-4 rounded-full bg-pine-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {item.assigneeInitial}
                      </span>
                      <span>{item.assignee}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Simulation Hint */}
            <div className="px-5 py-3.5 bg-canvas-subtle/50 border-t border-canvas-border text-center text-xs text-ink-muted flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-pine-600" />
              <span>Tap any row above to test the live packing experience.</span>
            </div>
          </div>
        </section>

        {/* Feature Bento Grid */}
        <section
          id="features"
          aria-labelledby="features-heading"
          className="py-16 sm:py-24 px-4 sm:px-6 bg-canvas-subtle/40 border-y border-canvas-border/80"
        >
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs font-semibold tracking-wider uppercase text-pine-700 bg-pine-100 px-3 py-1 rounded-full">
                Tactile Field Features
              </span>
              <h2 id="features-heading" className="text-2xl sm:text-4xl font-serif font-bold text-ink">
                Built for the trailhead, not the boardroom
              </h2>
              <p className="text-sm sm:text-base text-ink-muted max-w-xl mx-auto">
                No sprint boards or complex Gantt charts. Just the essential coordination tools required to get your group into the wilderness fully equipped.
              </p>
            </div>

            {/* Bento Grid (4 Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Feature 1 */}
              <div className="bg-canvas-card rounded-2xl border border-canvas-border p-6 sm:p-8 flex flex-col justify-between hover:shadow-sm transition-all group">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-pine-50 border border-pine-200 text-pine-700 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                    <Users className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <h3 className="text-xl font-serif font-bold text-ink mb-2">
                    Collaborative Gear Assignment
                  </h3>
                  <p className="text-sm text-ink-muted leading-relaxed">
                    Prevent the classic mistake of 3 people hauling heavy camp stoves while no one remembers the matches. Designate shared essentials, assign owners, and track who carries what.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-canvas-border/60 flex items-center justify-between text-xs text-ink-muted">
                  <span className="font-medium text-pine-700">Group vs. Personal tracking</span>
                  <span className="font-mono">Split the haul</span>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-canvas-card rounded-2xl border border-canvas-border p-6 sm:p-8 flex flex-col justify-between hover:shadow-sm transition-all group">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                    <KeyRound className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <h3 className="text-xl font-serif font-bold text-ink mb-2">
                    Frictionless 8-Character Invites
                  </h3>
                  <p className="text-sm text-ink-muted leading-relaxed">
                    Drop a clean invite code or link into your group chat. Your friends can view the expedition and see what gear is needed before signing in with a single Google tap.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-canvas-border/60 flex items-center justify-between text-xs text-ink-muted">
                  <span className="font-medium text-amber-700">No account required to preview</span>
                  <span className="font-mono">8-char codes</span>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="bg-canvas-card rounded-2xl border border-canvas-border p-6 sm:p-8 flex flex-col justify-between hover:shadow-sm transition-all group">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-pine-50 border border-pine-200 text-pine-700 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                    <Layers className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <h3 className="text-xl font-serif font-bold text-ink mb-2">
                    Curated Expedition Templates
                  </h3>
                  <p className="text-sm text-ink-muted leading-relaxed">
                    Never start from a blank slate. Launch your adventure from field-tested packing checklists for Weekend Backpacking, Alpine Climbing, Desert Overnights, and Car Camping.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-canvas-border/60 flex items-center justify-between text-xs text-ink-muted">
                  <span className="font-medium text-pine-700">Pre-built categories & gear</span>
                  <span className="font-mono">1-click import</span>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="bg-canvas-card rounded-2xl border border-canvas-border p-6 sm:p-8 flex flex-col justify-between hover:shadow-sm transition-all group">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                    <Lock className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <h3 className="text-xl font-serif font-bold text-ink mb-2">
                    Permanent Trailhead Logbook
                  </h3>
                  <p className="text-sm text-ink-muted leading-relaxed">
                    When the vehicles depart the trailhead, wrap up the expedition. It locks permanently into your field log archive, preserving memories and serving as a blueprint for next year.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-canvas-border/60 flex items-center justify-between text-xs text-ink-muted">
                  <span className="font-medium text-slate-700">Immutable historical records</span>
                  <span className="font-mono">Field log archive</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section
          id="how-it-works"
          aria-labelledby="how-it-works-heading"
          className="py-16 sm:py-24 px-4 sm:px-6 max-w-5xl mx-auto"
        >
          <div className="text-center space-y-3 mb-14">
            <span className="text-xs font-semibold tracking-wider uppercase text-pine-700 bg-pine-100 px-3 py-1 rounded-full">
              3 Simple Steps
            </span>
            <h2 id="how-it-works-heading" className="text-2xl sm:text-4xl font-serif font-bold text-ink">
              From trailhead planning to campout departure
            </h2>
            <p className="text-sm sm:text-base text-ink-muted max-w-xl mx-auto">
              How outdoor groups use cohort to get out into nature prepared and stress-free.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="bg-canvas-card rounded-2xl border border-canvas-border p-6 relative flex flex-col">
              <span className="font-serif font-bold text-4xl text-pine-200 mb-4">01</span>
              <h3 className="text-lg font-serif font-bold text-ink mb-2">
                Assemble the Expedition
              </h3>
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                Give your trip a name, dates, and destination. Kickstart your checklist with a proven template or draft your custom gear categories.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-canvas-card rounded-2xl border border-canvas-border p-6 relative flex flex-col">
              <span className="font-serif font-bold text-4xl text-pine-200 mb-4">02</span>
              <h3 className="text-lg font-serif font-bold text-ink mb-2">
                Invite Cohort & Split Load
              </h3>
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                Send your 8-character invite code in group messages. Teammates claim gear items, pledge quantities, and check off their backpacks.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-canvas-card rounded-2xl border border-canvas-border p-6 relative flex flex-col">
              <span className="font-serif font-bold text-4xl text-pine-200 mb-4">03</span>
              <h3 className="text-lg font-serif font-bold text-ink mb-2">
                Tailgate Check & Wrap Up
              </h3>
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                Do a quick final sweep at the trailhead tailgate. Lock the list into a completed trip log to preserve a permanent record of the adventure.
              </p>
            </div>
          </div>
        </section>

        {/* Why cohort vs Spreadsheets / Chat apps */}
        <section
          aria-labelledby="comparison-heading"
          className="py-16 sm:py-20 px-4 sm:px-6 bg-canvas-subtle/50 border-y border-canvas-border/80"
        >
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h2 id="comparison-heading" className="text-2xl sm:text-3xl font-serif font-bold text-ink">
                Why outdoor lovers ditch group spreadsheets
              </h2>
              <p className="text-xs sm:text-sm text-ink-muted">
                Spreadsheets were built for quarterly earnings, not packing backpacks at a trailhead tailgate.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Spreadsheets Column */}
              <div className="bg-canvas-card rounded-2xl border border-canvas-border p-6 space-y-4 opacity-90">
                <div className="flex items-center gap-2 pb-3 border-b border-canvas-border">
                  <span className="w-2.5 h-2.5 rounded-full bg-terracotta-500" />
                  <h3 className="font-semibold text-ink text-sm sm:text-base">
                    Messy Spreadsheets & Chat Threads
                  </h3>
                </div>
                <ul className="space-y-3 text-xs sm:text-sm text-ink-muted">
                  <li className="flex items-start gap-2">
                    <span className="text-terracotta-500 font-bold">✕</span>
                    <span>Pinch-zooming tiny cells on mobile with dirty camp hands.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-terracotta-500 font-bold">✕</span>
                    <span>Accidentally overwriting a friend&apos;s gear row or deleting formulas.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-terracotta-500 font-bold">✕</span>
                    <span>Lost spreadsheet links buried 200 messages deep in chat history.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-terracotta-500 font-bold">✕</span>
                    <span>No clear distinction between group essentials and personal items.</span>
                  </li>
                </ul>
              </div>

              {/* cohort Column */}
              <div className="bg-canvas-card rounded-2xl border-2 border-pine-600/70 p-6 space-y-4 shadow-sm relative">
                <div className="flex items-center gap-2 pb-3 border-b border-canvas-border">
                  <span className="w-2.5 h-2.5 rounded-full bg-pine-600" />
                  <h3 className="font-semibold text-pine-800 text-sm sm:text-base flex items-center justify-between flex-1">
                    <span>cohort Trailhead Notes</span>
                    <Badge variant="pending">Built for Adventure</Badge>
                  </h3>
                </div>
                <ul className="space-y-3 text-xs sm:text-sm text-ink">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-pine-600 shrink-0 mt-0.5" />
                    <span>Large 44px touch targets made for single-thumb checking on phones.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-pine-600 shrink-0 mt-0.5" />
                    <span>Instant real-time sync with clear assignee face chips.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-pine-600 shrink-0 mt-0.5" />
                    <span>Permanent 8-character invite codes and direct shareable links.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-pine-600 shrink-0 mt-0.5" />
                    <span>Permanent historical logbook lock once your crew hits the trail.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials / Social Proof */}
        <section
          aria-labelledby="testimonials-heading"
          className="py-16 sm:py-20 px-4 sm:px-6 max-w-5xl mx-auto"
        >
          <div className="text-center space-y-2 mb-10">
            <span className="text-xs font-semibold tracking-wider uppercase text-pine-700 bg-pine-100 px-3 py-1 rounded-full">
              Trailhead Field Proof
            </span>
            <h2 id="testimonials-heading" className="text-2xl sm:text-3xl font-serif font-bold text-ink">
              Trusted by expedition leads and weekend campers
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <blockquote className="bg-canvas-card rounded-2xl border border-canvas-border p-6 sm:p-7 flex flex-col justify-between space-y-4">
              <p className="text-sm sm:text-base text-ink-muted italic leading-relaxed">
                &ldquo;We used to have three separate group chats asking &apos;who has the water filter?&apos;. With cohort, six of us packed for a 4-day Olympic wilderness trek without a single missing item or duplicate gear.&rdquo;
              </p>
              <footer className="flex items-center gap-3 pt-3 border-t border-canvas-border/60">
                <div className="w-9 h-9 rounded-full bg-pine-700 text-white font-bold text-xs flex items-center justify-center">
                  AR
                </div>
                <div>
                  <cite className="not-italic font-semibold text-sm text-ink block">Alex Rivera</cite>
                  <span className="text-xs text-ink-muted">PNW Backpacking Club Organizer</span>
                </div>
              </footer>
            </blockquote>

            <blockquote className="bg-canvas-card rounded-2xl border border-canvas-border p-6 sm:p-7 flex flex-col justify-between space-y-4">
              <p className="text-sm sm:text-base text-ink-muted italic leading-relaxed">
                &ldquo;The wrap-up feature is brilliant. Being able to reopen our exact High Sierra gear list from last July made packing for this summer&apos;s trip take literally 15 minutes.&rdquo;
              </p>
              <footer className="flex items-center gap-3 pt-3 border-t border-canvas-border/60">
                <div className="w-9 h-9 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center">
                  ES
                </div>
                <div>
                  <cite className="not-italic font-semibold text-sm text-ink block">Elena Soto</cite>
                  <span className="text-xs text-ink-muted">Mountaineering & Camp Guide</span>
                </div>
              </footer>
            </blockquote>
          </div>
        </section>

        {/* FAQ Accordion */}
        <section
          id="faq"
          aria-labelledby="faq-heading"
          className="py-16 sm:py-20 px-4 sm:px-6 bg-canvas-subtle/40 border-t border-canvas-border/80"
        >
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h2 id="faq-heading" className="text-2xl sm:text-3xl font-serif font-bold text-ink">
                Frequently Asked Questions
              </h2>
              <p className="text-xs sm:text-sm text-ink-muted">
                Everything you need to know about planning trips with cohort.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  q: 'Do my friends need to create an account before seeing an invite?',
                  a: 'No! When you send an invite link or 8-character code, your friends can immediately view the expedition details and see what gear is needed. They only sign in with a single Google tap when they are ready to claim gear or check off items.',
                },
                {
                  q: 'Is cohort free to use?',
                  a: 'Yes, cohort is completely free. You can create unlimited trips, invite unlimited collaborators, and access all pre-built expedition templates without paywalls.',
                },
                {
                  q: 'What does "wrapping up" an expedition mean?',
                  a: 'When your group departs the trailhead, the organizer can wrap up the trip. This permanently locks the checklist into a read-only historical field log so you can look back on past adventures and duplicate what worked.',
                },
                {
                  q: 'Can I create and reuse my own packing templates?',
                  a: 'Yes! In addition to our pre-built expedition templates (Weekend Backpacking, Alpine Mountaineering, etc.), you can save custom checklists as personal templates for quick reuse.',
                },
              ].map((item, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="bg-canvas-card rounded-xl border border-canvas-border overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-serif font-bold text-sm sm:text-base text-ink hover:text-pine-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 min-h-[44px]"
                    >
                      <span>{item.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-pine-600 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-ink-subtle shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-ink-muted leading-relaxed border-t border-canvas-border/40 pt-3">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Final CTA Banner */}
        <section
          aria-labelledby="cta-banner-heading"
          className="py-16 sm:py-24 px-4 sm:px-6 bg-canvas"
        >
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-pine-700 via-pine-800 to-pine-900 rounded-3xl p-8 sm:p-12 text-white text-center space-y-6 shadow-lg relative overflow-hidden">
            {/* Subtle decorative field compass background mark */}
            <div className="absolute -right-12 -bottom-12 opacity-10 pointer-events-none">
              <Compass className="w-72 h-72 text-white stroke-[1]" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-pine-100 text-xs font-semibold backdrop-blur-xs border border-white/20">
              <Tent className="w-3.5 h-3.5" />
              <span>Trailhead Ready</span>
            </div>

            <h2
              id="cta-banner-heading"
              className="text-2xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-white max-w-2xl mx-auto"
            >
              Ready to coordinate your next adventure?
            </h2>

            <p className="text-sm sm:text-base text-pine-100/90 max-w-xl mx-auto leading-relaxed">
              Join outdoors enthusiasts and expedition crews who plan with confidence. Zero spreadsheets, zero forgotten gear.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <SignInButton
                mode="modal"
                fallbackRedirectUrl={resolveDynamicRedirectUrl(currentRedirectUrl, '/')}
                forceRedirectUrl={resolveDynamicRedirectUrl(currentRedirectUrl, '/')}
              >
                <button
                  type="button"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white text-pine-800 font-bold text-sm sm:text-base hover:bg-pine-50 shadow-sm transition-all min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span>Plan an Expedition — Free</span>
                  <ArrowRight className="w-4 h-4 text-pine-700" />
                </button>
              </SignInButton>

              <a
                href="#join-strip"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white/10 text-white border border-white/25 font-semibold text-sm sm:text-base hover:bg-white/20 transition-all min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <KeyRound className="w-4 h-4 text-pine-200" />
                <span>Join with Invite Code</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Accessible Footer */}
      <footer role="contentinfo" className="bg-white border-t border-canvas-border py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-ink-muted">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-pine-600 text-white flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <span className="font-serif font-bold text-base text-ink">cohort</span>
            <span className="text-ink-subtle">· Trailhead Field Notes</span>
          </div>

          <p className="text-center sm:text-left">
            Dependable group expedition & camping gear coordination. Designed to WCAG AA accessibility standards.
          </p>

          <div className="flex items-center gap-4">
            <a href="#features" className="hover:text-ink transition-colors">
              Features
            </a>
            <a href="#demo" className="hover:text-ink transition-colors">
              Simulation
            </a>
            <a href="#faq" className="hover:text-ink transition-colors">
              FAQ
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
