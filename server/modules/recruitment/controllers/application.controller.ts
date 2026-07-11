import { Request, Response } from 'express';
import { prisma } from '../../../src/lib/prisma';;
import { ApplicationStatus } from '@prisma/client';
import { sendStatusChangeEmail } from '../services/email.service';

// ─── GET All Applications (HR — the "candidate database") ──
// Supports filtering by role (job posting) and by status
export async function getAllApplications(req: Request, res: Response) {
  try {
    const { jobPostingId, status, search } = req.query;
    const where: any = {};

    if (jobPostingId) where.jobPostingId = jobPostingId as string;
    if (status && status !== 'ALL') where.status = status as ApplicationStatus;
    if (search) {
      where.applicant = {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
        ],
      };
    }

    const applications = await prisma.application.findMany({
      where,
      include: { applicant: true, jobPosting: true },
      orderBy: { dateApplied: 'desc' },
    });

    res.json({ success: true, data: applications, count: applications.length });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch applications' });
  }
}

// ─── GET Single Application (with full status history) ──
export async function getApplication(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        applicant: true,
        jobPosting: true,
        statusHistory: { orderBy: { timestamp: 'desc' } },
      },
    });

    if (!application) {
      res.status(404).json({ success: false, error: 'Application not found' });
      return;
    }

    res.json({ success: true, data: application });
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch application' });
  }
}

// ─── UPDATE Application Status (HR — moves candidate through the pipeline) ──
export async function updateApplicationStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status, changedById } = req.body;

    if (!status || !Object.values(ApplicationStatus).includes(status)) {
      res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${Object.values(ApplicationStatus).join(', ')}`,
      });
      return;
    }

    const existing = await prisma.application.findUnique({
      where: { id },
      include: { applicant: true, jobPosting: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Application not found' });
      return;
    }

    const [updated] = await prisma.$transaction([
      prisma.application.update({
        where: { id },
        data: { status: status as ApplicationStatus },
      }),
      prisma.applicationStatusHistory.create({
        data: {
          applicationId: id,
          oldStatus: existing.status,
          newStatus: status as ApplicationStatus,
          changedById: changedById || null,
        },
      }),
    ]);

    const statusCheckUrl = `http://localhost:5173/status?token=${existing.applicant.accessToken}`;
    await sendStatusChangeEmail(existing.applicant.email, existing.jobPosting.title, status, statusCheckUrl);

    res.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Application not found' });
      return;
    }
    console.error('Update application status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
}
