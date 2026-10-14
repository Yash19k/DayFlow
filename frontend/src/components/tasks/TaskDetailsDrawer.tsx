import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Repeat,
  Network,
  MessageSquare,
  Shield,
  Zap,
  Plus,
  ArrowUpRight,
} from 'lucide-react';
import { useApp } from '../../hooks/useApp';
import { StatusBadge, SlaBadge, WorkItemTypeBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { evaluateTaskSla } from '../../domain/sla';
import { formatRecurrenceRule, generateNextOccurrences } from '../../domain/recurrence';
import { isTaskBlocked, getBlockingTasks, getPredecessorTasks, getSuccessorTasks } from '../../domain/dependencyGraph';
import { WORK_ITEM_TYPES, WORK_ITEM_TYPE_LIST, BUG_SEVERITIES } from '../../domain/workItems';
import { getEligibleParents, getChildWorkItems } from '../../domain/hierarchy';
import { Task, WorkItemType } from '../../types';
import { TaskAttachments } from './TaskAttachments';

interface TaskDetailsContentProps {
  task: Task;
  onClose: () => void;
}

function TaskDetailsContent({ task, onClose }: TaskDetailsContentProps) {
  const {
    tasks,
    updateTask,
    deleteTask,
    changeTaskStatus,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    addComment,
    logTimeEntry,
    addDependency,
    removeDependency,
    escalateTask,
    simulateExternalTaskEdit,
    allUsers,
    currentWorkflow,
    currentUser,
    requestReschedule,
    openTaskDrawer,
  } = useApp();

  // Local state initialized per task instance (keyed by task.id)
  const [snapshotVersion] = useState<number>(task.version || 1);
  const [activeTab, setActiveTab] = useState<string>(
    task.type === WORK_ITEM_TYPES.SUBTASK ? 'dependencies' : 'subtasks'
  );

  // Quick inputs
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [selectedPredId, setSelectedPredId] = useState('');

  // Live timer state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Recurrence state
  const [recFrequency, setRecFrequency] = useState<string>(task.recurrenceRule?.frequency || 'none');
  const [recInterval, setRecInterval] = useState<number | string>(task.recurrenceRule?.interval || 1);
  const [recWeekdaysOnly, setRecWeekdaysOnly] = useState<boolean>(Boolean(task.recurrenceRule?.weekdaysOnly));

  // Live timer tick
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const currentType = (task.type || WORK_ITEM_TYPES.TASK) as WorkItemType;
  const slaInfo = evaluateTaskSla(task);
  const isBlocked = isTaskBlocked(task, tasks);
  const blockingTasks = getBlockingTasks(task, tasks);
  const predecessors = getPredecessorTasks(task, tasks);
  const successors = getSuccessorTasks(task, tasks);

  // Parent work item reference
  const parentWorkItem = task.parentId ? tasks.find((t) => t.id === task.parentId) : null;
  const eligibleParents = getEligibleParents(currentType, task.id, tasks, task.projectId);
  const childWorkItems = getChildWorkItems(task.id, tasks);

  // Subtasks list (from first-class tasks or task.subtasks fallback)
  const childSubtasks = tasks.filter((t) => t.parentId === task.id && t.type === WORK_ITEM_TYPES.SUBTASK);
  const subtasksList = childSubtasks.length > 0 ? childSubtasks : (task.subtasks || []);
  const completedSubtasks = subtasksList.filter((s: any) => s.status === 'Done' || s.completed).length;
  const subtaskProgress =
    subtasksList.length > 0 ? Math.round((completedSubtasks / subtasksList.length) * 100) : 0;

  function handleSaveTitle(e: React.FocusEvent<HTMLInputElement>) {
    const val = e.target.value.trim();
    if (val && val !== task.title) {
      updateTask(task.id, { title: val }, snapshotVersion);
    }
  }

  function handleSaveDescription(e: React.FocusEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    if (val !== task.description) {
      updateTask(task.id, { description: val }, snapshotVersion);
    }
  }

  function handleTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newType = e.target.value as WorkItemType;
    if (newType !== currentType) {
      updateTask(task.id, { type: newType }, snapshotVersion);
    }
  }

  function handleParentChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newParentId = e.target.value || null;
    if (newParentId !== task.parentId) {
      updateTask(task.id, { parentId: newParentId }, snapshotVersion);
    }
  }

  function handleAddSubtaskSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    addSubtask(task.id, newSubtaskTitle.trim());
    setNewSubtaskTitle('');
  }

  function handleAddCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    addComment(task.id, newCommentText.trim());
    setNewCommentText('');
  }

  function handleAddDependencyLink() {
    if (!selectedPredId) return;
    addDependency(selectedPredId, task.id);
    setSelectedPredId('');
  }

  function handleStopTimer() {
    setIsTimerRunning(false);
    if (timerSeconds >= 10) {
      const minutes = Math.max(1, Math.round(timerSeconds / 60));
      logTimeEntry(task.id, minutes, 'Live working session');
    }
    setTimerSeconds(0);
  }

  function handleSaveRecurrence() {
    const rule = {
      frequency: recFrequency,
      interval: Number(recInterval) || 1,
      weekdaysOnly: recWeekdaysOnly,
      endCondition: 'never',
    };
    updateTask(task.id, { recurrenceRule: rule }, snapshotVersion);
  }

  return (
    <div className="w-full max-w-xl bg-surface border-l border-border h-full shadow-overlay flex flex-col animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-elevated">
        <div className="flex items-center gap-2">
          <WorkItemTypeBadge type={currentType} size="sm" />
          <span className="text-xs font-mono text-text-muted">{task.id}</span>
          <span className="text-xs text-text-muted">·</span>
          <span className="text-xs text-text-secondary font-medium">v{task.version || 1}</span>
          {isBlocked && (
            <span className="text-[11px] font-semibold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded">
              Blocked
            </span>
          )}
          <SlaBadge slaInfo={slaInfo} />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => simulateExternalTaskEdit(task.id)}
            className="p-1.5 rounded-lg text-text-muted hover:text-amber-400 hover:bg-surface-hover transition-colors"
            title="Simulate remote edit (tests conflict collision modal)"
          >
            <Zap size={15} />
          </button>

          {currentUser.role !== 'Teammate' && (
            <button
              onClick={() => deleteTask(task.id)}
              className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-surface-hover transition-colors"
              title="Delete task"
            >
              <Trash2 size={15} />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Blocked banner if predecessors are incomplete */}
      {isBlocked && (
        <div className="px-5 py-2.5 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-rose-400 flex-shrink-0" />
            <span>
              Task is blocked by {blockingTasks.length} incomplete predecessor(s):{' '}
              <strong>{blockingTasks.map((b) => b.title).join(', ')}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Title */}
        <div>
          <input
            type="text"
            defaultValue={task.title}
            onBlur={handleSaveTitle}
            className="w-full text-base sm:text-lg font-bold text-text-primary bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-brand-primary rounded px-1 py-0.5"
            placeholder="Work item title..."
          />
        </div>

        {/* Parent Work Item Context (if Subtask or child) */}
        {parentWorkItem && (
          <div className="p-2.5 rounded-lg bg-surface-elevated/70 border border-border flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] text-text-muted">Parent:</span>
              <WorkItemTypeBadge type={parentWorkItem.type || 'Task'} size="sm" showLabel={false} />
              <button
                onClick={() => openTaskDrawer(parentWorkItem.id)}
                className="font-semibold text-text-primary hover:text-brand-primary truncate max-w-xs text-left flex items-center gap-1 group"
              >
                <span>{parentWorkItem.title}</span>
                <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
            <StatusBadge status={parentWorkItem.status} size="sm" />
          </div>
        )}

        {/* Attribute Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-surface-elevated border border-border text-xs">
          {/* Work Item Type Selector */}
          <div>
            <label className="text-[11px] text-text-muted block mb-1">Type</label>
            <select
              value={currentType}
              onChange={handleTypeChange}
              className="w-full h-7 rounded bg-surface border border-border px-1.5 text-xs text-text-primary focus:outline-none"
            >
              {WORK_ITEM_TYPE_LIST.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-[11px] text-text-muted block mb-1">Status</label>
            <select
              value={task.status}
              onChange={(e) => changeTaskStatus(task.id, e.target.value)}
              className="w-full h-7 rounded bg-surface border border-border px-1.5 text-xs text-text-primary focus:outline-none"
            >
              {currentWorkflow?.statuses?.map((st) => (
                <option key={st.id} value={st.name}>
                  {st.name}
                </option>
              )) || <option value={task.status}>{task.status}</option>}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="text-[11px] text-text-muted block mb-1">Priority</label>
            <select
              value={task.priority || ''}
              onChange={(e) => updateTask(task.id, { priority: e.target.value ? e.target.value : null }, snapshotVersion)}
              className="w-full h-7 rounded bg-surface border border-border px-1.5 text-xs text-text-primary focus:outline-none"
            >
              <option value="">No priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label className="text-[11px] text-text-muted block mb-1">Assignee</label>
            <select
              value={task.assigneeId || ''}
              onChange={(e) =>
                updateTask(task.id, { assigneeId: e.target.value ? e.target.value : null }, snapshotVersion)
              }
              className="w-full h-7 rounded bg-surface border border-border px-1.5 text-xs text-text-primary focus:outline-none"
            >
              <option value="">-- Unassigned --</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-[11px] text-text-muted block mb-1">Due Date</label>
            <input
              type="date"
              defaultValue={task.dueDate || ''}
              onChange={(e) => {
                requestReschedule(task.id, e.target.value || '');
              }}
              className="w-full h-7 rounded bg-surface border border-border px-1 text-xs text-text-primary focus:outline-none"
            />
          </div>

          {/* Estimated Hours */}
          <div>
            <label className="text-[11px] text-text-muted block mb-1">Est. Hours</label>
            <input
              type="number"
              min="0"
              step="0.5"
              defaultValue={task.estimateHours !== null && task.estimateHours !== undefined ? task.estimateHours : ''}
              onBlur={(e) => {
                const val = e.target.value === '' ? null : Number(e.target.value);
                if (val !== task.estimateHours) {
                  updateTask(task.id, { estimateHours: val }, snapshotVersion);
                }
              }}
              placeholder="e.g. 4"
              className="w-full h-7 rounded bg-surface border border-border px-1 text-xs text-text-primary focus:outline-none"
            />
          </div>

          {/* Parent Item Selector (where applicable) */}
          {currentType !== WORK_ITEM_TYPES.EPIC && (
            <div>
              <label className="text-[11px] text-text-muted block mb-1">
                {currentType === WORK_ITEM_TYPES.SUBTASK ? 'Parent (Required)' : 'Parent Epic'}
              </label>
              <select
                value={task.parentId || ''}
                onChange={handleParentChange}
                className="w-full h-7 rounded bg-surface border border-border px-1 text-xs text-text-primary focus:outline-none truncate"
              >
                {currentType !== WORK_ITEM_TYPES.SUBTASK && (
                  <option value="">None (Standalone)</option>
                )}
                {eligibleParents.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.type || 'Task'}] {p.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* --- TYPE-SPECIFIC FIELDS --- */}

        {/* 1. Epic Fields */}
        {currentType === WORK_ITEM_TYPES.EPIC && (
          <div className="p-3.5 rounded-xl bg-surface-elevated/40 border border-border space-y-3 text-xs">
            <h4 className="font-semibold text-text-primary uppercase tracking-wider text-[11px]">
              Epic Specifications
            </h4>
            <div>
              <label className="text-text-muted block mb-1">Business Goal</label>
              <input
                type="text"
                defaultValue={task.businessGoal || ''}
                onBlur={(e) => updateTask(task.id, { businessGoal: e.target.value }, snapshotVersion)}
                placeholder="Strategic goal or business value..."
                className="w-full rounded-lg bg-surface border border-border px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="text-text-muted block mb-1">Success Criteria</label>
              <textarea
                defaultValue={task.successCriteria || ''}
                onBlur={(e) => updateTask(task.id, { successCriteria: e.target.value }, snapshotVersion)}
                rows={2}
                placeholder="Measurable outcomes..."
                className="w-full rounded-lg bg-surface border border-border px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            {childWorkItems.length > 0 && (
              <div className="pt-2 border-t border-border">
                <span className="text-[11px] text-text-muted block mb-1.5 font-medium">
                  Associated Work Items ({childWorkItems.length})
                </span>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {childWorkItems.map((child) => (
                    <div
                      key={child.id}
                      onClick={() => openTaskDrawer(child.id)}
                      className="flex items-center justify-between p-1.5 rounded bg-surface hover:bg-surface-hover cursor-pointer border border-border text-[11px]"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <WorkItemTypeBadge type={child.type} size="sm" showLabel={false} />
                        <span className="truncate">{child.title}</span>
                      </div>
                      <StatusBadge status={child.status} size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Story Fields */}
        {currentType === WORK_ITEM_TYPES.STORY && (
          <div className="p-3.5 rounded-xl bg-surface-elevated/40 border border-border space-y-2 text-xs">
            <h4 className="font-semibold text-text-primary uppercase tracking-wider text-[11px]">
              Acceptance Criteria
            </h4>
            <textarea
              defaultValue={task.acceptanceCriteria || ''}
              onBlur={(e) => updateTask(task.id, { acceptanceCriteria: e.target.value }, snapshotVersion)}
              rows={3}
              placeholder="Given... When... Then... acceptance scenarios"
              className="w-full rounded-lg bg-surface border border-border px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>
        )}

        {/* 3. Bug Fields */}
        {currentType === WORK_ITEM_TYPES.BUG && (
          <div className="p-3.5 rounded-xl bg-surface-elevated/40 border border-border space-y-3 text-xs">
            <h4 className="font-semibold text-rose-400 uppercase tracking-wider text-[11px]">
              Bug Diagnosis & Details
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-text-muted block mb-1">Severity *</label>
                <select
                  value={task.severity || 'Medium'}
                  onChange={(e) => updateTask(task.id, { severity: e.target.value }, snapshotVersion)}
                  className="w-full h-7 rounded bg-surface border border-border px-1.5 text-xs text-text-primary focus:outline-none"
                >
                  {BUG_SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-text-muted block mb-1">Environment</label>
                <input
                  type="text"
                  defaultValue={task.environment || ''}
                  onBlur={(e) => updateTask(task.id, { environment: e.target.value }, snapshotVersion)}
                  placeholder="e.g. Chrome 129, macOS"
                  className="w-full h-7 rounded bg-surface border border-border px-2 text-xs text-text-primary focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-text-muted block mb-1">Steps to Reproduce *</label>
              <textarea
                defaultValue={task.stepsToReproduce || ''}
                onBlur={(e) => updateTask(task.id, { stepsToReproduce: e.target.value }, snapshotVersion)}
                rows={3}
                placeholder="1. Go to...\n2. Click on...\n3. Observe error..."
                className="w-full rounded-lg bg-surface border border-border px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono text-[11px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-text-muted block mb-1">Expected Behavior</label>
                <textarea
                  defaultValue={task.expectedBehavior || ''}
                  onBlur={(e) => updateTask(task.id, { expectedBehavior: e.target.value }, snapshotVersion)}
                  rows={2}
                  placeholder="What was expected..."
                  className="w-full rounded-lg bg-surface border border-border px-2.5 py-1.5 text-xs text-text-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-text-muted block mb-1">Actual Behavior</label>
                <textarea
                  defaultValue={task.actualBehavior || ''}
                  onBlur={(e) => updateTask(task.id, { actualBehavior: e.target.value }, snapshotVersion)}
                  rows={2}
                  placeholder="What unexpectedly happened..."
                  className="w-full rounded-lg bg-surface border border-border px-2.5 py-1.5 text-xs text-text-primary focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="text-xs font-semibold text-text-secondary block mb-1">
            Description
          </label>
          <textarea
            defaultValue={task.description || ''}
            onBlur={handleSaveDescription}
            rows={2}
            placeholder="Add details, specifications, background..."
            className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>

        {/* Media Attachments */}
        <TaskAttachments
          attachments={task.attachments || []}
          onChange={(newAtts) => updateTask(task.id, { attachments: newAtts }, snapshotVersion)}
        />

        {/* SLA & Escalation section */}
        <div className="p-3 rounded-lg border bg-surface-elevated/40 border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Shield size={16} className={slaInfo.isBreached ? 'text-rose-400' : 'text-brand-primary'} />
            <div>
              <p className="font-semibold text-text-primary">SLA Policy Status</p>
              <p className="text-[11px] text-text-muted">
                {slaInfo.label} · Target resolution threshold: {slaInfo.thresholdHours}h
              </p>
            </div>
          </div>

          {!slaInfo.isEscalated && currentUser.role !== 'Teammate' && (
            <Button
              variant="danger"
              size="sm"
              icon={ShieldAlert}
              onClick={() => escalateTask(task.id)}
            >
              Escalate
            </Button>
          )}
        </div>

        {/* Tabbed Secondary Sections */}
        <div>
          <div className="flex items-center gap-1 border-b border-border pb-1">
            {[
              ...(currentType !== WORK_ITEM_TYPES.SUBTASK
                ? [{ id: 'subtasks', label: `Subtasks (${completedSubtasks}/${subtasksList.length})`, icon: CheckCircle2 }]
                : []),
              { id: 'dependencies', label: `Dependencies (${predecessors.length + successors.length})`, icon: Network },
              { id: 'time', label: `Time (${task.actualHours}/${task.estimateHours}h)`, icon: Clock },
              { id: 'recurrence', label: 'Recurrence', icon: Repeat },
              { id: 'comments', label: `Comments (${task.comments?.length || 0})`, icon: MessageSquare },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === t.id
                      ? 'bg-surface-active text-text-primary font-semibold'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  <Icon size={13} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Subtasks Tab */}
          {activeTab === 'subtasks' && currentType !== WORK_ITEM_TYPES.SUBTASK && (
            <div className="pt-3 space-y-3">
              {subtasksList.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                    <span>Progress</span>
                    <span className="font-medium">{subtaskProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-active rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${subtaskProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                {subtasksList.map((sub: any) => {
                  const isDone = sub.status === 'Done' || sub.completed;
                  return (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-surface-elevated border border-border text-xs group"
                    >
                      <label className="flex items-center gap-2.5 min-w-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => toggleSubtask(task.id, sub.id)}
                          className="w-3.5 h-3.5 rounded border-border text-brand-primary focus:ring-0 bg-surface"
                        />
                        <span
                          className={`truncate ${
                            isDone ? 'line-through text-text-muted' : 'text-text-primary'
                          }`}
                        >
                          {sub.title}
                        </span>
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openTaskDrawer(sub.id)}
                          className="text-text-muted hover:text-text-primary p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Open subtask details"
                        >
                          <ArrowUpRight size={13} />
                        </button>
                        <button
                          onClick={() => deleteSubtask(task.id, sub.id)}
                          className="text-text-muted hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleAddSubtaskSubmit} className="flex items-center gap-2">
                <Input
                  placeholder="Add a new subtask..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button variant="secondary" size="sm" type="submit" icon={Plus}>
                  Add
                </Button>
              </form>
            </div>
          )}

          {/* Dependencies Tab */}
          {activeTab === 'dependencies' && (
            <div className="pt-3 space-y-4 text-xs">
              <div>
                <h4 className="font-semibold text-text-secondary mb-2 uppercase text-[10px] tracking-wider">
                  Predecessors (Must finish before this work item)
                </h4>
                {predecessors.length === 0 ? (
                  <p className="text-text-muted italic">No predecessor requirements.</p>
                ) : (
                  <div className="space-y-1.5">
                    {predecessors.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-surface-elevated border border-border"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <WorkItemTypeBadge type={p.type} size="sm" showLabel={false} />
                          <StatusBadge status={p.status} size="sm" />
                          <span className="font-medium text-text-primary truncate">
                            {p.title}
                          </span>
                        </div>
                        <button
                          onClick={() => removeDependency(p.id, task.id)}
                          className="text-text-muted hover:text-rose-400 p-1"
                          title="Remove dependency"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-text-secondary mb-2 uppercase text-[10px] tracking-wider">
                  Successors (Blocked until this item finishes)
                </h4>
                {successors.length === 0 ? (
                  <p className="text-text-muted italic">No successor items depend on this.</p>
                ) : (
                  <div className="space-y-1.5">
                    {successors.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-surface-elevated border border-border"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <WorkItemTypeBadge type={s.type} size="sm" showLabel={false} />
                          <StatusBadge status={s.status} size="sm" />
                          <span className="font-medium text-text-primary truncate">
                            {s.title}
                          </span>
                        </div>
                        <button
                          onClick={() => removeDependency(task.id, s.id)}
                          className="text-text-muted hover:text-rose-400 p-1"
                          title="Remove dependency"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Predecessor selector */}
              {currentUser.role !== 'Teammate' && (
                <div className="pt-2 border-t border-border flex items-center gap-2">
                  <select
                    value={selectedPredId}
                    onChange={(e) => setSelectedPredId(e.target.value)}
                    className="flex-1 h-8 rounded-lg bg-surface border border-border px-2 text-xs text-text-primary focus:outline-none"
                  >
                    <option value="">Select predecessor requirement...</option>
                    {tasks
                      .filter((t) => t.id !== task.id && !(task.dependencyIds || []).includes(t.id))
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          [{t.type || 'Task'}] {t.title}
                        </option>
                      ))}
                  </select>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Plus}
                    onClick={handleAddDependencyLink}
                    disabled={!selectedPredId}
                  >
                    Link
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Time Tracking Tab */}
          {activeTab === 'time' && (
            <div className="pt-3 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-border">
                <div>
                  <span className="text-[11px] text-text-muted block">Live Session Stopwatch</span>
                  <span className="text-xl font-mono font-bold text-text-primary">
                    {String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:
                    {String(timerSeconds % 60).padStart(2, '0')}
                  </span>
                </div>

                {isTimerRunning ? (
                  <Button variant="danger" size="sm" onClick={handleStopTimer}>
                    Stop & Log
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => setIsTimerRunning(true)}>
                    Start Timer
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <h4 className="font-semibold text-text-secondary uppercase text-[10px] tracking-wider">
                  Logged Entries ({(task.timeEntries || []).length})
                </h4>
                {(task.timeEntries || []).length === 0 ? (
                  <p className="text-text-muted italic">No time recorded yet.</p>
                ) : (
                  (task.timeEntries || []).map((te) => (
                    <div
                      key={te.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-surface-elevated border border-border"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-text-primary block truncate">
                          {te.description || te.note || 'Working session'}
                        </span>
                        <span className="text-[10px] text-text-muted font-mono">
                          {te.startTime ? new Date(te.startTime).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-brand-primary">
                        {te.durationMinutes ?? (te.hours ? te.hours * 60 : 0)}m
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Recurrence Tab */}
          {activeTab === 'recurrence' && (
            <div className="pt-3 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-text-muted block mb-1">Frequency</label>
                  <select
                    value={recFrequency}
                    onChange={(e) => setRecFrequency(e.target.value)}
                    className="w-full h-8 rounded-lg bg-surface border border-border px-2 text-xs text-text-primary focus:outline-none"
                  >
                    <option value="none">Does not repeat (One-time)</option>
                    <option value="daily">Daily</option>
                    <option value="weekly_monday">Weekly on Monday</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly_first_day">Monthly on the 1st day</option>
                    <option value="monthly_last_friday">Monthly on the last Friday</option>
                    <option value="monthly">Monthly (same day of month)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-text-muted block mb-1">Interval</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={recInterval}
                    onChange={(e) => setRecInterval(e.target.value)}
                    disabled={recFrequency === 'weekly_monday' || recFrequency === 'monthly_first_day' || recFrequency === 'monthly_last_friday'}
                    className="w-full h-8 rounded-lg bg-surface border border-border px-2 text-xs text-text-primary focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              {recFrequency !== 'none' && (
                <div className="space-y-2.5">
                  {recFrequency === 'daily' && (
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-text-secondary">
                      <input
                        type="checkbox"
                        checked={recWeekdaysOnly}
                        onChange={(e) => setRecWeekdaysOnly(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-border text-brand-primary"
                      />
                      <span>Weekdays only (skip Saturday & Sunday)</span>
                    </label>
                  )}

                  <div className="p-2.5 rounded-lg bg-surface-elevated border border-border space-y-1">
                    <span className="text-[11px] text-text-muted block">Schedule Summary</span>
                    <p className="text-xs font-semibold text-brand-primary">
                      {formatRecurrenceRule({ frequency: recFrequency, interval: Number(recInterval), weekdaysOnly: recWeekdaysOnly })}
                    </p>
                  </div>

                  {/* Future Occurrences Preview */}
                  {task.dueDate && (
                    <div className="p-2.5 rounded-lg bg-surface-elevated border border-border space-y-1.5">
                      <span className="text-[11px] text-text-muted block">Upcoming Projected Occurrences</span>
                      <div className="space-y-1">
                        {generateNextOccurrences(
                          {
                            ...task,
                            recurrenceRule: {
                              frequency: recFrequency,
                              interval: Number(recInterval),
                              weekdaysOnly: recWeekdaysOnly,
                            },
                          },
                          3
                        ).map((occ) => (
                          <div key={occ.occurrenceNumber} className="flex items-center justify-between text-[11px] text-text-secondary">
                            <span>Occurrence #{occ.occurrenceNumber}</span>
                            <span className="font-mono font-medium text-text-primary">{occ.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button variant="primary" size="sm" onClick={handleSaveRecurrence}>
                Save Recurrence
              </Button>
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="pt-3 space-y-3 text-xs">
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {(task.comments || []).length === 0 ? (
                  <p className="text-text-muted italic py-2">No comments posted yet.</p>
                ) : (
                  (task.comments || []).map((c) => {
                    const authorId = c.authorId || c.userId;
                    const author = allUsers.find((u) => u.id === authorId);
                    return (
                      <div key={c.id} className="p-2.5 rounded-lg bg-surface-elevated border border-border space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-text-primary">{author?.name || 'User'}</span>
                          <span className="text-[10px] text-text-muted font-mono">
                            {c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-text-secondary">{c.body || c.text}</p>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleAddCommentSubmit} className="space-y-2 pt-2 border-t border-border">
                <textarea
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  rows={2}
                  className="w-full rounded-lg bg-surface border border-border p-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
                <div className="flex justify-end">
                  <Button variant="primary" size="sm" type="submit">
                    Post Comment
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TaskDetailsDrawer() {
  const { activeDrawerTaskId, closeTaskDrawer, tasks } = useApp();

  const task = tasks.find((t) => t.id === activeDrawerTaskId);

  if (!task) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeTaskDrawer();
      }}
    >
      <TaskDetailsContent key={task.id} task={task} onClose={closeTaskDrawer} />
    </div>
  );
}
