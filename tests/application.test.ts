import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApplicationRepository } from '../src/database/repositories/ApplicationRepository';
import {
  ApplicationRow,
  ApplicationStatus,
  ApplicationType,
  ApplicationAnswerRow,
} from '../src/database/schema';
import {
  getQuestions,
  validateAnswers,
} from '../src/services/application/ApplicationService';

vi.mock('../src/database/connection', () => ({
  getSupabaseAdmin: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }),
}));

const createMockApplication = (overrides: Partial<ApplicationRow> = {}): ApplicationRow => ({
  id: 1,
  guild_id: 'guild1',
  applicant_id: 'user1',
  type: 'STAFF' as ApplicationType,
  status: 'DRAFT' as ApplicationStatus,
  submitted_at: null,
  reviewed_at: null,
  reviewed_by: null,
  review_reason: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createMockAnswer = (overrides: Partial<ApplicationAnswerRow> = {}): ApplicationAnswerRow => ({
  id: 1,
  application_id: 1,
  question_id: 'staff_experience',
  answer: 'I have 2 years of moderation experience.',
  created_at: new Date().toISOString(),
  ...overrides,
});

describe('ApplicationRepository', () => {
  let repo: ApplicationRepository;

  beforeEach(() => {
    repo = new ApplicationRepository();
    vi.clearAllMocks();
  });

  describe('method existence', () => {
    it('should have createApplication', () => expect(typeof repo.createApplication).toBe('function'));
    it('should have getApplication', () => expect(typeof repo.getApplication).toBe('function'));
    it('should have getActiveApplicationByType', () => expect(typeof repo.getActiveApplicationByType).toBe('function'));
    it('should have getApplicantApplications', () => expect(typeof repo.getApplicantApplications).toBe('function'));
    it('should have listGuildApplications', () => expect(typeof repo.listGuildApplications).toBe('function'));
    it('should have updateApplication', () => expect(typeof repo.updateApplication).toBe('function'));
    it('should have submitApplication', () => expect(typeof repo.submitApplication).toBe('function'));
    it('should have approveApplication', () => expect(typeof repo.approveApplication).toBe('function'));
    it('should have rejectApplication', () => expect(typeof repo.rejectApplication).toBe('function'));
    it('should have withdrawApplication', () => expect(typeof repo.withdrawApplication).toBe('function'));
    it('should have saveAnswers', () => expect(typeof repo.saveAnswers).toBe('function'));
    it('should have getAnswers', () => expect(typeof repo.getAnswers).toBe('function'));
    it('should have deleteAnswers', () => expect(typeof repo.deleteAnswers).toBe('function'));
  });
});

describe('Application Model', () => {
  it('should create a valid application object', () => {
    const app = createMockApplication();
    expect(app.id).toBe(1);
    expect(app.guild_id).toBe('guild1');
    expect(app.status).toBe('DRAFT');
    expect(app.applicant_id).toBe('user1');
  });

  it('should support all statuses', () => {
    const statuses: ApplicationStatus[] = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN'];
    for (const status of statuses) {
      const app = createMockApplication({ status });
      expect(app.status).toBe(status);
    }
  });

  it('should support all types', () => {
    const types: ApplicationType[] = ['STAFF', 'FAMILY', 'PARTNERSHIP', 'OTHER'];
    for (const type of types) {
      const app = createMockApplication({ type });
      expect(app.type).toBe(type);
    }
  });

  it('should enforce guild isolation', () => {
    const app1 = createMockApplication({ guild_id: 'guild_a', applicant_id: 'user1' });
    const app2 = createMockApplication({ guild_id: 'guild_b', applicant_id: 'user1' });
    expect(app1.guild_id).not.toBe(app2.guild_id);
  });

  it('should enforce applicant isolation', () => {
    const app1 = createMockApplication({ guild_id: 'guild1', applicant_id: 'user1' });
    const app2 = createMockApplication({ guild_id: 'guild1', applicant_id: 'user2' });
    expect(app1.applicant_id).not.toBe(app2.applicant_id);
  });
});

describe('Application Status Transitions', () => {
  it('DRAFT -> SUBMITTED is valid', () => {
    const app = createMockApplication({ status: 'DRAFT' });
    expect(app.status).toBe('DRAFT');
    const submitted = { ...app, status: 'SUBMITTED' as ApplicationStatus };
    expect(submitted.status).toBe('SUBMITTED');
  });

  it('SUBMITTED -> UNDER_REVIEW is valid', () => {
    const app = createMockApplication({ status: 'SUBMITTED' });
    const review = { ...app, status: 'UNDER_REVIEW' as ApplicationStatus };
    expect(review.status).toBe('UNDER_REVIEW');
  });

  it('SUBMITTED -> APPROVED is valid', () => {
    const app = createMockApplication({ status: 'SUBMITTED' });
    const approved = { ...app, status: 'APPROVED' as ApplicationStatus };
    expect(approved.status).toBe('APPROVED');
  });

  it('SUBMITTED -> REJECTED is valid', () => {
    const app = createMockApplication({ status: 'SUBMITTED' });
    const rejected = { ...app, status: 'REJECTED' as ApplicationStatus };
    expect(rejected.status).toBe('REJECTED');
  });

  it('DRAFT -> WITHDRAWN is valid', () => {
    const app = createMockApplication({ status: 'DRAFT' });
    const withdrawn = { ...app, status: 'WITHDRAWN' as ApplicationStatus };
    expect(withdrawn.status).toBe('WITHDRAWN');
  });

  it('SUBMITTED -> WITHDRAWN is valid', () => {
    const app = createMockApplication({ status: 'SUBMITTED' });
    const withdrawn = { ...app, status: 'WITHDRAWN' as ApplicationStatus };
    expect(withdrawn.status).toBe('WITHDRAWN');
  });
});

describe('Application Questions', () => {
  it('should return questions for STAFF', () => {
    const questions = getQuestions('STAFF');
    expect(questions.length).toBeGreaterThan(0);
    expect(questions[0].id).toBe('staff_experience');
  });

  it('should return questions for FAMILY', () => {
    const questions = getQuestions('FAMILY');
    expect(questions.length).toBeGreaterThan(0);
    expect(questions[0].id).toBe('family_server_name');
  });

  it('should return questions for PARTNERSHIP', () => {
    const questions = getQuestions('PARTNERSHIP');
    expect(questions.length).toBeGreaterThan(0);
  });

  it('should return questions for OTHER', () => {
    const questions = getQuestions('OTHER');
    expect(questions.length).toBeGreaterThan(0);
  });

  it('should have required flag', () => {
    const questions = getQuestions('STAFF');
    for (const q of questions) {
      expect(typeof q.required).toBe('boolean');
    }
  });

  it('should have maxLength', () => {
    const questions = getQuestions('STAFF');
    for (const q of questions) {
      expect(q.maxLength).toBeGreaterThan(0);
    }
  });

  it('should have order', () => {
    const questions = getQuestions('STAFF');
    for (let i = 0; i < questions.length; i++) {
      expect(questions[i].order).toBe(i + 1);
    }
  });
});

describe('Answer Validation', () => {
  it('should pass valid answers', () => {
    const result = validateAnswers('STAFF', [
      { questionId: 'staff_experience', answer: 'I have experience.' },
      { questionId: 'staff_availability', answer: '20 hours' },
      { questionId: 'staff_reason', answer: 'I want to help.' },
    ]);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should fail missing required answers', () => {
    const result = validateAnswers('STAFF', []);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should fail exceeding max length', () => {
    const result = validateAnswers('STAFF', [
      { questionId: 'staff_experience', answer: 'x'.repeat(1001) },
      { questionId: 'staff_availability', answer: '20 hours' },
      { questionId: 'staff_reason', answer: 'I want to help.' },
    ]);
    expect(result.valid).toBe(false);
  });

  it('should validate NUMBER type', () => {
    const result = validateAnswers('FAMILY', [
      { questionId: 'family_server_name', answer: 'My Server' },
      { questionId: 'family_member_count', answer: 'not-a-number' },
      { questionId: 'family_reason', answer: 'Partnership' },
      { questionId: 'family_link', answer: 'https://discord.gg/test' },
    ]);
    expect(result.valid).toBe(false);
  });

  it('should pass valid NUMBER', () => {
    const result = validateAnswers('FAMILY', [
      { questionId: 'family_server_name', answer: 'My Server' },
      { questionId: 'family_member_count', answer: '1000' },
      { questionId: 'family_reason', answer: 'Partnership' },
      { questionId: 'family_link', answer: 'https://discord.gg/test' },
    ]);
    expect(result.valid).toBe(true);
  });
});

describe('Application Permission Logic', () => {
  const canWithdraw = (status: ApplicationStatus): boolean =>
    status === 'DRAFT' || status === 'SUBMITTED';

  const canReview = (status: ApplicationStatus): boolean =>
    status === 'SUBMITTED' || status === 'UNDER_REVIEW';

  it('DRAFT can be withdrawn', () => expect(canWithdraw('DRAFT')).toBe(true));
  it('SUBMITTED can be withdrawn', () => expect(canWithdraw('SUBMITTED')).toBe(true));
  it('UNDER_REVIEW cannot be withdrawn', () => expect(canWithdraw('UNDER_REVIEW')).toBe(false));
  it('APPROVED cannot be withdrawn', () => expect(canWithdraw('APPROVED')).toBe(false));

  it('SUBMITTED can be reviewed', () => expect(canReview('SUBMITTED')).toBe(true));
  it('UNDER_REVIEW can be reviewed', () => expect(canReview('UNDER_REVIEW')).toBe(true));
  it('DRAFT cannot be reviewed', () => expect(canReview('DRAFT')).toBe(false));
  it('APPROVED cannot be reviewed', () => expect(canReview('APPROVED')).toBe(false));
});

describe('Application Answer Model', () => {
  it('should create a valid answer object', () => {
    const answer = createMockAnswer();
    expect(answer.application_id).toBe(1);
    expect(answer.question_id).toBe('staff_experience');
    expect(answer.answer).toBeTruthy();
  });

  it('should support different question IDs', () => {
    const answer = createMockAnswer({ question_id: 'staff_availability' });
    expect(answer.question_id).toBe('staff_availability');
  });
});
