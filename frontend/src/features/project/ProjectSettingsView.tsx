import React, { useState } from 'react';
import { useApp } from '../../hooks/useApp';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Avatar } from '../../components/ui/Avatar';
import { hasPermission, PERMISSIONS } from '../../domain/permissions';
import { validateProjectId, normalizeProjectId } from '../../domain/projects';
import {
  Settings,
  ShieldAlert,
  AlertTriangle,
  Trash2,
  Save,
  RotateCcw,
  Users,
  Copy,
  Check,
  Lock,
  Globe,
  ExternalLink,
  Pencil,
} from 'lucide-react';
import type { User, ProjectVisibility } from '../../types';

export function ProjectSettingsView() {
  const {
    currentProject,
    currentUser,
    allUsers,
    projects,
    renameProject,
    updateProjectVisibility,
    updateProjectKey,
    deleteProject,
    setProjectTab,
    navigate,
    showToast,
  } = useApp();

  const [projectName, setProjectName] = useState(currentProject?.name || '');
  const [prevProjectName, setPrevProjectName] = useState(currentProject?.name || '');
  const [renameError, setRenameError] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [projectKeyInput, setProjectKeyInput] = useState(
    currentProject?.projectKey || currentProject?.id.toUpperCase() || ''
  );
  const [keyError, setKeyError] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Keep local project name in sync with currentProject if it updates externally
  if (currentProject && currentProject.name !== prevProjectName) {
    setPrevProjectName(currentProject.name);
    setProjectName(currentProject.name);
  }

  if (!currentProject) return null;

  const canEdit = hasPermission(currentUser.role, PERMISSIONS.EDIT_PROJECT_SETTINGS);
  const canDelete = hasPermission(currentUser.role, PERMISSIONS.DELETE_PROJECT);

  const isNameChanged = projectName.trim() !== currentProject.name;

  function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!currentProject || !canEdit) return;

    const trimmed = projectName.trim();
    if (!trimmed) {
      setRenameError('Project name cannot be empty');
      return;
    }

    const success = renameProject(currentProject.id, trimmed);
    if (success) {
      setRenameError('');
    }
  }

  function handleCancelName() {
    setProjectName(currentProject?.name || '');
    setRenameError('');
  }

  function handleCopyKey() {
    const key = currentProject?.projectKey || currentProject?.id || '';
    navigator.clipboard?.writeText(key);
    setCopiedKey(true);
    showToast('Project Key copied to clipboard', 'info');
    setTimeout(() => setCopiedKey(false), 2000);
  }

  function handleStartEditKey() {
    setProjectKeyInput(currentProject?.projectKey || currentProject?.id.toUpperCase() || '');
    setKeyError('');
    setIsEditingKey(true);
  }

  function handleCancelEditKey() {
    setProjectKeyInput(currentProject?.projectKey || currentProject?.id.toUpperCase() || '');
    setKeyError('');
    setIsEditingKey(false);
  }

  function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    if (!currentProject || !canEdit) return;

    const val = projectKeyInput.trim();
    const validation = validateProjectId(val, projects, currentProject.id);
    if (!validation.isValid) {
      setKeyError(validation.error || 'Invalid project identifier');
      return;
    }

    const res = updateProjectKey(currentProject.id, val);
    if (res.success) {
      setIsEditingKey(false);
      setKeyError('');
    } else if (res.error) {
      setKeyError(res.error);
    }
  }

  function handleVisibilityChange(newVisibility: ProjectVisibility) {
    if (!currentProject || !canEdit) return;
    updateProjectVisibility(currentProject.id, newVisibility);
  }

  function handleOpenDelete() {
    setDeleteConfirmText('');
    setDeleteModalOpen(true);
  }

  function handleConfirmDelete(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!currentProject || !canDelete || deleteConfirmText.trim() !== 'DELETE') return;

    deleteProject(currentProject.id);
    setDeleteModalOpen(false);
  }

  const currentMemberIds = currentProject.memberIds || [];
  const projectMembers = allUsers.filter((u: User) => currentMemberIds.includes(u.id));
  const owner = allUsers.find((u) => u.id === currentProject.ownerId);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs"
            style={{ backgroundColor: currentProject.color }}
          >
            <Settings size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary tracking-tight">
              Project Settings
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              Manage project metadata, access policies, team members, and lifecycle settings.
            </p>
          </div>
        </div>
      </div>

      {/* General Settings */}
      <section className="bg-surface rounded-xl border border-border p-6 space-y-6">
        <div className="border-b border-border pb-3">
          <h2 className="text-sm font-semibold text-text-primary">General Information</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Basic project identifiers and display properties.
          </p>
        </div>

        <form onSubmit={handleSaveName} className="space-y-4">
          <div className="max-w-md">
            <Input
              label="Project Name"
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                if (renameError) setRenameError('');
              }}
              disabled={!canEdit}
              error={renameError}
              helperText={
                !canEdit
                  ? 'Only Managers and Admins can rename this project.'
                  : 'Renaming will be logged in the project activity & audit trail.'
              }
            />
          </div>

          {canEdit && isNameChanged && (
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="primary"
                size="sm"
                type="submit"
                icon={Save}
              >
                Save Name
              </Button>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                icon={RotateCcw}
                onClick={handleCancelName}
              >
                Cancel
              </Button>
            </div>
          )}
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Project Key */}
          <div className="p-3.5 rounded-lg bg-surface-elevated border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Project Key / Identifier
              </span>
              <span className="text-[10px] text-text-muted">Unique project slug</span>
            </div>

            {isEditingKey ? (
              <form onSubmit={handleSaveKey} className="space-y-2 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={projectKeyInput}
                    onChange={(e) => {
                      const formatted = normalizeProjectId(e.target.value);
                      setProjectKeyInput(formatted);
                      if (keyError) {
                        const check = validateProjectId(formatted, projects, currentProject.id);
                        setKeyError(check.isValid ? '' : (check.error || ''));
                      }
                    }}
                    placeholder="e.g. ALPHA"
                    className="font-mono text-xs uppercase px-2.5 py-1.5 rounded-lg bg-surface border border-border text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary flex-1"
                    autoFocus
                  />
                  <Button variant="primary" size="sm" type="submit">
                    Save
                  </Button>
                  <Button variant="ghost" size="sm" type="button" onClick={handleCancelEditKey}>
                    Cancel
                  </Button>
                </div>
                {keyError && <p className="text-[11px] text-rose-400 font-medium">{keyError}</p>}
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-text-primary bg-surface px-2 py-0.5 rounded border border-border/60">
                  {currentProject.projectKey || currentProject.id.toUpperCase()}
                </span>
                <div className="flex items-center gap-1">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleStartEditKey}
                      className="p-1 rounded hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                      title="Edit Project Key"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="p-1 rounded hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                    title="Copy Key"
                  >
                    {copiedKey ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Visibility */}
          <div className="p-3.5 rounded-lg bg-surface-elevated border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Access Visibility
              </span>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${
                  currentProject.visibility === 'private'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                }`}
              >
                {currentProject.visibility === 'private' ? (
                  <>
                    <Lock size={11} />
                    <span>Private</span>
                  </>
                ) : (
                  <>
                    <Globe size={11} />
                    <span>Global</span>
                  </>
                )}
              </span>
            </div>

            {canEdit ? (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleVisibilityChange('global')}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                    currentProject.visibility !== 'private'
                      ? 'bg-surface-active border-brand-primary text-text-primary shadow-xs'
                      : 'bg-surface border-border/80 text-text-muted hover:text-text-primary hover:border-border'
                  }`}
                >
                  <Globe size={14} className={currentProject.visibility !== 'private' ? 'text-brand-primary' : 'text-text-muted'} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold leading-none">Global</p>
                    <p className="text-[10px] text-text-muted truncate mt-1">All workspace users</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleVisibilityChange('private')}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                    currentProject.visibility === 'private'
                      ? 'bg-surface-active border-amber-500 text-text-primary shadow-xs'
                      : 'bg-surface border-border/80 text-text-muted hover:text-text-primary hover:border-border'
                  }`}
                >
                  <Lock size={14} className={currentProject.visibility === 'private' ? 'text-amber-400' : 'text-text-muted'} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold leading-none">Private</p>
                    <p className="text-[10px] text-text-muted truncate mt-1">Members only</p>
                  </div>
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-text-muted pt-1">
                {currentProject.visibility === 'private'
                  ? 'Restricted to explicitly assigned members.'
                  : 'Accessible to all workspace users.'}
              </p>
            )}
          </div>

          {/* Status */}
          <div className="p-3.5 rounded-lg bg-surface-elevated border border-border space-y-1">
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
              Project Status
            </span>
            <div>
              <span className="text-xs font-semibold text-text-primary">
                {currentProject.status || 'Active'}
              </span>
            </div>
          </div>

          {/* Project Owner */}
          <div className="p-3.5 rounded-lg bg-surface-elevated border border-border space-y-1">
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
              Project Owner
            </span>
            <div className="flex items-center gap-2">
              {owner ? (
                <>
                  <Avatar user={owner} size="xs" />
                  <span className="text-xs font-medium text-text-primary">{owner.name}</span>
                </>
              ) : (
                <span className="text-xs text-text-muted">Unassigned</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Members & Access */}
      <section className="bg-surface rounded-xl border border-border p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Users size={16} />
              <span>Members & Access</span>
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {projectMembers.length} member{projectMembers.length === 1 ? '' : 's'} assigned to this project.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={ExternalLink}
            onClick={() => {
              setProjectTab('members');
              navigate(`/project/${currentProject.id}/members`);
            }}
          >
            Manage Roster & Roles
          </Button>
        </div>

        {/* Member preview chips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
          {projectMembers.map((member) => {
            const role = currentProject.memberRoles?.[member.id] || member.role;
            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-surface-elevated border border-border"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar user={member} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate">
                      {member.name}
                    </p>
                    <p className="text-[10px] text-text-muted truncate">{member.email}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-surface border border-border text-text-secondary shrink-0">
                  {role}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Danger Zone */}
      <section className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 space-y-4">
        <div className="border-b border-rose-500/20 pb-3">
          <div className="flex items-center gap-2 text-rose-400">
            <ShieldAlert size={18} />
            <h2 className="text-sm font-bold tracking-tight text-rose-300">
              Danger Zone
            </h2>
          </div>
          <p className="text-xs text-rose-300/80 mt-1">
            Destructive actions that cannot be undone. Please proceed with caution.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-rose-200">
              Delete Project
            </h3>
            <p className="text-xs text-rose-300/80 leading-relaxed max-w-lg">
              Permanently removes &quot;{currentProject.name}&quot;, including all tasks,
              dependencies, sections, and attachments. Global user accounts remain intact.
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            disabled={!canDelete}
            title={!canDelete ? 'Only Managers and Admins can delete projects' : undefined}
            onClick={handleOpenDelete}
            className="shrink-0"
          >
            Delete Project
          </Button>
        </div>
      </section>

      {/* Typed Delete Confirmation Dialog */}
      <Dialog
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteConfirmText('');
        }}
        title="Delete Project Confirmation"
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
                This will immediately remove the project, its tasks, sections, and associated prototype data.
                This action cannot be undone.
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
