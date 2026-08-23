import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getMeetings(
  req: Request,
  res: Response
) {
  try {
    const employeeId = String(
      req.query.employeeId || ""
    );

    const meetings = await prisma.meeting.findMany({
      where: employeeId
        ? {
            OR: [
              { createdById: employeeId },
              {
                participants: {
                  some: {
                    employeeId,
                  },
                },
              },
            ],
          }
        : undefined,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        participants: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    return res.json(meetings);
  } catch (error) {
    console.error("Get meetings error:", error);

    return res.status(500).json({
      error: "Failed to fetch meetings",
    });
  }
}

export async function createMeeting(
  req: Request,
  res: Response
) {
  try {
    const {
      title,
      description,
      startTime,
      endTime,
      createdById,
      participantIds,
    } = req.body;

    if (
      !title ||
      !startTime ||
      !endTime ||
      !createdById
    ) {
      return res.status(400).json({
        error:
          "title, startTime, endTime and createdById are required",
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return res.status(400).json({
        error: "Invalid meeting date/time",
      });
    }

    if (end <= start) {
      return res.status(400).json({
        error:
          "Meeting end time must be after start time",
      });
    }

    const participants: string[] = Array.isArray(
      participantIds
    )
      ? participantIds
      : [];

    const meeting =
      await prisma.meeting.create({
        data: {
          title,
          description:
            description || null,
          startTime: start,
          endTime: end,
          createdById,

          participants: {
            create: participants
              .filter(
                (id) => id !== createdById
              )
              .map((employeeId) => ({
                employeeId,
              })),
          },
        },

        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },

          participants: {
            include: {
              employee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

    return res.status(201).json(meeting);
  } catch (error) {
    console.error(
      "Create meeting error:",
      error
    );

    return res.status(500).json({
      error: "Failed to create meeting",
    });
  }
}

export async function deleteMeeting(
  req: Request,
  res: Response
) {
  try {
    const id = String(req.params.id);

    await prisma.meeting.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: "Meeting deleted",
    });
  } catch (error) {
    console.error(
      "Delete meeting error:",
      error
    );

    return res.status(500).json({
      error: "Failed to delete meeting",
    });
  }
}