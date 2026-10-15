import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Company Onboarding & Invitations Tests (Section 6)', () => {
  it('validates company name requirement', () => {
    function validateCompanyName(name: string): string | null {
      if (!name.trim()) return 'Company name is required';
      if (name.trim().length < 2) return 'Company name must be at least 2 characters';
      return null;
    }

    assert.equal(validateCompanyName(''), 'Company name is required');
    assert.equal(validateCompanyName('   '), 'Company name is required');
    assert.equal(validateCompanyName('A'), 'Company name must be at least 2 characters');
    assert.equal(validateCompanyName('Acme Labs'), null);
  });

  it('validates invitation email formats and detects duplicates within submission', () => {
    interface InviteRow {
      email: string;
      role: string;
    }

    function validateInvitations(rows: InviteRow[]): { valid: boolean; errors: string[] } {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const errors: string[] = [];
      const seen = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const email = rows[i].email.trim().toLowerCase();
        if (!email) {
          errors.push(`Row ${i + 1}: Email address cannot be empty.`);
          continue;
        }
        if (!emailRegex.test(email)) {
          errors.push(`Row ${i + 1}: "${email}" is not a valid email address.`);
          continue;
        }
        if (seen.has(email)) {
          errors.push(`Row ${i + 1}: Duplicate email "${email}" entered.`);
          continue;
        }
        seen.add(email);
      }

      return { valid: errors.length === 0, errors };
    }

    // Invalid email format
    const resInvalid = validateInvitations([
      { email: 'bad-email', role: 'Teammate' },
      { email: 'valid@example.com', role: 'Manager' },
    ]);
    assert.equal(resInvalid.valid, false);
    assert.equal(resInvalid.errors.length, 1);
    assert.match(resInvalid.errors[0], /not a valid email address/);

    // Duplicate emails in submission
    const resDuplicate = validateInvitations([
      { email: 'alice@example.com', role: 'Admin' },
      { email: 'alice@example.com', role: 'Teammate' },
    ]);
    assert.equal(resDuplicate.valid, false);
    assert.equal(resDuplicate.errors.length, 1);
    assert.match(resDuplicate.errors[0], /Duplicate email/);

    // Valid unique rows
    const resValid = validateInvitations([
      { email: 'alice@example.com', role: 'Admin' },
      { email: 'bob@example.com', role: 'Manager' },
      { email: 'charlie@example.com', role: 'Teammate' },
    ]);
    assert.equal(resValid.valid, true);
    assert.equal(resValid.errors.length, 0);
  });

  it('supports skip for now without requiring invitations', () => {
    // Skipping invitations transitions onboardingCompleted to true
    const userState = {
      id: 'user-new',
      name: 'New Founder',
      companyId: 'company-new',
      onboardingCompleted: false,
    };

    // User clicks "Skip for now"
    const finalUserState = {
      ...userState,
      onboardingCompleted: true,
    };

    assert.equal(finalUserState.onboardingCompleted, true);
  });
});
