import React, { useState } from 'react';
import {
  Star,
  Share2,
  LayoutGrid,
  ListFilter,
  Kanban,
  GitCommit,
  BarChart3,
  CalendarDays,
  Workflow,
  Network,
  Users2,
  History,
  Pencil,
  Trash2,
  Lock,
  Globe,
  LucideIcon,
  AlertTriangle,
  Settings,
} from 'lucide-react';
import { useApp } from '../../hooks/useApp';
import { AvatarGroup } from '../ui/Avatar';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { hasPermission, PERMISSIONS } from '../../domain/permissions';

interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export function ProjectHeader() {
  const {
    currentProject,
    projectTab,
    setProjectTab,
    allUsers,
    navigate,
    currentUser,
    renameProject,
    deleteProject,
  } = useApp();

  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [renameName, setRenameName] = useState('');
  const [renameError, setRenameError] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  if (!currentProject) return null;

  const projectMembers = allUsers.filter((u) =>
    (currentProject.memberIds || []).includes(u.id)
  );

  const canEdit = hasPermission(currentUser.role, PERMISSIONS.EDIT_PROJECT_SETTINGS);
  const canDelete = hasPermission(currentUser.role, PERMISSIONS.DELETE_PROJECT);

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'list', label: 'List', icon: ListFilter },
    { id: 'board', label: 'Board', icon: Kanban },
    { id: 'timeline', label: 'Timeline', icon: GitCommit },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'dependencies', label: 'Dependencies', icon: Network },
    { id: 'workflow', label: 'Workflow', icon: Workflow },
    { id: 'members', label: 'Members', icon: Users2 },
    { id: 'activity', label: 'Activity & Audit', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  function handleTabClick(tabId: string) {
    if (!currentProject) return;
    setProjectTab(tabId);
    navigate(`/project/${currentProject.id}/${tabId}`);
  }

  function handleOpenRename() {
    setRenameName(currentProject?.name || '');
    setRenameError('');
    setRenameModalOpen(true);
  }

  function handleRenameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentProject) return;
    const trimmed = renameName.trim();
    if (!trimmed) {
      setRenameError('Project name cannot be empty');
      return;
    }

    const success = renameProject(currentProject.id, trimmed);
    if (success) {
      setRenameModalOpen(false);
    }
  }

  function handleOpenDelete() {
    setDeleteConfirmText('');
    setDeleteModalOpen(true);
  }

  function handleConfirmDelete(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!currentProject || deleteConfirmText.trim() !== 'DELETE') return;
    deleteProject(currentProject.id);
    setDeleteModalOpen(false);
    setDeleteConfirmText('');
  }

  return (
    <div className="bg-surface border-b border-border flex-shrink-0 select-none">
      {/* Top row: Project Title, Key, Visibility, Status, Members, Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 pt-3.5 pb-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-xs"
            style={{ backgroundColor: currentProject.color }}
          >
            {currentProject.name.substring(0, 1)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-text-primary truncate">
                {currentProject.name}
              </h1>

              {/* Project ID / Key Badge */}
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated border border-border text-text-secondary font-semibold">
                {currentProject.projectKey || currentProject.id.toUpperCase()}
              </span>

              {/* Visibility Badge */}
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                  currentProject.visibility === 'private'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    : 'bg-surface text-text-muted border-border'
                }`}
                title={
                  currentProject.visibility === 'private'
                    ? 'Private project: Visible only to owner and members'
                    : 'Global project: Visible to company workspace'
                }
              >
                {currentProject.visibility === 'private' ? (
                  <>
                    <Lock size={10} />
                    <span>Private</span>
                  </>
                ) : (
                  <>
                    <Globe size={10} />
                    <span>Global</span>
                  </>
                )}
              </span>

              {/* Status Badge */}
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                  currentProject.status === 'On Track'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}
              >
                {currentProject.status}
              </span>

              <button
                className="text-text-muted hover:text-amber-400 transition-colors p-0.5 rounded"
                title="Star project"
              >
                <Star size={14} />
              </button>
            </div>
            <p className="text-xs text-text-muted truncate max-w-md hidden sm:block mt-0.5">
              {currentProject.description}
            </p>
          </div>
        </div>

        {/* Right side: Member avatars & controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setProjectTab('members');
              navigate(`/project/${currentProject.id}/members`);
            }}
            className="flex items-center gap-1.5 p-1 -m-1 rounded-lg hover:bg-surface-elevated border border-transparent hover:border-border transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary"
            title="View project members"
            aria-label="View project members"
          >
            <AvatarGroup users={projectMembers} max={4} />
          </button>

          {/* Edit / Rename Project Action */}
          {canEdit && (
            <button
              onClick={handleOpenRename}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-border bg-surface-elevated text-xs font-medium text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors cursor-pointer"
              title="Edit project name"
            >
              <Pencil size={12} />
              <span className="hidden sm:inline">Rename</span>
            </button>
          )}

          {/* Delete Project Action */}
          {canDelete && (
            <button
              onClick={handleOpenDelete}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-border bg-surface-elevated text-xs font-medium text-text-secondary hover:text-rose-400 hover:border-rose-500/40 transition-colors cursor-pointer"
              title="Delete project"
            >
              <Trash2 size={12} />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}

          <button
            onClick={() => handleTabClick('members')}
            className="hidden sm:inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-border bg-surface-elevated text-xs font-medium text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors"
          >
            <Share2 size={12} />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Horizontal Tab Navigation */}
      <nav className="flex items-center gap-1 px-4 sm:px-6 overflow-x-auto scrollbar-none border-t border-border/50">
        {tabs.map((tab) => {
          const isActive = projectTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex items-center gap-2 py-2 px-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-brand-primary text-text-primary font-semibold'
                  : 'border-transparent text-text-muted hover:text-text-primary hover:border-border-strong'
              }`}
            >
              <Icon size={14} strokeWidth={isActive ? 2 : 1.75} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Rename Project Dialog */}
      <Dialog
        isOpen={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        title="Rename Project"
        description="Update the display name of this project. The Project ID and history remain stable."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRenameSubmit} className="space-y-4">
          <Input
            label="Project Name *"
            value={renameName}
            onChange={(e) => {
              setRenameName(e.target.value);
              if (renameError) setRenameError('');
            }}
            error={renameError}
            autoFocus
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRenameModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Name
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Project Confirmation Dialog */}
      <Dialog
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteConfirmText('');
        }}
        title="Delete Project"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleConfirmDelete} className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            <AlertTriangle size={18} className="shrink-0 mt-0.5 text-rose-400" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-200">
                Are you sure you want to delete &quot;{currentProject.name}&quot;?
              </p>
              <p className="text-[11px] text-rose-300/90 leading-relaxed">
                This will remove the project, its tasks, sections, and associated prototype data.
                Global user accounts will remain intact. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text-secondary">
              To confirm deletion, type <span className="font-mono font-bold text-rose-400">DELETE</span> below:
            </label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="font-mono text-xs"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => {
                setDeleteModalOpen(false);
                setDeleteConfirmText('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              type="submit"
              icon={Trash2}
              disabled={deleteConfirmText.trim() !== 'DELETE'}
            >
              Delete Project
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
