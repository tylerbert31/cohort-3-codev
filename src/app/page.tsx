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
import { createEventAction, listUserEventsAction } from '@/server/actions/events';
import { joinEventAction } from '@/server/actions/invitations';
import {
  Calendar,
  MapPin,
  Plus,
  KeyRound,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import type { Event } from '@/types/database';

export default function DashboardPage() {
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
          console.error('Failed to load trips:', err);
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
      <div className="space-y-6">
        {/* Welcome Section */}
        <section className="bg-canvas-card rounded-xl p-5 sm:p-6 border border-canvas-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink tracking-tight">
              {user?.firstName ? `Welcome back, ${user.firstName}` : 'Expedition Hub'}
            </h1>
            <p className="text-sm text-ink-muted mt-1 max-w-md">
              Coordinate group gear, assign packing tasks, and track readiness for your upcoming adventures.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setJoinError(null);
                setIsJoinDialogOpen(true);
              }}
            >
              <KeyRound className="w-4 h-4 mr-1.5 text-pine-600" />
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
              <Plus className="w-4 h-4 mr-1.5" />
              New Trip
            </Button>
          </div>
        </section>

        {/* Status Filter Tabs */}
        <Tabs
          tabs={[
            { id: 'active', label: 'Active Trips', count: eventsData.active.length },
            { id: 'completed', label: 'Past Logs', count: eventsData.completed.length },
            { id: 'archived', label: 'Archived', count: eventsData.archived.length },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as 'active' | 'completed' | 'archived')}
          ariaLabel="Trip Status Filters"
        />

        {/* Trip Cards List */}
        {isLoadingEvents ? (
          <LoadingSkeleton count={3} />
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
          <div className="grid grid-cols-1 gap-3.5">
            {currentTabEvents.map((evt) => {
              const isEventOwner = evt.owner_id === user?.id;
              const hasItems = evt.itemCount > 0;
              const percent = hasItems ? Math.round((evt.completedItemCount / evt.itemCount) * 100) : 0;

              return (
                <Link
                  key={evt.id}
                  href={`/events/${evt.id}`}
                  className="group bg-canvas-card rounded-xl p-4 sm:p-5 border border-canvas-border hover:border-ink-subtle transition-all flex flex-col gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h2 className="text-lg font-serif font-bold text-ink truncate group-hover:text-pine-700 transition-colors">
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
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-ink-muted pt-2 border-t border-canvas-border/60">
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
