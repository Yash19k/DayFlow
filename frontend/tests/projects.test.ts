import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeProjectId,
  generateSuggestedProjectId,
  validateProjectId,
  validateProjectDates,
} from '../src/domain/projects.ts';

describe('Project Domain Logic Tests', () => {
  const existingProjects = [
    { id: 'proj-1', projectKey: 'ALPHA' },
    { id: 'proj-2', projectKey: 'BETA' },
    { id: 'proj-3', projectKey: 'MARKETING-CAMPAIGN' },
    { id: 'proj-4', projectKey: 'MARKETING-CAMPAIGN-2' },
  ];

  it('normalizes project IDs to clean uppercase alphanumeric slugs', () => {
    assert.equal(normalizeProjectId('  web-app  '), 'WEB-APP');
    assert.equal(normalizeProjectId('Day Flow! 2026'), 'DAYFLOW2026');
    assert.equal(normalizeProjectId('TASK__FLOW--PRO'), 'TASK__FLOW-PRO');
  });

  it('suggests sensible Project IDs from names', () => {
    assert.equal(generateSuggestedProjectId('Brand Redesign', []), 'BRAND-REDESIGN');
    assert.equal(generateSuggestedProjectId('', []), 'PROJECT');
    assert.equal(generateSuggestedProjectId('   ', []), 'PROJECT');
  });

  it('predictably increments suffix upon collision (-2, -3, ...)', () => {
    // ALPHA exists -> suggest ALPHA-2
    assert.equal(generateSuggestedProjectId('Alpha', existingProjects), 'ALPHA-2');

    // MARKETING-CAMPAIGN and MARKETING-CAMPAIGN-2 exist -> suggest MARKETING-CAMPAIGN-3
    assert.equal(generateSuggestedProjectId('Marketing Campaign', existingProjects), 'MARKETING-CAMPAIGN-3');
  });

  it('validates project ID format and uniqueness case-insensitively', () => {
    // Blank ID
    const emptyCheck = validateProjectId('', existingProjects);
    assert.equal(emptyCheck.isValid, false);
    assert.match(emptyCheck.error!, /cannot be empty/i);

    // Collision (case-insensitive)
    const duplicateCheck = validateProjectId('alpha', existingProjects);
    assert.equal(duplicateCheck.isValid, false);
    assert.match(duplicateCheck.error!, /already exists/i);

    // Same project editing its own ID is allowed
    const selfCheck = validateProjectId('ALPHA', existingProjects, 'proj-1');
    assert.equal(selfCheck.isValid, true);

    // Unique ID
    const validCheck = validateProjectId('GAMMA-CORE', existingProjects);
    assert.equal(validCheck.isValid, true);
  });

  it('validates project date ranges properly', () => {
    // Neither date supplied -> valid
    assert.equal(validateProjectDates('', '').isValid, true);
    assert.equal(validateProjectDates(null, null).isValid, true);

    // Only start date -> valid
    assert.equal(validateProjectDates('2026-10-01', '').isValid, true);

    // Only due date -> valid
    assert.equal(validateProjectDates('', '2026-10-15').isValid, true);

    // Start date before due date -> valid
    assert.equal(validateProjectDates('2026-10-01', '2026-10-15').isValid, true);

    // Same day start and due -> valid
    assert.equal(validateProjectDates('2026-10-01', '2026-10-01').isValid, true);

    // Target date BEFORE start date -> invalid
    const invalidCheck = validateProjectDates('2026-10-15', '2026-10-01');
    assert.equal(invalidCheck.isValid, false);
    assert.match(invalidCheck.error!, /cannot be earlier than start date/i);
  });
});
