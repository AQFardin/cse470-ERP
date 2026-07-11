import { Request, Response } from 'express';
import { prisma } from '../../../src/lib/prisma';
import { sendConfirmationEmail } from '../services/email.service';

// ─── SUBMIT Application (public) ────────────────────────
// Handles: name, email, phone, role applied for, CV upload
export async function submitApplication(req: Request, res: Response) {
  try {
    const { name, email, phone, jobPostingId, coverLetter } = req.body;

    if (!name || !email || !jobPostingId) {
      res.status(400).json({ success: false, error: 'Name, email, and job posting are required' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, error: 'A CV/resume file is required' });
      return;
    }

    const jobPosting = await prisma.jobPosting.findUnique({ where: { id: jobPostingId } });
    if (!jobPosting) {
      res.status(404).json({ success: false, error: 'Job posting not found' });
      return;
    }

    const resumeUrl = `/uploads/resumes/${req.file.filename}`;

    // Find or create the applicant (same person may apply to multiple roles)
    let applicant = await prisma.applicant.findUnique({ where: { email } });
    if (!applicant) {
      applicant = await prisma.applicant.create({
        data: { name, email, phone, resumeUrl, coverLetter },
      });
    }

    const application = await prisma.application.create({
      data: {
        applicantId: applicant.id,
        jobPostingId,
      },
      include: { jobPosting: true, applicant: true },
    });

    const statusCheckUrl = `http://localhost:5173/status?token=${applicant.accessToken}`;
    await sendConfirmationEmail(applicant.email, jobPosting.title, statusCheckUrl);

    res.status(201).json({
      success: true,
      data: application,
      message: 'Application submitted. Check your email for a confirmation link.',
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ success: false, error: 'You already applied to this job posting' });
      return;
    }
    console.error('Submit application error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit application' });
  }
}

// ─── CHECK Status (public — by email or unique access token) ──
export async function checkApplicationStatus(req: Request, res: Response) {
  try {
    const { email, token } = req.query;

    if (!email && !token) {
      res.status(400).json({ success: false, error: 'Provide an email or access token' });
      return;
    }

    const applicant = await prisma.applicant.findFirst({
      where: token ? { accessToken: token as string } : { email: email as string },
      include: {
        applications: {
          include: { jobPosting: true },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!applicant) {
      res.status(404).json({ success: false, error: 'No applications found for that email' });
      return;
    }

    res.json({
      success: true,
      data: {
        name: applicant.name,
        email: applicant.email,
        applications: applicant.applications,
      },
    });
  } catch (error) {
    console.error('Check status error:', error);
    res.status(500).json({ success: false, error: 'Failed to check status' });
  }
}
