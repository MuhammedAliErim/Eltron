import { BaseRepository } from '../BaseRepository';
import {
  ApplicationRow,
  ApplicationCreate,
  ApplicationUpdate,
  ApplicationAnswerRow,
  ApplicationAnswerCreate,
} from '../schema';
import { logError } from '../../utils/logger';
import { DatabaseQueryError } from '../../utils/errors';

export class ApplicationRepository extends BaseRepository {
  async createApplication(data: ApplicationCreate): Promise<ApplicationRow> {
    try {
      const { data: created, error } = await this.supabase
        .from('applications')
        .insert({
          guild_id: data.guild_id,
          applicant_id: data.applicant_id,
          type: data.type,
          status: 'DRAFT',
        })
        .select()
        .single();

      if (error) {
        logError(`Error creating application for guild ${data.guild_id}`, error);
        throw new DatabaseQueryError(`Failed to create application: ${error.message}`);
      }

      return created as ApplicationRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in createApplication for guild ${data.guild_id}`, error);
      throw new DatabaseQueryError('Failed to create application');
    }
  }

  async getApplication(applicationId: number): Promise<ApplicationRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as ApplicationRow;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching application ${applicationId}`, error);
      throw new DatabaseQueryError(`Failed to fetch application ${applicationId}`);
    }
  }

  async getActiveApplicationByType(
    guildId: string,
    applicantId: string,
    type: string
  ): Promise<ApplicationRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('applications')
        .select('*')
        .eq('guild_id', guildId)
        .eq('applicant_id', applicantId)
        .eq('type', type)
        .in('status', ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'])
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;

      return data as ApplicationRow;
    } catch (error) {
      if (error instanceof Error && 'code' in error) throw error;
      logError(`Error fetching active application for user ${applicantId}`, error);
      throw new DatabaseQueryError(`Failed to fetch active application`);
    }
  }

  async getApplicantApplications(
    guildId: string,
    applicantId: string
  ): Promise<ApplicationRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('applications')
        .select('*')
        .eq('guild_id', guildId)
        .eq('applicant_id', applicantId)
        .order('created_at', { ascending: false });

      if (error) {
        logError(`Error listing applications for user ${applicantId}`, error);
        throw new DatabaseQueryError(`Failed to list applications`);
      }

      return (data || []) as ApplicationRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getApplicantApplications`, error);
      throw new DatabaseQueryError(`Failed to list applications`);
    }
  }

  async listGuildApplicationsPaginated(
    guildId: string,
    options: { page?: number; pageSize?: number; status?: string; type?: string } = {}
  ): Promise<{ data: ApplicationRow[]; total: number }> {
    try {
      const { page = 1, pageSize = 25, status, type } = options;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let countQuery = this.supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('guild_id', guildId);

      let dataQuery = this.supabase
        .from('applications')
        .select('*')
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (status) {
        countQuery = countQuery.eq('status', status);
        dataQuery = dataQuery.eq('status', status);
      }
      if (type) {
        countQuery = countQuery.eq('type', type);
        dataQuery = dataQuery.eq('type', type);
      }

      const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

      if (countResult.error) throw countResult.error;
      if (dataResult.error) throw dataResult.error;

      return {
        data: (dataResult.data || []) as ApplicationRow[],
        total: countResult.count ?? 0,
      };
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error paginating applications for guild ${guildId}`, error);
      throw new DatabaseQueryError(`Failed to paginate applications`);
    }
  }

  async listGuildApplications(
    guildId: string,
    status?: string,
    type?: string
  ): Promise<ApplicationRow[]> {
    try {
      let query = this.supabase
        .from('applications')
        .select('*')
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }
      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) {
        logError(`Error listing applications for guild ${guildId}`, error);
        throw new DatabaseQueryError(`Failed to list applications`);
      }

      return (data || []) as ApplicationRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in listGuildApplications`, error);
      throw new DatabaseQueryError(`Failed to list applications`);
    }
  }

  async updateApplication(
    applicationId: number,
    updates: ApplicationUpdate
  ): Promise<ApplicationRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('applications')
        .update(updates)
        .eq('id', applicationId)
        .select()
        .single();

      if (error) {
        logError(`Error updating application ${applicationId}`, error);
        throw new DatabaseQueryError(`Failed to update application ${applicationId}`);
      }

      return data as ApplicationRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in updateApplication ${applicationId}`, error);
      throw new DatabaseQueryError(`Failed to update application ${applicationId}`);
    }
  }

  async submitApplication(applicationId: number): Promise<ApplicationRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('applications')
        .update({
          status: 'SUBMITTED',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
        .eq('status', 'DRAFT')
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error submitting application ${applicationId}`, error);
        throw new DatabaseQueryError(`Failed to submit application ${applicationId}`);
      }

      return data as ApplicationRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in submitApplication ${applicationId}`, error);
      throw new DatabaseQueryError(`Failed to submit application ${applicationId}`);
    }
  }

  async approveApplication(
    applicationId: number,
    reviewedBy: string
  ): Promise<ApplicationRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('applications')
        .update({
          status: 'APPROVED',
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewedBy,
        })
        .eq('id', applicationId)
        .in('status', ['SUBMITTED', 'UNDER_REVIEW'])
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error approving application ${applicationId}`, error);
        throw new DatabaseQueryError(`Failed to approve application ${applicationId}`);
      }

      return data as ApplicationRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in approveApplication ${applicationId}`, error);
      throw new DatabaseQueryError(`Failed to approve application ${applicationId}`);
    }
  }

  async rejectApplication(
    applicationId: number,
    reviewedBy: string,
    reason: string
  ): Promise<ApplicationRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('applications')
        .update({
          status: 'REJECTED',
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewedBy,
          review_reason: reason,
        })
        .eq('id', applicationId)
        .in('status', ['SUBMITTED', 'UNDER_REVIEW'])
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error rejecting application ${applicationId}`, error);
        throw new DatabaseQueryError(`Failed to reject application ${applicationId}`);
      }

      return data as ApplicationRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in rejectApplication ${applicationId}`, error);
      throw new DatabaseQueryError(`Failed to reject application ${applicationId}`);
    }
  }

  async withdrawApplication(applicationId: number): Promise<ApplicationRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('applications')
        .update({
          status: 'WITHDRAWN',
        })
        .eq('id', applicationId)
        .in('status', ['DRAFT', 'SUBMITTED'])
        .select()
        .single();

      if (error && error.code === 'PGRST116') return null;
      if (error) {
        logError(`Error withdrawing application ${applicationId}`, error);
        throw new DatabaseQueryError(`Failed to withdraw application ${applicationId}`);
      }

      return data as ApplicationRow;
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in withdrawApplication ${applicationId}`, error);
      throw new DatabaseQueryError(`Failed to withdraw application ${applicationId}`);
    }
  }

  async saveAnswers(answers: ApplicationAnswerCreate[]): Promise<void> {
    try {
      if (answers.length === 0) return;

      const { error } = await this.supabase
        .from('application_answers')
        .insert(answers);

      if (error) {
        logError(`Error saving application answers`, error);
        throw new DatabaseQueryError(`Failed to save answers: ${error.message}`);
      }
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in saveAnswers`, error);
      throw new DatabaseQueryError('Failed to save answers');
    }
  }

  async getAnswers(applicationId: number): Promise<ApplicationAnswerRow[]> {
    try {
      const { data, error } = await this.supabase
        .from('application_answers')
        .select('*')
        .eq('application_id', applicationId)
        .order('id', { ascending: true });

      if (error) {
        logError(`Error fetching answers for application ${applicationId}`, error);
        throw new DatabaseQueryError(`Failed to fetch answers`);
      }

      return (data || []) as ApplicationAnswerRow[];
    } catch (error) {
      if (error instanceof DatabaseQueryError) throw error;
      logError(`Error in getAnswers`, error);
      throw new DatabaseQueryError('Failed to fetch answers');
    }
  }

  async deleteAnswers(applicationId: number): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('application_answers')
        .delete()
        .eq('application_id', applicationId);

      if (error) {
        logError(`Error deleting answers for application ${applicationId}`, error);
      }
    } catch (error) {
      logError(`Error in deleteAnswers`, error);
    }
  }
}
