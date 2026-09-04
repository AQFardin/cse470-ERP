"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllApplications = getAllApplications;
exports.getApplication = getApplication;
exports.updateApplicationStatus = updateApplicationStatus;
const prisma_1 = require("../../../src/lib/prisma");
;
const client_1 = require("@prisma/client");
const email_service_1 = require("../services/email.service");
// ─── GET All Applications (HR — the "candidate database") ──
// Supports filtering by role (job posting) and by status
async function getAllApplications(req, res) {
    try {
        const { jobPostingId, status, search } = req.query;
        const where = {};
        if (jobPostingId)
            where.jobPostingId = jobPostingId;
        if (status && status !== 'ALL')
            where.status = status;
        if (search) {
            where.applicant = {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                ],
            };
        }
        const applications = await prisma_1.prisma.application.findMany({
            where,
            include: { applicant: true, jobPosting: true },
            orderBy: { dateApplied: 'desc' },
        });
        res.json({ success: true, data: applications, count: applications.length });
    }
    catch (error) {
        console.error('Get applications error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch applications' });
    }
}
// ─── GET Single Application (with full status history) ──
async function getApplication(req, res) {
    try {
        const { id } = req.params;
        const application = await prisma_1.prisma.application.findUnique({
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
    }
    catch (error) {
        console.error('Get application error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch application' });
    }
}
// ─── UPDATE Application Status (HR — moves candidate through the pipeline) ──
async function updateApplicationStatus(req, res) {
    try {
        const { id } = req.params;
        const { status, changedById } = req.body;
        if (!status || !Object.values(client_1.ApplicationStatus).includes(status)) {
            res.status(400).json({
                success: false,
                error: `Invalid status. Must be one of: ${Object.values(client_1.ApplicationStatus).join(', ')}`,
            });
            return;
        }
        const existing = await prisma_1.prisma.application.findUnique({
            where: { id },
            include: { applicant: true, jobPosting: true },
        });
        if (!existing) {
            res.status(404).json({ success: false, error: 'Application not found' });
            return;
        }
        const [updated] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.application.update({
                where: { id },
                data: { status: status },
            }),
            prisma_1.prisma.applicationStatusHistory.create({
                data: {
                    applicationId: id,
                    oldStatus: existing.status,
                    newStatus: status,
                    changedById: changedById || null,
                },
            }),
        ]);
        const statusCheckUrl = `http://localhost:5173/status?token=${existing.applicant.accessToken}`;
        await (0, email_service_1.sendStatusChangeEmail)(existing.applicant.email, existing.jobPosting.title, status, statusCheckUrl);
        res.json({ success: true, data: updated });
    }
    catch (error) {
        if (error.code === 'P2025') {
            res.status(404).json({ success: false, error: 'Application not found' });
            return;
        }
        console.error('Update application status error:', error);
        res.status(500).json({ success: false, error: 'Failed to update status' });
    }
}
//# sourceMappingURL=application.controller.js.map