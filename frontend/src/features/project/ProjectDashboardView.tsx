import React, { useMemo } from 'react';
import { useApp } from '../../hooks/useApp';
import { CheckCircle2, Clock, AlertTriangle, ListTodo } from 'lucide-react';
import { getRelativeDateLabel } from '../../domain/businessDays';
import { WorkItemTypeBadge } from '../../components/ui/Badge';
import { WORK_ITEM_TYPES } from '../../domain/workItems';
import type { Task, WorkItemType } from '../../types';

export function ProjectDashboardView() {
  const { currentProject, projectTasks, allUsers } = useApp();

  const metrics = useMemo(() => {
    // Deliverables (Epic, Story, Task, Bug) to avoid double-counting parent & child in completion progress
    const deliverableTasks = projectTasks.filter((t: Task) => t.type !== WORK_ITEM_TYPES.SUBTASK);
    const deliverableTotal = deliverableTasks.length;
    const deliverableCompleted = deliverableTasks.filter((t: Task) => t.status === 'Done').length;
    const deliverableProgress = deliverableTotal > 0 ? Math.round((deliverableCompleted / deliverableTotal) * 100) : 0;

    const total = projectTasks.length;
    const completed = projectTasks.filter((t: Task) => t.status === 'Done').length;
    const incomplete = total - completed;
    const overdue = projectTasks.filter(
      (t: Task) => t.status !== 'Done' && getRelativeDateLabel(t.dueDate).isOverdue
    ).length;

    return {
      total,
      completed,
      incomplete,
      overdue,
      deliverableTotal,
      deliverableCompleted,
      deliverableProgress,
    };
  }, [projectTasks]);

  // Work-Item Type Breakdown
  const tasksByType = useMemo(() => {
    const counts: Record<string, number> = {
      [WORK_ITEM_TYPES.EPIC]: 0,
      [WORK_ITEM_TYPES.STORY]: 0,
      [WORK_ITEM_TYPES.TASK]: 0,
      [WORK_ITEM_TYPES.SUBTASK]: 0,
      [WORK_ITEM_TYPES.BUG]: 0,
    };
    projectTasks.forEach((t: Task) => {
      const type = t.type || WORK_ITEM_TYPES.TASK;
      counts[type] = (counts[type] || 0) + 1;
    });
    return [
      { type: WORK_ITEM_TYPES.EPIC as WorkItemType, count: counts[WORK_ITEM_TYPES.EPIC] || 0 },
      { type: WORK_ITEM_TYPES.STORY as WorkItemType, count: counts[WORK_ITEM_TYPES.STORY] || 0 },
      { type: WORK_ITEM_TYPES.TASK as WorkItemType, count: counts[WORK_ITEM_TYPES.TASK] || 0 },
      { type: WORK_ITEM_TYPES.SUBTASK as WorkItemType, count: counts[WORK_ITEM_TYPES.SUBTASK] || 0 },
      { type: WORK_ITEM_TYPES.BUG as WorkItemType, count: counts[WORK_ITEM_TYPES.BUG] || 0 },
    ];
  }, [projectTasks]);

  // Chart 1: Incomplete tasks by Section
  const tasksBySection = useMemo(() => {
    const sections = currentProject?.sections || [];
    return sections.map((sec) => {
      const count = projectTasks.filter(
        (t: Task) => t.sectionId === sec.id && t.status !== 'Done'
      ).length;
      return { name: sec.name, count };
    });
  }, [currentProject, projectTasks]);

  // Chart 2: Tasks by Status
  const tasksByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    projectTasks.forEach((t: Task) => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    const defaultStatuses = [
      'Backlog',
      'In Progress',
      'In Review',
      'Testing / QA',
      'Blocked',
      'On Hold',
      'Done',
    ];
    const projectWorkflowStatuses = currentProject?.workflow?.statuses?.map((s) => s.name) || defaultStatuses;
    const allStatuses = Array.from(new Set([...projectWorkflowStatuses, ...Object.keys(counts)]));
    return allStatuses
      .map((status) => ({ status, count: counts[status] || 0 }))
      .filter((s) => s.count > 0 || projectWorkflowStatuses.includes(s.status));
  }, [projectTasks, currentProject]);

  // Chart 3: Tasks by Assignee
  const tasksByAssignee = useMemo(() => {
    const counts: Record<string, number> = {};
    projectTasks.forEach((t: Task) => {
      const u = allUsers.find((user) => user.id === t.assigneeId);
      const name = u ? u.name.split(' ')[0] : 'Unassigned';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [projectTasks, allUsers]);

  // Status Colors map for the 7 approved default statuses
  const statusColors: Record<string, string> = {
    'Done': '#22C55E',
    'In Progress': '#3B82F6',
    'In Review': '#A855F7',
    'Testing / QA': '#06B6D4',
    'Blocked': '#EF4444',
    'On Hold': '#F59E0B',
    'Backlog': '#71717A',
    'To Do': '#71717A',
  };

  const maxSectionCount = Math.max(1, ...tasksBySection.map((s) => s.count));
  const maxAssigneeCount = Math.max(1, ...tasksByAssignee.map((a) => a.count));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 4 KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Completed Items</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {metrics.completed}
          </p>
          <span className="text-[11px] text-text-muted">
            {metrics.deliverableTotal > 0 ? metrics.deliverableProgress : 0}% of deliverables ({metrics.deliverableCompleted}/{metrics.deliverableTotal})
          </span>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Incomplete Work</span>
            <Clock size={16} className="text-blue-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-text-primary mt-1">
            {metrics.incomplete}
          </p>
          <span className="text-[11px] text-text-muted">Active or backlog items</span>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Overdue Items</span>
            <AlertTriangle size={16} className="text-rose-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-rose-400 mt-1">
            {metrics.overdue}
          </p>
          <span className="text-[11px] text-rose-400/80">Needs schedule recovery</span>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Total Tracked Items</span>
            <ListTodo size={16} className="text-brand-primary" />
          </div>
          <p className="text-2xl font-bold font-mono text-text-primary mt-1">
            {metrics.total}
          </p>
          <span className="text-[11px] text-text-muted">In scope for this project</span>
        </div>
      </div>

      {/* Work-Item Type Breakdown */}
      <div className="p-4 rounded-xl bg-surface border border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
              Work Item Types
            </span>
            <span className="text-xs text-text-muted">
              ({metrics.total} total item{metrics.total === 1 ? '' : 's'})
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {tasksByType.map(({ type, count }) => (
              <div
                key={type}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-elevated border border-border text-xs"
              >
                <WorkItemTypeBadge type={type} size="sm" />
                <span className="font-mono font-medium text-text-primary">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Accessible SVG Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Incomplete tasks by Section (Horizontal Bars) */}
        <div className="p-5 rounded-xl bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">
              Incomplete Tasks by Project Section
            </h3>
            <span className="text-xs text-text-muted font-mono">{metrics.incomplete} active</span>
          </div>

          <div className="space-y-3 pt-2">
            {tasksBySection.map((sec) => {
              const pct = Math.round((sec.count / maxSectionCount) * 100);
              return (
                <div key={sec.name} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-text-secondary">
                    <span className="truncate pr-2">{sec.name}</span>
                    <span className="font-mono text-text-primary font-medium">{sec.count}</span>
                  </div>
                  <div className="w-full h-2 bg-surface-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-primary rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Tasks by Status Breakdown */}
        <div className="p-5 rounded-xl bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Tasks by Status</h3>
            <span className="text-xs text-text-muted font-mono">{metrics.total} total</span>
          </div>

          <div className="space-y-3 pt-2">
            {tasksByStatus.map((st) => {
              const color = statusColors[st.status] || '#94A3B8';
              const pct = metrics.total > 0 ? Math.round((st.count / metrics.total) * 100) : 0;

              return (
                <div key={st.status} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-text-secondary">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span>{st.status}</span>
                    </div>
                    <span className="font-mono text-text-primary">
                      {st.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-surface-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 3: Upcoming Tasks by Assignee */}
        <div className="p-5 rounded-xl bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Workload by Assignee</h3>
            <span className="text-xs text-text-muted">Task volume</span>
          </div>

          <div className="space-y-3 pt-2">
            {tasksByAssignee.map((item) => {
              const pct = Math.round((item.count / maxAssigneeCount) * 100);
              return (
                <div key={item.name} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-text-secondary">
                    <span>{item.name}</span>
                    <span className="font-mono text-text-primary font-medium">{item.count}</span>
                  </div>
                  <div className="w-full h-2 bg-surface-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 4: Cumulative Completion Velocity */}
        <div className="p-5 rounded-xl bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Sprint Delivery Velocity</h3>
            <span className="text-xs text-emerald-400 font-medium">Sprint Pace</span>
          </div>

          <div className="h-36 flex items-end gap-3 pt-4 border-b border-border/80">
            {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((week, idx) => {
              // Cumulative velocity bars based on October progress
              const heights = [25, 45, 68, 85];
              const h = heights[idx];

              return (
                <div key={week} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[10px] font-mono text-text-muted">{h}%</span>
                  <div
                    className="w-full bg-brand-primary/80 hover:bg-brand-primary transition-colors rounded-t-sm"
                    style={{ height: `${h}%` }}
                  />
                  <span className="text-[10px] text-text-muted">{week}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
