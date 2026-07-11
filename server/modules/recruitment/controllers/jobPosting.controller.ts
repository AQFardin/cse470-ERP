import { Request, Response } from 'express';
import { prisma } from '../../../src/lib/prisma';
import { JobPostingStatus, Department } from '@prisma/client';

// ─── CREATE Job Posting (HR only) ───────────────────────
export async function createJobPosting(req: Request, res: Response) {
  try {
    const { title, description, requirements, location, department, postedById } = req.body;

    if (!title || !description || !requirements || !location || !department || !postedById) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    const jobPosting = await prisma.jobPosting.create({
      data: {
        title,
        description,
        requirements,
        location,
        department: department as Department,
        postedById,
      },
    });

    res.status(201).json({ success: true, data: jobPosting });
  } catch (error) {
    console.error('Create job posting error:', error);
    res.status(500).json({ success: false, error: 'Failed to create job posting' });
  }
}

// ─── GET All Job Postings (HR view — includes closed ones) ──
export async function getAllJobPostings(req: Request, res: Response) {
  try {
    const { status, department } = req.query;
    const where: any = {};
    if (status && status !== 'ALL') where.status = status as JobPostingStatus;
    if (department && department !== 'ALL') where.department = department as Department;

    const jobPostings = await prisma.jobPosting.findMany({
      where,
      orderBy: { datePosted: 'desc' },
      include: { _count: { select: { applications: true } } },
    });

    res.json({ success: true, data: jobPostings, count: jobPostings.length });
  } catch (error) {
    console.error('Get job postings error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch job postings' });
  }
}

// ─── GET Active Job Postings (public — for the careers page) ──
export async function getActiveJobPostings(_req: Request, res: Response) {
  try {
    const jobPostings = await prisma.jobPosting.findMany({
      where: { status: JobPostingStatus.ACTIVE },
      orderBy: { datePosted: 'desc' },
    });

    res.json({ success: true, data: jobPostings, count: jobPostings.length });
  } catch (error) {
    console.error('Get active job postings error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch job postings' });
  }
}

// ─── GET Single Job Posting ──────────────────────────────
export async function getJobPosting(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const jobPosting = await prisma.jobPosting.findUnique({ where: { id } });

    if (!jobPosting) {
      res.status(404).json({ success: false, error: 'Job posting not found' });
      return;
    }

    res.json({ success: true, data: jobPosting });
  } catch (error) {
    console.error('Get job posting error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch job posting' });
  }
}

// ─── UPDATE Job Posting (HR only — edit details or close it) ──
export async function updateJobPosting(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { title, description, requirements, location, department, status } = req.body;

    const data: any = {
      ...(title && { title }),
      ...(description && { description }),
      ...(requirements && { requirements }),
      ...(location && { location }),
      ...(department && { department: department as Department }),
    };

    if (status) {
      data.status = status as JobPostingStatus;
      if (status === JobPostingStatus.CLOSED) {
        data.dateClosed = new Date();
      }
    }

    const jobPosting = await prisma.jobPosting.update({ where: { id }, data });
    res.json({ success: true, data: jobPosting });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Job posting not found' });
      return;
    }
    console.error('Update job posting error:', error);
    res.status(500).json({ success: false, error: 'Failed to update job posting' });
  }
}
