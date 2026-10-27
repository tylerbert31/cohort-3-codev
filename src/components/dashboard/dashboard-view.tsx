'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Tabs } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { InlineAlert } from '@/components/ui/inline-alert';
import { EmptyState, LoadingSkeleton } from '@/components/ui/state-views';
import { syncUserProfile } from '@/server/actions/profile';
import { createEventAction } from '@/server/actions/events';
import { useEventsList } from '@/query';
import { joinEventAction } from '@/server/actions/invitations';
import {
  Calendar,
  MapPin,
  Plus,
  KeyRound,
  ChevronRight,
  CheckCircle2,
  Backpack,
} from 'lucide-react';

export function DashboardView() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'archived'>('active');
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Form state for creating outing
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Keep profile synchronization separate from cached trip-list queries.
  useEffect(() => {
    if (!isLoaded || !user?.id) return;
    syncUserProfile().catch((err) => {
      console.error('Background profile sync error:', err);
    });
  }, [user?.id, isLoaded]);

  const {
    data: eventsData,
    isLoading: isLoadingEvents,
    isError: isEventsError,
    error: eventsError,
  } = useEventsList();

  const tripsByStatus = eventsData ?? { active: [], completed: [], archived: [] };
  const currentTabEvents = tripsByStatus[activeTab];
  const totalAssignedItems = [...tripsByStatus.active, ...tripsByStatus.completed, ...tripsByStatus.archived]
    .reduce((total, trip) => total + trip.assignedItemCount, 0);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    setCreateError(null);

    try {
      const res = await createEventAction({
        title: newTitle.trim(),
        location: newLocation.trim() || undefined,
        description: newDescription.trim() || undefined,
      });

      if (res.success && res.data) {
        setIsCreateDialogOpen(false);
        setNewTitle('');
        setNewLocation('');
        setNewDescription('');
        router.push(`/events/${res.data.event.id}`);
      } else {
        setCreateError(res.error || 'Failed to create trip');
      }
    } catch {
      setCreateError('An unexpected error occurred. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;

    setIsJoining(true);
    setJoinError(null);

    try {
      const res = await joinEventAction(inviteCodeInput.trim());
      if (res.success && res.data) {
        setIsJoinDialogOpen(false);
        setInviteCodeInput('');
        router.push(`/events/${res.data.eventId}`);
      } else {
        setJoinError(res.error || 'Invalid or expired invite code.');
      }
    } catch {
      setJoinError('Failed to join trip. Please verify your connection.');
    } finally {
      setIsJoining(false);
    }
  };

  const formatDateDisplay = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  return (
    <AppShell
      activeTab="events"
      onNewAction={() => {
        setCreateError(null);
        setIsCreateDialogOpen(true);
      }}
    >
      <div className="space-y-7">
        {/* Trip planning header */}
        <section className="relative isolate overflow-hidden rounded-[28px] bg-[#173b2e] px-5 py-6 text-white shadow-[0_18px_45px_rgba(23,59,46,.15)] sm:px-8 sm:py-8">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 wanderlist-grid opacity-40" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 z-0 h-64 w-64 rounded-full border border-white/10 sm:right-8 sm:top-[-7rem] sm:h-80 sm:w-80" />
          <div aria-hidden="true" className="pointer-events-none absolute right-8 top-8 z-0 h-28 w-28 rounded-full border border-[#d6ef9c]/25 sm:right-24 sm:top-12 sm:h-40 sm:w-40" />
          <div className="relative z-10 flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.07] px-3 py-1.5 text-xs font-medium text-[#d8e9d0]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#d6ef9c]" /> Your shared trip space
              </p>
              <h1 className="max-w-lg text-[2.25rem] font-semibold leading-[.99] tracking-[-.065em] sm:text-5xl">
                {user?.firstName ? <>Good to see you, <span className="text-[#d6ef9c]">{user.firstName}.</span></> : <>Make room for <span className="text-[#d6ef9c]">the outdoors.</span></>}
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-white/70 sm:text-[15px]">
                One place for the plans, people, and packing lists that make a good trip happen.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-col sm:items-stretch sm:gap-2.5 sm:min-w-[180px]">
              <Button variant="primary" onClick={() => { setCreateError(null); setIsCreateDialogOpen(true); }} className="min-h-12 justify-center border border-[#d6ef9c] bg-[#d6ef9c] text-[#173b2e] hover:bg-[#e4f6bc]">
                <Plus className="mr-1.5 h-4 w-4" /> Plan a trip
              </Button>
              <Button variant="outline" onClick={() => { setJoinError(null); setIsJoinDialogOpen(true); }} className="min-h-12 justify-center border-white/25 bg-white/[.06] text-white hover:bg-white/[.12] hover:text-white">
                <KeyRound className="mr-1.5 h-4 w-4" /> Join with code
              </Button>
            </div>
          </div>
          <div className="relative z-10 mt-5 flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/[.07] px-4 py-3 sm:mt-6 sm:max-w-xl">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#d6ef9c]/15 text-[#d6ef9c]">
                <Backpack className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[.12em] text-white/60">Assigned to you</p>
                <p className="text-sm font-medium text-white">Your packing list</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full border border-[#d6ef9c]/30 bg-[#d6ef9c]/15 px-3 py-1.5 text-sm font-semibold tabular-nums text-[#e5f5c8]">
              {totalAssignedItems} {totalAssignedItems === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div className="relative z-10 mt-5 grid grid-cols-3 border-t border-white/15 pt-4 sm:mt-6 sm:max-w-xl">
            <div><p className="text-2xl font-semibold tracking-[-.05em] text-white">{tripsByStatus.active.length}</p><p className="mt-1 text-[11px] text-white/60 sm:text-xs">Active trips</p></div>
            <div className="border-l border-white/15 pl-4"><p className="text-2xl font-semibold tracking-[-.05em] text-white">{tripsByStatus.completed.length}</p><p className="mt-1 text-[11px] text-white/60 sm:text-xs">Completed</p></div>
            <div className="border-l border-white/15 pl-4"><p className="text-2xl font-semibold tracking-[-.05em] text-white">{tripsByStatus.archived.length}</p><p className="mt-1 text-[11px] text-white/60 sm:text-xs">Archived</p></div>
          </div>
        </section>

        {/* Status Filter Tabs */}
        <Tabs
          tabs={[
            { id: 'active', label: 'Active Trips', count: tripsByStatus.active.length },
            { id: 'completed', label: 'Past Logs', count: tripsByStatus.completed.length },
            { id: 'archived', label: 'Archived', count: tripsByStatus.archived.length },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as 'active' | 'completed' | 'archived')}
          ariaLabel="Trip Status Filters"
        />

        {isEventsError && eventsData && (
          <InlineAlert
            type="error"
            message="Could not refresh your trips. Showing the last loaded data; we will retry automatically."
          />
        )}

        {/* Trip Cards List */}
        {!isLoaded || isLoadingEvents ? (
          <LoadingSkeleton count={3} />
        ) : isEventsError && !eventsData ? (
          <InlineAlert
            type="error"
            message={eventsError instanceof Error ? eventsError.message : 'Trips could not be loaded. Please try again.'}
          />
        ) : currentTabEvents.length === 0 ? (
          <EmptyState
            title={`No ${activeTab === 'completed' ? 'past' : activeTab} trips`}
            description={
              activeTab === 'active'
                ? 'You have no active adventures planned. Start by assembling a new trip checklist or join with an invite code.'
                : activeTab === 'completed'
                ? 'Completed trips serve as historical expedition records once wrapped up.'
                : 'Archived trips are stored safely here out of view.'
            }
            actionLabel={activeTab === 'active' ? 'Plan a Trip' : undefined}
            onAction={activeTab === 'active' ? () => setIsCreateDialogOpen(true) : undefined}
            secondaryActionLabel={activeTab === 'active' ? 'Join with Code' : undefined}
            onSecondaryAction={activeTab === 'active' ? () => setIsJoinDialogOpen(true) : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2 lg:gap-5">
            {currentTabEvents.map((evt) => {
              const isEventOwner = evt.owner_id === user?.id;
              const hasItems = evt.itemCount > 0;
              const percent = hasItems ? Math.round((evt.completedItemCount / evt.itemCount) * 100) : 0;

              return (
                <Link
                  key={evt.id}
                  href={`/events/${evt.id}`}
                  className="group relative flex min-w-0 flex-col gap-4 overflow-hidden rounded-[22px] border border-canvas-border/90 bg-[#fffefa] p-4 shadow-[0_5px_18px_rgba(23,43,36,.025)] transition duration-200 hover:border-pine-500 hover:shadow-[0_14px_32px_rgba(23,43,36,.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h2 className="break-words text-lg font-semibold leading-tight tracking-[-.04em] text-ink transition-colors group-hover:text-pine-700 sm:text-xl">
                          {evt.title}
                        </h2>
                        {evt.status === 'completed' && (
                          <Badge variant="completed">Wrapped Up</Badge>
                        )}
                        {isEventOwner && (
                          <Badge variant="neutral">Organizer</Badge>
                        )}
                      </div>
                      {evt.description && (
                        <p className="text-xs sm:text-sm text-ink-muted line-clamp-1">
                          {evt.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-ink-subtle group-hover:text-ink group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                  </div>

                  {evt.assignedItemCount > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-pine-200 bg-pine-50 px-2.5 py-1 text-[11px] font-semibold tracking-[.01em] text-pine-800">
                        <Backpack className="h-3.5 w-3.5" aria-hidden="true" />
                        {evt.assignedItemCount} {evt.assignedItemCount === 1 ? 'required item' : 'required items'}
                      </span>
                    </div>
                  )}

                  {/* Progress Bar Display */}
                  {hasItems ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-ink-muted font-medium">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-pine-600" />
                          <span>{evt.completedItemCount} of {evt.itemCount} items packed</span>
                        </span>
                        <span className="font-mono">{percent}%</span>
                      </div>
                      <Progress
                        value={percent}
                        variant={evt.status === 'completed' ? 'locked' : 'pine'}
                      />
                    </div>
                  ) : (
                    <div className="text-xs text-ink-muted italic">
                      List is empty · Tap to add gear
                    </div>
                  )}

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-canvas-border/70 pt-3 text-xs leading-5 text-ink-muted">
                    {evt.location && (
                      <span className="flex items-center gap-1.5 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-pine-600 shrink-0" />
                        <span>{evt.location}</span>
                      </span>
                    )}
                    {(evt.start_date || evt.end_date) && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-pine-600 shrink-0" />
                        <span>
                          {formatDateDisplay(evt.start_date) || 'TBD'}
                          {evt.end_date ? ` – ${formatDateDisplay(evt.end_date)}` : ''}
                        </span>
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Join Trip Dialog */}
      <Dialog
        isOpen={isJoinDialogOpen}
        onClose={() => setIsJoinDialogOpen(false)}
        title="Join Trip with Code"
        description="Enter the 8-character invite code provided by your trip organizer."
      >
        <form onSubmit={handleJoinSubmit} className="space-y-4 py-1">
          {joinError && (
            <InlineAlert type="error" message={joinError} />
          )}

          <Input
            label="Invite Code"
            placeholder="e.g. 7K2M9XP4"
            value={inviteCodeInput}
            onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
            required
            autoFocus
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsJoinDialogOpen(false)}
              disabled={isJoining}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isJoining}
            >
              Join Trip
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Create Trip Dialog */}
      <Dialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        title="Plan New Trip"
        description="Create a private trip space and start assembling your shared packing list."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3.5 py-1">
          {createError && (
            <InlineAlert type="error" message={createError} />
          )}

          <Input
            label="Trip Name"
            placeholder="e.g. Yosemite High Sierra Campout"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Destination / Location"
            placeholder="e.g. Tuolumne Meadows, CA"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
          />
          <Input
            label="Short Description"
            placeholder="e.g. 3-day backcountry trek and campfire gear"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isCreating}
            >
              Create Trip
            </Button>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}
