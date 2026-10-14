import React, { useState } from 'react';
import { useApp } from '../../hooks/useApp';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Layers, AlertCircle, Loader2 } from 'lucide-react';

export function CompanySetupView() {
  const { completeCompanyOnboarding, navigate, showToast } = useApp();

  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(value: string): string | null {
    if (!value) {
      return 'Company name is required.';
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return 'Please enter a valid company name.';
    }
    if (trimmed.length > 100) {
      return 'Company name must be 100 characters or fewer.';
    }
    return null;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setCompanyName(val);
    if (error) {
      setError(null);
    }
    if (persistenceError) {
      setPersistenceError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    const validationError = validate(companyName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setPersistenceError(null);

    try {
      const trimmed = companyName.trim();
      const success = completeCompanyOnboarding(trimmed);

      if (success) {
        showToast(`Workspace "${trimmed}" created successfully!`, 'success');
        navigate('/');
      } else {
        setPersistenceError('Unable to save company information to storage. Please try again.');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('TaskFlow: Error saving company onboarding:', err);
      setPersistenceError('An unexpected error occurred while saving your workspace. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-overlay space-y-6">
        {/* Brand Identifier */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-brand-primary/15 border border-brand-primary/30 flex items-center justify-center text-brand-primary mx-auto">
            <Layers size={22} strokeWidth={2.2} />
          </div>
          <p className="text-[11px] font-semibold tracking-wider uppercase text-text-muted">
            TaskFlow Pro
          </p>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">
            What&apos;s your company name?
          </h1>
          <p className="text-xs text-text-muted leading-relaxed">
            Give your workspace a name so your team can organize projects and collaborate in one place.
          </p>
        </div>

        {/* Persistence Error Alert */}
        {persistenceError && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2"
          >
            <AlertCircle size={15} className="text-rose-400 mt-0.5 flex-shrink-0" />
            <span>{persistenceError}</span>
          </div>
        )}

        {/* Company Setup Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <Input
              id="company-name"
              label="Company name"
              placeholder="Enter your company name"
              value={companyName}
              onChange={handleChange}
              error={error || undefined}
              autoFocus
              disabled={isSubmitting}
              maxLength={120}
              aria-required="true"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'company-name-error' : undefined}
            />
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full mt-2"
            type="submit"
            disabled={isSubmitting || !companyName.trim()}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Saving workspace...
              </span>
            ) : (
              'Continue'
            )}
          </Button>
        </form>
      </div>
    </main>
  );
}
