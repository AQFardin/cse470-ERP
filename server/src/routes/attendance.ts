import { Router } from 'express';
import {
  clockIn,
  clockOut,
  getEmployeeAttendance,
  getTodayStatus,
  getTeamCalendar,
} from '../controllers/attendanceController';
import { requirePermission } from '../middleware/authorize';

const router = Router();

router.post('/clock-in', requirePermission('attendance', 'clock'), clockIn);
router.post('/clock-out', requirePermission('attendance', 'clock'), clockOut);
router.get('/today', getTodayStatus);
router.get('/team-calendar', requirePermission('attendance', 'view_team'), getTeamCalendar);
router.get('/:employeeId', getEmployeeAttendance);

export default router;
