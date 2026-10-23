'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Event, EventMember, ActivityEvent, Profile } from '@/types/database';
import {
  archiveEventAction,
  restoreEventAction,
  completeEventAction,
} from '@/server/actions/events';
import { generateInviteCodeAction, revokeInviteCodeAction } from '@/server/actions/invitations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { LockedEventBanner } from '@/components/ui/state-views';

interface EventViewProps {
  initialEvent: Event;
  initialMembers: (EventMember & { profile?: Profile })[];
  initialActivities: ActivityEvent[];
  userRole: 'owner' | 'participant';
  currentUserId: string;
}

export default function EventView({
  initialEvent,
  initialMembers,
  initialActivities,
  userRole,
  currentUserId,
}: EventViewProps) {
  const router = useRouter();
  const [event, setEvent] = useState<Event>(initialEvent);
  const [members] = useState(initialMembers);
  const [activities, setActivities] = useState<ActivityEvent[]>(initialActivities);
  const [activeTab, setActiveTab] = useState<'checklist' | 'members' | 'activity'>('checklist');

  // Modals & Action States
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const [isArchiving, setIsArchiving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isOwner = userRole === 'owner';
  const isLocked = event.status === 'completed';
  const isArchived = event.status === 'archived';

  const handleOpenInvite = async () => {
    setIsInviteOpen(true);
    if (!inviteCode) {
      setIsGeneratingInvite(true);
      try {
        const res = await generateInviteCodeAction(event.id);
        if (res.success && res.data) {
          setInviteCode(res.data.invite.invite_code);
        } else {
          setActionError(res.error || 'Failed to generate invite code.');
        }
      } catch {
        setActionError('Failed to generate invite code.');
      } finally {
        setIsGeneratingInvite(false);
      }
    }
  };

  const handleCopyLink = () => {
    if (!inviteCode) return;
    const url = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(url);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2500);
  };

  const handleRevokeInvite = async () => {
    if (!inviteCode) return;
    try {
      const res = await revokeInviteCodeAction(inviteCode);
      if (res.success) {
        setInviteCode(null);
        setIsInviteOpen(false);
      } else {
        setActionError(res.error || 'Failed to revoke invite.');
      }
    } catch {
      setActionError('Failed to revoke invite code.');
    }
  };

  const handleArchiveToggle = async () => {
    setIsArchiving(true);
    setActionError(null);
    try {
      if (isArchived) {
        const res = await restoreEventAction(event.id);
        if (res.success && res.data) {
          setEvent(res.data);
          router.refresh();
        } else {
          setActionError(res.error || 'Failed to restore event.');
        }
      } else {
        const res = await archiveEventAction(event.id);
        if (res.success && res.data) {
          setEvent(res.data);
          router.refresh();
        } else {
          setActionError(res.error || 'Failed to archive event.');
        }
      }
    } catch {
      setActionError('An error occurred updating the outing state.');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleConfirmComplete = async () => {
    setIsCompleting(true);
    setActionError(null);
    try {
      const res = await completeEventAction(event.id);
      if (res.success && res.data) {
        setEvent(res.data);
        setIsCompleteModalOpen(false);
        router.refresh();
      } else {
        setActionError(res.error || 'Failed to complete outing.');
      }
    } catch {
      setActionError('Failed to lock outing.');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-pine-600)] rounded-md px-1 py-0.5"
        >
          <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Outings
        </Link>

        <div className="flex items-center gap-2">
          {event.status === 'completed' && (
            <Badge variant="completed">Locked & Completed</Badge>
          )}
          {event.status === 'archived' && (
            <Badge variant="archived">Archived</Badge>
          )}
          {event.status === 'active' && (
            <Badge variant="active">Active Outing</Badge>
          )}
        </div>
      </div>

      {actionError && (
        <div className="rounded-xl border border-[var(--color-terracotta-200)] bg-[var(--color-terracotta-50)] p-4 text-sm text-[var(--color-terracotta-700)]">
          {actionError}
        </div>
      )}

      {/* Locked Event Banner */}
      {isLocked && <LockedEventBanner />}

      {/* Event Header Card */}
      <div className="rounded-2xl border border-[var(--color-canvas-border)] bg-[var(--color-canvas-card)] p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
              {event.title}
            </h1>
            {event.description && (
              <p className="text-sm text-[var(--color-ink-muted)] max-w-2xl leading-relaxed">
                {event.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-[var(--color-ink-muted)]">
              {event.location && (
                <div className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-[var(--color-pine-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{event.location}</span>
                </div>
              )}

              {(event.start_date || event.end_date) && (
                <div className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-[var(--color-pine-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>
                    {event.start_date || 'TBD'}
                    {event.end_date ? ` – ${event.end_date}` : ''}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-[var(--color-pine-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>{members.length} {members.length === 1 ? 'member' : 'members'}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
            {!isLocked && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInvite}
                className="gap-1.5"
              >
                <svg className="h-4 w-4 text-[var(--color-pine-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Invite
              </Button>
            )}

            {isOwner && !isLocked && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleArchiveToggle}
                  isLoading={isArchiving}
                >
                  {isArchived ? 'Restore Outing' : 'Archive'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCompleteModalOpen(true)}
                  className="border-[var(--color-locked-border)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                >
                  Complete Outing
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-8 flex border-b border-[var(--color-canvas-border)]">
          <button
            onClick={() => setActiveTab('checklist')}
            className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === 'checklist'
                ? 'border-[var(--color-pine-600)] text-[var(--color-pine-600)]'
                : 'border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            Checklist
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === 'members'
                ? 'border-[var(--color-pine-600)] text-[var(--color-pine-600)]'
                : 'border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            Participants ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === 'activity'
                ? 'border-[var(--color-pine-600)] text-[var(--color-pine-600)]'
                : 'border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            Activity Feed ({activities.length})
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'checklist' && (
        <div className="rounded-2xl border border-[var(--color-canvas-border)] bg-[var(--color-canvas-card)] p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-pine-100)] text-[var(--color-pine-600)] mb-3">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[var(--color-ink)]">
            Checklist Ready for Coordination
          </h2>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)] max-w-md mx-auto">
            {isLocked
              ? 'This outing is completed and locked. Items cannot be added or modified.'
              : 'Add gear sections, assign items to participants, or apply a pre-built template in Phase 05.'}
          </p>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="rounded-2xl border border-[var(--color-canvas-border)] bg-[var(--color-canvas-card)] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[var(--color-ink)]">Trip Participants</h2>
            {!isLocked && (
              <Button size="sm" variant="outline" onClick={handleOpenInvite}>
                Invite Member
              </Button>
            )}
          </div>

          <div className="divide-y divide-[var(--color-canvas-border)]">
            {members.map((m) => {
              const name = m.profile?.first_name
                ? `${m.profile.first_name} ${m.profile.last_name || ''}`.trim()
                : 'Collaborator';
              const isSelf = m.clerk_user_id === currentUserId;

              return (
                <div key={m.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-pine-100)] text-sm font-bold text-[var(--color-pine-700)]">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--color-ink)]">
                        {name} {isSelf && <span className="text-xs text-[var(--color-ink-muted)]">(You)</span>}
                      </p>
                      <p className="text-xs text-[var(--color-ink-muted)]">
                        Joined {new Date(m.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <Badge variant={m.role === 'owner' ? 'pending' : 'neutral'}>
                    {m.role === 'owner' ? 'Owner' : 'Participant'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="rounded-2xl border border-[var(--color-canvas-border)] bg-[var(--color-canvas-card)] p-6 shadow-sm">
          <h2 className="text-base font-bold text-[var(--color-ink)] mb-4">Activity Log</h2>
          {activities.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-muted)]">No recorded activity yet.</p>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--color-canvas-border)]">
              {activities.map((a) => (
                <div key={a.id} className="relative flex items-start gap-3">
                  <div className="absolute -left-6 mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-pine-600)] text-white ring-4 ring-[var(--color-canvas-card)]">
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-ink)]">
                      {a.event_type === 'event_created' && 'Outing created'}
                      {a.event_type === 'member_joined' && 'New participant joined via invite code'}
                      {a.event_type === 'event_archived' && 'Outing archived'}
                      {a.event_type === 'event_restored' && 'Outing restored to active'}
                      {a.event_type === 'event_completed' && 'Outing marked permanently completed'}
                    </p>
                    <p className="text-xs text-[var(--color-ink-muted)]">
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invite Code Dialog */}
      <Dialog
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite Trip Collaborators"
        description="Share this secure 8-character code or join link with your group."
      >
        <div className="space-y-5">
          {isGeneratingInvite ? (
            <div className="py-6 text-center text-sm text-[var(--color-ink-muted)]">
              Generating secure invite code...
            </div>
          ) : inviteCode ? (
            <>
              <div className="rounded-xl border border-[var(--color-pine-200)] bg-[var(--color-pine-50)] p-4 text-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-pine-700)]">
                  Invite Code
                </span>
                <div className="mt-1 font-mono text-3xl font-bold tracking-widest text-[var(--color-pine-800)]">
                  {inviteCode}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--color-ink-muted)]">
                  Direct Join Link
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/join/${inviteCode}` : ''}
                    className="flex-1 rounded-xl border border-[var(--color-canvas-border)] bg-[var(--color-canvas)] px-3 py-2 text-xs font-mono text-[var(--color-ink)] focus:outline-none"
                  />
                  <Button
                    size="sm"
                    onClick={handleCopyLink}
                    className="shrink-0"
                  >
                    {inviteCopied ? 'Copied!' : 'Copy Link'}
                  </Button>
                </div>
              </div>

              {isOwner && (
                <div className="pt-2 border-t border-[var(--color-canvas-border)]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRevokeInvite}
                    className="w-full text-xs text-[var(--color-terracotta-600)] hover:bg-[var(--color-terracotta-50)]"
                  >
                    Revoke This Invite Code
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 text-sm text-[var(--color-ink-muted)]">
              No active invite code. Click below to generate.
              <div className="mt-3">
                <Button size="sm" onClick={handleOpenInvite}>Generate Code</Button>
              </div>
            </div>
          )}
        </div>
      </Dialog>

      {/* Complete Event Confirmation Dialog */}
      <Dialog
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        title="Complete & Lock Outing?"
        description="Treat completion as permanent. Once completed, this outing becomes read-only and no participant can add, edit, or check off items."
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--color-locked-border)] bg-[var(--color-locked-surface)] p-3 text-xs text-[var(--color-locked-ink)]">
            <strong>Permanent Action:</strong> In accordance with trip completion rules, reopening is disallowed for this MVP.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsCompleteModalOpen(false)}
              disabled={isCompleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmComplete}
              isLoading={isCompleting}
            >
              Confirm & Lock Outing
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
