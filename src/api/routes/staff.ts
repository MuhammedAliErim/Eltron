import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { guildGuard } from '../middleware/guildGuard';
import { rateLimits } from '../middleware/rateLimit';
import { StaffRepository } from '../../database/repositories/StaffRepository';
import { sendData, sendError } from '../utils/response';
import { logError } from '../../utils/logger';

const router = Router();
const staffRepo = new StaffRepository();

router.get(
  '/:id/staff',
  requireAuth,
  guildGuard,
  rateLimits.normalGet,
  async (req: Request, res: Response) => {
    const guildId = req.params.id as string;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    try {
      const staff = await staffRepo.listStaff(guildId, status);

      const safeStaff = staff.map((s) => ({
        user_id: s.user_id,
        staff_role: s.staff_role,
        status: s.status,
        added_by: s.added_by,
        created_at: s.created_at,
        updated_at: s.updated_at,
      }));

      sendData(res, safeStaff);
    } catch (error) {
      logError(`Failed to fetch staff for guild ${guildId}`, error);
      sendError(res, 500, 'Failed to fetch staff', 'STAFF_FETCH_FAILED');
    }
  }
);

export default router;
