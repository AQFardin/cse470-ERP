"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJobPosting = createJobPosting;
exports.getAllJobPostings = getAllJobPostings;
exports.getActiveJobPostings = getActiveJobPostings;
exports.getJobPosting = getJobPosting;
exports.updateJobPosting = updateJobPosting;
const prisma_1 = require("../../../src/lib/prisma");
const client_1 = require("@prisma/client");
// ─── CREATE Job Posting (HR only) ───────────────────────
async function createJobPosting(req, res) {
    try {
        const { title, description, requirements, location, department, postedById } = req.body;
        if (!title || !description || !requirements || !location || !department || !postedById) {
            res.status(400).json({ success: false, error: 'Missing required fields' });
            return;
        }
        const jobPosting = await prisma_1.prisma.jobPosting.create({
            data: {
                title,
                description,
                requirements,
                location,
                department: department,
                postedById,
            },
        });
        res.status(201).json({ success: true, data: jobPosting });
    }
    catch (error) {
        console.error('Create job posting error:', error);
        res.status(500).json({ success: false, error: 'Failed to create job posting' });
    }
}
// ─── GET All Job Postings (HR view — includes closed ones) ──
async function getAllJobPostings(req, res) {
    try {
        const { status, department } = req.query;
        const where = {};
        if (status && status !== 'ALL')
            where.status = status;
        if (department && department !== 'ALL')
            where.department = department;
        const jobPostings = await prisma_1.prisma.jobPosting.findMany({
            where,
            orderBy: { datePosted: 'desc' },
            include: { _count: { select: { applications: true } } },
        });
        res.json({ success: true, data: jobPostings, count: jobPostings.length });
    }
    catch (error) {
        console.error('Get job postings error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch job postings' });
    }
}
// ─── GET Active Job Postings (public — for the careers page) ──
async function getActiveJobPostings(_req, res) {
    try {
        const jobPostings = await prisma_1.prisma.jobPosting.findMany({
            where: { status: client_1.JobPostingStatus.ACTIVE },
            orderBy: { datePosted: 'desc' },
        });
        res.json({ success: true, data: jobPostings, count: jobPostings.length });
    }
    catch (error) {
        console.error('Get active job postings error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch job postings' });
    }
}
// ─── GET Single Job Posting ──────────────────────────────
async function getJobPosting(req, res) {
    try {
        const { id } = req.params;
        const jobPosting = await prisma_1.prisma.jobPosting.findUnique({ where: { id } });
        if (!jobPosting) {
            res.status(404).json({ success: false, error: 'Job posting not found' });
            return;
        }
        res.json({ success: true, data: jobPosting });
    }
    catch (error) {
        console.error('Get job posting error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch job posting' });
    }
}
// ─── UPDATE Job Posting (HR only — edit details or close it) ──
async function updateJobPosting(req, res) {
    try {
        const { id } = req.params;
        const { title, description, requirements, location, department, status } = req.body;
        const data = {
            ...(title && { title }),
            ...(description && { description }),
            ...(requirements && { requirements }),
            ...(location && { location }),
            ...(department && { department: department }),
        };
        if (status) {
            data.status = status;
            if (status === client_1.JobPostingStatus.CLOSED) {
                data.dateClosed = new Date();
            }
        }
        const jobPosting = await prisma_1.prisma.jobPosting.update({ where: { id }, data });
        res.json({ success: true, data: jobPosting });
    }
    catch (error) {
        if (error.code === 'P2025') {
            res.status(404).json({ success: false, error: 'Job posting not found' });
            return;
        }
        console.error('Update job posting error:', error);
        res.status(500).json({ success: false, error: 'Failed to update job posting' });
    }
}
//# sourceMappingURL=jobPosting.controller.js.map