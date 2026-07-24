"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitApplication = submitApplication;
exports.checkApplicationStatus = checkApplicationStatus;
const prisma_1 = require("../../../src/lib/prisma");
const email_service_1 = require("../services/email.service");
// ─── SUBMIT Application (public) ────────────────────────
// Handles: name, email, phone, role applied for, CV upload
async function submitApplication(req, res) {
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
        const jobPosting = await prisma_1.prisma.jobPosting.findUnique({ where: { id: jobPostingId } });
        if (!jobPosting) {
            res.status(404).json({ success: false, error: 'Job posting not found' });
            return;
        }
        const resumeUrl = `/uploads/resumes/${req.file.filename}`;
        // Find or create the applicant (same person may apply to multiple roles)
        let applicant = await prisma_1.prisma.applicant.findUnique({ where: { email } });
        if (!applicant) {
            applicant = await prisma_1.prisma.applicant.create({
                data: { name, email, phone, resumeUrl, coverLetter },
            });
        }
        const application = await prisma_1.prisma.application.create({
            data: {
                applicantId: applicant.id,
                jobPostingId,
            },
            include: { jobPosting: true, applicant: true },
        });
        const statusCheckUrl = `http://localhost:5173/status?token=${applicant.accessToken}`;
        await (0, email_service_1.sendConfirmationEmail)(applicant.email, jobPosting.title, statusCheckUrl);
        res.status(201).json({
            success: true,
            data: application,
            message: 'Application submitted. Check your email for a confirmation link.',
        });
    }
    catch (error) {
        if (error.code === 'P2002') {
            res.status(409).json({ success: false, error: 'You already applied to this job posting' });
            return;
        }
        console.error('Submit application error:', error);
        res.status(500).json({ success: false, error: 'Failed to submit application' });
    }
}
// ─── CHECK Status (public — by email or unique access token) ──
async function checkApplicationStatus(req, res) {
    try {
        const { email, token } = req.query;
        if (!email && !token) {
            res.status(400).json({ success: false, error: 'Provide an email or access token' });
            return;
        }
        const applicant = await prisma_1.prisma.applicant.findFirst({
            where: token ? { accessToken: token } : { email: email },
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
    }
    catch (error) {
        console.error('Check status error:', error);
        res.status(500).json({ success: false, error: 'Failed to check status' });
    }
}
//# sourceMappingURL=applicant.controller.js.map