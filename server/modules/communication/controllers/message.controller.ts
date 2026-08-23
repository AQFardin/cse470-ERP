import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getMessages(
  req: Request,
  res: Response
) {
  try {
    const employeeId = String(
      req.query.employeeId || ""
    );

    if (!employeeId) {
      return res.status(400).json({
        error: "employeeId is required",
      });
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: employeeId },
          { receiverId: employeeId },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(messages);
  } catch (error) {
    console.error("Get messages error:", error);

    return res.status(500).json({
      error: "Failed to fetch messages",
    });
  }
}

export async function sendMessage(
  req: Request,
  res: Response
) {
  try {
    const {
      senderId,
      receiverId,
      subject,
      content,
    } = req.body;

    if (!senderId || !receiverId || !content) {
      return res.status(400).json({
        error:
          "senderId, receiverId and content are required",
      });
    }

    if (senderId === receiverId) {
      return res.status(400).json({
        error: "You cannot send a message to yourself",
      });
    }

    const receiver = await prisma.employee.findUnique({
      where: {
        id: receiverId,
      },
    });

    if (!receiver) {
      return res.status(404).json({
        error: "Receiver not found",
      });
    }

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        subject: subject || null,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return res.status(201).json(message);
  } catch (error) {
    console.error("Send message error:", error);

    return res.status(500).json({
      error: "Failed to send message",
    });
  }
}

export async function markMessageRead(
  req: Request,
  res: Response
) {
  try {
    const id = String(req.params.id);

    const message = await prisma.message.update({
      where: { id },
      data: {
        isRead: true,
      },
    });

    return res.json(message);
  } catch (error) {
    console.error(
      "Mark message read error:",
      error
    );

    return res.status(500).json({
      error: "Failed to mark message as read",
    });
  }
}