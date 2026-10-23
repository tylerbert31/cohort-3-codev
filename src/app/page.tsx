'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState, LoadingSkeleton } from '@/components/ui/state-views';
import { syncUserProfile } from '@/server/actions/profile';
import {
  Calendar,
  MapPin,
  Lock,
  Plus,
  KeyRound,
  ChevronRight,
  Compass,
} from 'lucide-react';
import type { EventStatus } from '@/types/database';

interface DashboardEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  status: EventStatus;
  role: 'owner' | 'participant';
  itemCount: number;
  completedItemCount: number;
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<'active' | 'archived' | 'completed'>('active');
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Sample initial event data for dashboard skeleton view
  const [events, setEvents] = useState<DashboardEvent[]>([
    {
      id: 'evt-1',
      title: 'High Sierra Alpine Trek',
      description: 'Weekend camping and gear distribution at Lake Aloha.',
      location: 'Desolation Wilderness, CA',
      startDate: 'Nov 14, 2026',
      endDate: 'Nov 16, 2026',
      status: 'active',
      role: 'owner',
      itemCount: 14,
      completedItemCount: 9,
    },
    {
      id: 'evt-2',
      title: 'Pacific Coast Kayak & Camp',
      description: 'Coastal gear checklist and shared kitchen setup.',
      location: 'Point Reyes, CA',
      startDate: 'Oct 02, 2026',
      endDate: 'Oct 04, 2026',
      status: 'completed',
      role: 'participant',
      itemCount: 18,
      completedItemCount: 18,
    },
    {
      id: 'evt-3',
      title: 'Spring Desert Overlanding',
      description: 'Anza-Borrego water tanks and vehicle tools.',
      location: 'Borrego Springs, CA',
      status: 'archived',
      role: 'owner',
      itemCount: 8,
      completedItemCount: 4,
    },
  ]);

  // Trusted profile synchronization on authenticated session load
  useEffect(() => {
    if (user?.id) {
      setIsSyncing(true);
      syncUserProfile()
        .catch((err) => console.error('Background profile sync error:', err))
        .finally(() => setIsSyncing(false));
    }
  }, [user?.id]);

  const filteredEvents = events.filter((e) => e.status === activeTab);

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
                onClick={() => setIsJoinDialogOpen(true)}
              >
                <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                Join with Code
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateDialogOpen(true)}
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
              {events.filter((e) => e.status === 'active').length}
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
              {events.filter((e) => e.status === 'completed').length}
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
              {events.filter((e) => e.status === 'archived').length}
            </span>
          </button>
        </div>

        {/* Event List */}
        {filteredEvents.length === 0 ? (
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
            {filteredEvents.map((event) => {
              const progressPct =
                event.itemCount > 0
                  ? Math.round((event.completedItemCount / event.itemCount) * 100)
                  : 0;

              return (
                <div
                  key={event.id}
                  className="group bg-white rounded-2xl p-4 sm:p-5 border border-canvas-border shadow-2xs hover:border-ink-subtle transition-all flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-bold text-ink truncate group-hover:text-pine-700 transition-colors">
                          {event.title}
                        </h2>
                        {event.status === 'completed' && (
                          <Badge variant="completed">Locked</Badge>
                        )}
                        <Badge variant="neutral">
                          {event.role === 'owner' ? 'Owner' : 'Participant'}
                        </Badge>
                      </div>
                      {event.description && (
                        <p className="text-xs sm:text-sm text-ink-muted line-clamp-1">
                          {event.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-ink-subtle group-hover:text-ink group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-ink-muted pt-2 border-t border-canvas-border/60">
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-pine-600" />
                        <span>{event.location}</span>
                      </span>
                    )}
                    {event.startDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-pine-600" />
                        <span>
                          {event.startDate}
                          {event.endDate ? ` – ${event.endDate}` : ''}
                        </span>
                      </span>
                    )}
                    <span className="ml-auto font-medium text-ink">
                      {event.completedItemCount}/{event.itemCount} items packed ({progressPct}%)
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-canvas-subtle overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        event.status === 'completed' ? 'bg-locked-badge' : 'bg-pine-600'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
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
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsJoinDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!inviteCodeInput.trim()) return;
                alert(`Joining event with code: ${inviteCodeInput.toUpperCase()}`);
                setIsJoinDialogOpen(false);
                setInviteCodeInput('');
              }}
            >
              Join Event
            </Button>
          </>
        }
      >
        <div className="py-2">
          <Input
            label="Invite Code"
            placeholder="e.g. SIERRA26"
            value={inviteCodeInput}
            onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
            required
            autoFocus
          />
        </div>
      </Dialog>

      {/* Create Event Modal */}
      <Dialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        title="Plan New Outing"
        description="Create a private trip space and start assembling your shared packing list."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsCreateDialogOpen(false);
              }}
            >
              Create Outing
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5 py-1">
          <Input label="Trip Name" placeholder="e.g. Yosemite Fall Campout" required />
          <Input label="Destination / Location" placeholder="e.g. Tuolumne Meadows, CA" />
          <Input label="Short Description" placeholder="Gear and supplies coordination" />
        </div>
      </Dialog>
    </AppShell>
  );
}
