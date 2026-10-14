import React, { useState } from 'react';
import { useApp } from '../../hooks/useApp';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Plus, Trash2, ArrowRight, Shield } from 'lucide-react';
import type { WorkflowStatus, Workflow, Task } from '../../types';

export function WorkflowBuilderView() {
  const { currentWorkflow, setWorkflows, projectTasks, showToast, currentUser } = useApp();

  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#6366F1');

  if (!currentWorkflow) return null;

  const statuses = currentWorkflow.statuses || [];

  function handleAddStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!newStatusName.trim() || !currentWorkflow) return;

    if (statuses.some((s: WorkflowStatus) => s.name.toLowerCase() === newStatusName.trim().toLowerCase())) {
      showToast('A status with this name already exists', 'error');
      return;
    }

    const newStatus: WorkflowStatus = {
      id: `st-${Date.now()}`,
      name: newStatusName.trim(),
      category: 'active',
      color: newStatusColor,
      allowedTransitions: statuses.map((s: WorkflowStatus) => s.name),
    };

    setWorkflows((prev: Workflow[]) =>
      prev.map((w: Workflow) =>
        w.id === currentWorkflow.id ? { ...w, statuses: [...w.statuses, newStatus] } : w
      )
    );
    setNewStatusName('');
    showToast(`Status "${newStatus.name}" added to workflow`, 'success');
  }

  function handleDeleteStatus(statusObj: WorkflowStatus) {
    if (!currentWorkflow) return;
    // Check if tasks currently occupy this status
    const tasksInStatus = projectTasks.filter((t: Task) => t.status === statusObj.name);
    if (tasksInStatus.length > 0) {
      showToast(
        `Cannot delete "${statusObj.name}": ${tasksInStatus.length} tasks currently occupy this status.`,
        'error'
      );
      return;
    }

    setWorkflows((prev: Workflow[]) =>
      prev.map((w: Workflow) =>
        w.id === currentWorkflow.id
          ? {
              ...w,
              statuses: w.statuses.filter((s: WorkflowStatus) => s.id !== statusObj.id),
            }
          : w
      )
    );
    showToast(`Status "${statusObj.name}" removed`, 'info');
  }

  function handleToggleTransition(fromStatusId: string, targetStatusName: string) {
    if (!currentWorkflow) return;
    setWorkflows((prev: Workflow[]) =>
      prev.map((w: Workflow) => {
        if (w.id === currentWorkflow.id) {
          const updatedStatuses = w.statuses.map((s: WorkflowStatus) => {
            if (s.id === fromStatusId) {
              const currentAllowed = s.allowedTransitions || [];
              const nextAllowed = currentAllowed.includes(targetStatusName)
                ? currentAllowed.filter((name: string) => name !== targetStatusName)
                : [...currentAllowed, targetStatusName];
              return { ...s, allowedTransitions: nextAllowed };
            }
            return s;
          });
          return { ...w, statuses: updatedStatuses };
        }
        return w;
      })
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary tracking-tight">
            Project Workflow & State Machine
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Configure lifecycle stages, valid transitions, and role-based transition approvals.
          </p>
        </div>
        <span className="text-xs text-text-muted bg-surface-elevated px-2.5 py-1 rounded border border-border">
          Active: <strong className="text-text-primary">{currentWorkflow.name}</strong>
        </span>
      </div>

      {/* Visual Status Flow Sequence */}
      <section className="p-5 rounded-xl bg-surface border border-border space-y-3">
        <h3 className="text-sm font-semibold text-text-primary">Lifecycle Flow Stages</h3>
        <p className="text-xs text-text-muted">
          Linear representation of statuses configured in this project:
        </p>

        <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-none">
          {statuses.map((st: WorkflowStatus, idx: number) => (
            <React.Fragment key={st.id}>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-elevated border border-border flex-shrink-0">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: st.color }}
                />
                <span className="text-xs font-semibold text-text-primary">{st.name}</span>
                {st.roleRestrictions?.Done && (
                  <span
                    className="text-[10px] text-brand-primary flex items-center gap-0.5"
                    title="Requires Manager approval"
                  >
                    <Shield size={11} />
                  </span>
                )}
              </div>
              {idx < statuses.length - 1 && (
                <ArrowRight size={14} className="text-text-muted flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* Allowed Transitions Matrix */}
      <section className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-surface-elevated flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Allowed Status Transitions Matrix
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Toggle checkmarks to allow or restrict transitions from rows to columns.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto p-4">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border text-[11px] font-semibold text-text-muted uppercase">
                <th className="py-2 pr-4">From Status</th>
                {statuses.map((col: WorkflowStatus) => (
                  <th key={col.id} className="py-2 px-2 text-center">
                    {col.name}
                  </th>
                ))}
                {currentUser.role !== 'Teammate' && <th className="py-2 px-2 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {statuses.map((row: WorkflowStatus) => (
                <tr key={row.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="py-2.5 pr-4 font-semibold text-text-primary flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                    <span>{row.name}</span>
                  </td>

                  {statuses.map((col: WorkflowStatus) => {
                    const isSelf = row.id === col.id;
                    const isAllowed = row.allowedTransitions?.includes(col.name);

                    return (
                      <td key={col.id} className="py-2.5 px-2 text-center">
                        {isSelf ? (
                          <span className="text-text-muted/40 font-mono">—</span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={isAllowed}
                            onChange={() => handleToggleTransition(row.id, col.name)}
                            className="rounded border-border text-brand-primary cursor-pointer"
                          />
                        )}
                      </td>
                    );
                  })}

                  {currentUser.role !== 'Teammate' && (
                    <td className="py-2.5 px-2 text-right">
                      <button
                        onClick={() => handleDeleteStatus(row)}
                        className="text-text-muted hover:text-rose-400 p-1"
                        title="Delete status"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add New Status Form */}
      {currentUser.role !== 'Teammate' && (
        <section className="p-5 rounded-xl bg-surface border border-border space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">Add Stage to Workflow</h3>
          <form onSubmit={handleAddStatus} className="flex flex-wrap items-end gap-3 text-xs">
            <div className="flex-1 min-w-[200px]">
              <Input
                label="Stage Name"
                placeholder="e.g. QA Verification"
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Color</label>
              <input
                type="color"
                value={newStatusColor}
                onChange={(e) => setNewStatusColor(e.target.value)}
                className="w-10 h-9 rounded bg-surface border border-border p-1 cursor-pointer"
              />
            </div>
            <Button variant="primary" size="md" type="submit" icon={Plus}>
              Add Stage
            </Button>
          </form>
        </section>
      )}
    </div>
  );
}
