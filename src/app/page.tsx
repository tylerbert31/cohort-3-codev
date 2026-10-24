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
import { EmptyState, LoadingSkeleton } from '@/components/ui/state-views';
import { syncUserProfile } from '@/server/actions/profile';
import { createEventAction, listUserEventsAction } from '@/server/actions/events';
import { joinEventAction } from '@/server/actions/invitations';
import {
  Calendar,
  MapPin,
  Plus,
  KeyRound,
  ChevronRight,
} from 'lucide-react';
import type { Event } from '@/types/database';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<'active' | 'archived' | 'completed'>('active');
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

  // Events grouped by status
  const [eventsData, setEventsData] = useState<{
    active: (Event & { itemCount: number; completedItemCount: number })[];
    archived: (Event & { itemCount: number; completedItemCount: number })[];
    completed: (Event & { itemCount: number; completedItemCount: number })[];
  }>({
    active: [],
    archived: [],
    completed: [],
  });
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  // Trusted profile synchronization on session load + fetch events
  useEffect(() => {
    let isMounted = true;

    async function initDashboard() {
      if (user?.id) {
        try {
          await syncUserProfile();
        } catch (err) {
          console.error('Background profile sync error:', err);
        }

        try {
          const res = await listUserEventsAction();
          if (isMounted && res.success && res.data) {
            setEventsData(res.data);
          }
        } catch (err) {
          console.error('Failed to load events:', err);
        }
      }

      if (isMounted) {
        setIsLoadingEvents(false);
      }
    }

    if (isLoaded) {
      initDashboard();
    }

    return () => {
      isMounted = false;
    };
  }, [user?.id, isLoaded]);

  const currentTabEvents = eventsData[activeTab];

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
        setCreateError(res.error || 'Failed to create outing.');
      }
    } catch {
      setCreateError('An error occurred creating the outing.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = inviteCodeInput.trim().toUpperCase();
    if (!code) return;

    setIsJoining(true);
    setJoinError(null);

    try {
      const res = await joinEventAction(code);
      if (res.success && res.data) {
        setIsJoinDialogOpen(false);
        setInviteCodeInput('');
        router.push(`/events/${res.data.eventId}`);
      } else {
        setJoinError(res.error || 'Invalid or expired invite code.');
      }
    } catch {
      setJoinError('Failed to join outing. Please check the code.');
    } finally {
      setIsJoining(false);
    }
  };

  if (!isLoaded) {
    return (
      <AppShell activeTab="events">
        <LoadingSkeleton count={4} />
      </AppShell>
    );
  }

  return (
    <AppShell
      activeTab="events"
      onNewAction={() => setIsCreateDialogOpen(true)}
    >
      <div className="flex flex-col gap-6">
        {/* Welcome Banner */}
        <section className="bg-white rounded-2xl p-5 sm:p-6 border border-canvas-border shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
                <span>Welcome back{user?.firstName ? `, ${user.firstName}` : ''}!</span>
              </h1>
              <p className="text-sm text-ink-muted mt-1">
                Plan trips, invite friends, and coordinate shared packing lists in one place.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setJoinError(null);
                  setIsJoinDialogOpen(true);
                }}
              >
                <KeyRound className="w-3.5 h-3.5 mr-1.5 text-pine-600" />
                Join with Code
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setCreateError(null);
                  setIsCreateDialogOpen(true);
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                New Event
              </Button>
            </div>
          </div>
        </section>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-canvas-border pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === 'active'
                ? 'bg-canvas-subtle text-pine-700'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            Active
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white border border-canvas-border">
              {eventsData.active.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === 'completed'
                ? 'bg-canvas-subtle text-pine-700'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            Completed
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white border border-canvas-border">
              {eventsData.completed.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('archived')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === 'archived'
                ? 'bg-canvas-subtle text-pine-700'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            Archived
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white border border-canvas-border">
              {eventsData.archived.length}
            </span>
          </button>
        </div>

        {/* Event List */}
        {isLoadingEvents ? (
          <LoadingSkeleton count={3} />
        ) : currentTabEvents.length === 0 ? (
          <EmptyState
            title={`No ${activeTab} outings`}
            description={
              activeTab === 'active'
                ? 'You have no upcoming outings scheduled. Create one or join an existing trip.'
                : activeTab === 'completed'
                ? 'Completed trips are permanently locked for reference.'
                : 'Archived trips are stored here safely.'
            }
            actionLabel={activeTab === 'active' ? 'Create an Event' : undefined}
            onAction={activeTab === 'active' ? () => setIsCreateDialogOpen(true) : undefined}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {currentTabEvents.map((evt) => {
              const isEventOwner = evt.owner_id === user?.id;

              return (
                <Link
                  key={evt.id}
                  href={`/events/${evt.id}`}
                  className="group bg-white rounded-2xl p-4 sm:p-5 border border-canvas-border shadow-2xs hover:border-ink-subtle transition-all flex flex-col gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-bold text-ink truncate group-hover:text-pine-700 transition-colors">
                          {evt.title}
                        </h2>
                        {evt.status === 'completed' && (
                          <Badge variant="completed">Locked</Badge>
                        )}
                        <Badge variant="neutral">
                          {isEventOwner ? 'Owner' : 'Participant'}
                        </Badge>
                      </div>
                      {evt.description && (
                        <p className="text-xs sm:text-sm text-ink-muted line-clamp-1">
                          {evt.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-ink-subtle group-hover:text-ink group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-ink-muted pt-2 border-t border-canvas-border/60">
                    {evt.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-pine-600" />
                        <span>{evt.location}</span>
                      </span>
                    )}
                    {(evt.start_date || evt.end_date) && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-pine-600" />
                        <span>
                          {evt.start_date || 'TBD'}
                          {evt.end_date ? ` – ${evt.end_date}` : ''}
                        </span>
                      </span>
                    )}
                    <span className="ml-auto text-xs text-ink-muted">
                      Created {new Date(evt.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Join Event Modal */}
      <Dialog
        isOpen={isJoinDialogOpen}
        onClose={() => setIsJoinDialogOpen(false)}
        title="Join Outing with Code"
        description="Enter the 8-character invite code provided by the trip organizer."
      >
        <form onSubmit={handleJoinSubmit} className="space-y-4 py-1">
          {joinError && (
            <div className="rounded-lg border border-[var(--color-terracotta-200)] bg-[var(--color-terracotta-50)] p-3 text-xs text-[var(--color-terracotta-700)]">
              {joinError}
            </div>
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
              Join Outing
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Create Event Modal */}
      <Dialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        title="Plan New Outing"
        description="Create a private trip space and start assembling your shared packing list."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3.5 py-1">
          {createError && (
            <div className="rounded-lg border border-[var(--color-terracotta-200)] bg-[var(--color-terracotta-50)] p-3 text-xs text-[var(--color-terracotta-700)]">
              {createError}
            </div>
          )}

          <Input
            label="Trip Name"
            placeholder="e.g. Yosemite Fall Campout"
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
            placeholder="Gear and supplies coordination"
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
              Create Outing
            </Button>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}
