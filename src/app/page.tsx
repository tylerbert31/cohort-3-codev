'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChecklistRow } from '@/components/ui/checklist-row';
import { Dialog } from '@/components/ui/dialog';
import {
  EmptyState,
  ErrorState,
  LockedEventBanner,
  ReconnectingBanner,
} from '@/components/ui/state-views';
import { Tent, Users, Plus, CheckCircle2 } from 'lucide-react';

interface ChecklistItem {
  id: string;
  title: string;
  notes?: string;
  quantity?: string;
  assigneeName?: string;
  isCompleted: boolean;
  isLocked: boolean;
}

export default function DesignSystemPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [items, setItems] = useState<ChecklistItem[]>([
    {
      id: '1',
      title: 'Waterproof 4-Person Tent',
      notes: 'Make sure rain fly and stakes are packed in bag',
      quantity: '1x',
      assigneeName: 'Alex M.',
      isCompleted: true,
      isLocked: false,
    },
    {
      id: '2',
      title: 'Camp Stove & Propane Canister',
      notes: 'Check fuel level before departure',
      quantity: '2 tanks',
      assigneeName: 'Sam K.',
      isCompleted: false,
      isLocked: false,
    },
    {
      id: '3',
      title: 'First Aid Kit & Blister Bandages',
      notes: 'Stored in red emergency pouch',
      quantity: '1 kit',
      assigneeName: 'Jordan T.',
      isCompleted: false,
      isLocked: true, // Example locked row
    },
  ]);

  const toggleItem = (id: string, nextState: boolean) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isCompleted: nextState } : item))
    );
  };

  return (
    <AppShell
      activeTab="events"
      eventTitle="High Sierra Weekend Trek"
      onNewAction={() => setIsDialogOpen(true)}
      onShareAction={() => alert('Invite code copied to clipboard!')}
    >
      <div className="flex flex-col gap-8">
        {/* Event Header Card */}
        <section className="bg-white rounded-2xl p-5 border border-canvas-border shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="active">Active Trip</Badge>
              <Badge variant="completed">Permanent Lock Verified</Badge>
            </div>
            <span className="text-xs text-ink-muted">Created Oct 24 • 8 participants</span>
          </div>
          <p className="text-sm text-ink-muted leading-relaxed">
            Coordinating shared gear and base camp kitchen essentials for the upcoming mountain trip.
          </p>
          <div className="mt-4 pt-3 border-t border-canvas-border flex items-center justify-between text-xs text-ink-muted">
            <div className="flex items-center gap-1.5 font-medium">
              <Tent className="w-4 h-4 text-pine-600" />
              <span>Base Camp Gear</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <Users className="w-4 h-4 text-pine-600" />
              <span>4 Assignees</span>
            </div>
          </div>
        </section>

        {/* Locked Event Warning Banner */}
        <LockedEventBanner />

        {/* Interactive Checklist Section */}
        <section aria-labelledby="section-checklist">
          <div className="flex items-center justify-between mb-3">
            <h2 id="section-checklist" className="text-lg font-bold text-ink flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-pine-600" />
              <span>Checklist Items (Mobile-First Touch Rows)</span>
            </h2>
            <Button variant="secondary" size="sm" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </div>

          <div className="flex flex-col gap-2.5">
            {items.map((item) => (
              <ChecklistRow
                key={item.id}
                id={item.id}
                title={item.title}
                notes={item.notes}
                quantity={item.quantity}
                assigneeName={item.assigneeName}
                isCompleted={item.isCompleted}
                isEventLocked={item.isLocked}
                onToggle={toggleItem}
              />
            ))}
          </div>
        </section>

        {/* Buttons Showcase */}
        <section aria-labelledby="section-buttons" className="bg-white rounded-2xl p-5 border border-canvas-border shadow-xs">
          <h2 id="section-buttons" className="text-base font-bold text-ink mb-3">
            Button Variants (Touch Targets ≥ 44px)
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary Pine</Button>
            <Button variant="secondary">Secondary Canvas</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="primary" isLoading>
              Saving
            </Button>
          </div>
        </section>

        {/* Form Fields Showcase */}
        <section aria-labelledby="section-fields" className="bg-white rounded-2xl p-5 border border-canvas-border shadow-xs">
          <h2 id="section-fields" className="text-base font-bold text-ink mb-3">
            Form Fields & Inline Validation
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Item Name"
              placeholder="e.g. Water Purification Tablets"
              defaultValue="Portable Water Filter"
              helperText="Specify brand or capacity if relevant"
            />
            <Input
              label="Quantity"
              placeholder="e.g. 2 boxes"
              defaultValue="Invalid quantity"
              error="Quantity must be greater than zero"
            />
          </div>
        </section>

        {/* Reusable State Views */}
        <section aria-labelledby="section-states">
          <h2 id="section-states" className="text-base font-bold text-ink mb-2">
            Feedback & Boundary States
          </h2>
          <EmptyState
            title="No Personal Templates Yet"
            description="Create custom packing lists to reuse for camping, hiking, or road trips."
            actionLabel="Create First Template"
            onAction={() => alert('New Template Triggered')}
          />
          <ErrorState
            title="Connection Interrupted"
            message="Could not synchronize recent checklist changes. Please check your connection."
            onRetry={() => alert('Retrying sync...')}
          />
          <ReconnectingBanner />
        </section>
      </div>

      {/* Accessible Dialog */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="Add Checklist Item"
        description="Add a new required item to the outing checklist."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setItems((prev) => [
                  ...prev,
                  {
                    id: String(Date.now()),
                    title: 'New Outdoor Gear Item',
                    quantity: '1x',
                    isCompleted: false,
                    isLocked: false,
                  },
                ]);
                setIsDialogOpen(false);
              }}
            >
              Add Item
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 py-1">
          <Input label="Item Title" placeholder="e.g. Sleeping Bag (-5°C rating)" required />
          <Input label="Quantity" placeholder="e.g. 1 per person" />
          <Input label="Notes" placeholder="Optional notes for participants" />
        </div>
      </Dialog>
    </AppShell>
  );
}
