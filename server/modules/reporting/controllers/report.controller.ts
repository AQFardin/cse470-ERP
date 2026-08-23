import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

const prisma = new PrismaClient();

type ReportModule =
  | "employees"
  | "tasks"
  | "leave-requests";

type UserRole = "manager" | "employee";

function getRole(value: unknown): UserRole {
  return String(value).toLowerCase() === "manager"
    ? "manager"
    : "employee";
}

export async function getReport(req: Request, res: Response) {
  try {
    const module = String(req.params.module) as ReportModule;
    const employeeId = String(req.query.employeeId || "");
    const role = getRole(req.query.role);

    const search = String(req.query.search || "").trim();
    const department = String(req.query.department || "").trim();
    const status = String(req.query.status || "").trim();

    if (!employeeId) {
      return res.status(400).json({
        error: "employeeId is required",
      });
    }

    if (!["employees", "tasks", "leave-requests"].includes(module)) {
      return res.status(400).json({
        error: "Unsupported report module",
      });
    }

    /*
     * ROLE-BASED ACCESS
     *
     * Managers can report on all records.
     * Employees can only report on their own records.
     */

    // =========================
    // EMPLOYEES
    // =========================
    if (module === "employees") {
      const employees = await prisma.employee.findMany({
        where: {
          ...(role === "manager"
            ? {}
            : { id: employeeId }),

          ...(department
            ? {
                department: department as any,
              }
            : {}),

          ...(status
            ? {
                status: status as any,
              }
            : {}),

          ...(search
            ? {
                OR: [
                  {
                    firstName: {
                      contains: search,
                    },
                  },
                  {
                    lastName: {
                      contains: search,
                    },
                  },
                  {
                    email: {
                      contains: search,
                    },
                  },
                  {
                    employeeId: {
                      contains: search,
                    },
                  },
                ],
              }
            : {}),
        },

        orderBy: {
          employeeId: "asc",
        },
      });

      return res.json({
        module,
        role,
        count: employees.length,
        data: employees,
      });
    }

    // =========================
    // TASKS
    // =========================
    if (module === "tasks") {
      const tasks = await prisma.taskAssignment.findMany({
        where: {
          ...(role === "manager"
            ? {}
            : { assignedToId: employeeId }),

          ...(status
            ? {
                status: status as any,
              }
            : {}),

          ...(search
            ? {
                OR: [
                  {
                    title: {
                      contains: search,
                    },
                  },
                  {
                    description: {
                      contains: search,
                    },
                  },
                ],
              }
            : {}),
        },

        orderBy: {
          createdAt: "desc",
        },
      });

      return res.json({
        module,
        role,
        count: tasks.length,
        data: tasks,
      });
    }

    // =========================
    // LEAVE REQUESTS
    // =========================
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        ...(role === "manager"
          ? {}
          : { employeeId }),

        ...(status
          ? {
              status: status as any,
            }
          : {}),

        ...(search
          ? {
              reason: {
                contains: search,
              },
            }
          : {}),
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      module,
      role,
      count: leaveRequests.length,
      data: leaveRequests,
    });
  } catch (error) {
    console.error("Report error:", error);

    return res.status(500).json({
      error: "Failed to generate report",
    });
  }
}

export async function exportReport(req: Request, res: Response) {
  try {
    const module = String(req.params.module) as ReportModule;

    const employeeId = String(
      req.query.employeeId || ""
    );

    const role =
      String(req.query.role || "").toLowerCase() === "manager"
        ? "manager"
        : "employee";

    const format = String(
      req.query.format || "csv"
    ).toLowerCase();

    // =========================
    // FILTERS
    // =========================
    const search = String(
      req.query.search || ""
    ).trim();

    const department = String(
      req.query.department || ""
    ).trim();

    const status = String(
      req.query.status || ""
    ).trim();

    if (!employeeId) {
      return res.status(400).json({
        error: "employeeId is required",
      });
    }

    if (
      ![
        "employees",
        "tasks",
        "leave-requests",
      ].includes(module)
    ) {
      return res.status(400).json({
        error: "Unsupported report module",
      });
    }

    let rows: Record<string, unknown>[] = [];

    // =====================================================
    // EMPLOYEE REPORT
    // =====================================================
    if (module === "employees") {
      const data = await prisma.employee.findMany({
        where: {
          // RBAC
          ...(role === "manager"
            ? {}
            : { id: employeeId }),

          // Department filter
          ...(department
            ? {
                department: department as any,
              }
            : {}),

          // Status filter
          ...(status
            ? {
                status: status as any,
              }
            : {}),

          // Search filter
          ...(search
            ? {
                OR: [
                  {
                    firstName: {
                      contains: search,
                    },
                  },
                  {
                    lastName: {
                      contains: search,
                    },
                  },
                  {
                    email: {
                      contains: search,
                    },
                  },
                  {
                    employeeId: {
                      contains: search,
                    },
                  },
                ],
              }
            : {}),
        },

        orderBy: {
          employeeId: "asc",
        },
      });

      rows = data.map((employee) => ({
        EmployeeID: employee.employeeId,
        Name: `${employee.firstName} ${employee.lastName}`,
        Email: employee.email,
        Department: employee.department,
        Role: employee.role,
        Status: employee.status,
      }));
    }

    // =====================================================
    // TASK REPORT
    // =====================================================
    if (module === "tasks") {
      const data =
        await prisma.taskAssignment.findMany({
          where: {
            // RBAC
            ...(role === "manager"
              ? {}
              : {
                  assignedToId: employeeId,
                }),

            // Status filter
            ...(status
              ? {
                  status: status as any,
                }
              : {}),

            // Search filter
            ...(search
              ? {
                  OR: [
                    {
                      title: {
                        contains: search,
                      },
                    },
                    {
                      description: {
                        contains: search,
                      },
                    },
                  ],
                }
              : {}),
          },

          orderBy: {
            createdAt: "desc",
          },
        });

      rows = data.map((task) => ({
        ID: task.id,
        Title: task.title,
        Description: task.description || "",
        AssignedTo: task.assignedToId,
        AssignedBy: task.assignedById,
        Priority: task.priority,
        Status: task.status,
        Deadline: task.deadline.toISOString(),
        CreatedAt: task.createdAt.toISOString(),
      }));
    }

    // =====================================================
    // LEAVE REQUEST REPORT
    // =====================================================
    if (module === "leave-requests") {
      const data =
        await prisma.leaveRequest.findMany({
          where: {
            // RBAC
            ...(role === "manager"
              ? {}
              : {
                  employeeId,
                }),

            // Status filter
            ...(status
              ? {
                  status: status as any,
                }
              : {}),

            // Search filter
            ...(search
              ? {
                  reason: {
                    contains: search,
                  },
                }
              : {}),
          },

          orderBy: {
            createdAt: "desc",
          },
        });

      rows = data.map((leave) => ({
        ID: leave.id,
        EmployeeID: leave.employeeId,
        StartDate: leave.startDate.toISOString(),
        EndDate: leave.endDate.toISOString(),
        Reason: leave.reason,
        Status: leave.status,
        CreatedAt: leave.createdAt.toISOString(),
      }));
    }

    // =====================================================
    // CSV EXPORT
    // =====================================================
    if (format === "csv") {
      const headers =
        rows.length > 0
          ? Object.keys(rows[0])
          : [];

      const csv = [
        headers.join(","),

        ...rows.map((row) =>
          headers
            .map((header) =>
              JSON.stringify(
                row[header] ?? ""
              )
            )
            .join(",")
        ),
      ].join("\n");

      res.setHeader(
        "Content-Type",
        "text/csv"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${module}-report.csv"`
      );

      return res.send(csv);
    }

    // =====================================================
    // EXCEL EXPORT
    // =====================================================
    if (format === "excel") {
      const workbook =
        new ExcelJS.Workbook();

      const worksheet =
        workbook.addWorksheet("Report");

      if (rows.length > 0) {
        worksheet.columns =
          Object.keys(rows[0]).map(
            (key) => ({
              header: key,
              key,
              width: 22,
            })
          );

        rows.forEach((row) => {
          worksheet.addRow(row);
        });
      }

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${module}-report.xlsx"`
      );

      await workbook.xlsx.write(res);

      return res.end();
    }

    // =====================================================
    // PDF EXPORT
    // =====================================================
    if (format === "pdf") {
      const doc = new PDFDocument({
        margin: 40,
        size: "A4",
      });

      res.setHeader(
        "Content-Type",
        "application/pdf"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${module}-report.pdf"`
      );

      doc.pipe(res);

      doc
        .fontSize(18)
        .text(`${module} Report`, {
          align: "center",
        });

      doc.moveDown();

      doc.fontSize(9);

      rows.forEach((row, index) => {
        doc
          .fontSize(11)
          .text(`Record ${index + 1}`);

        doc.fontSize(9);

        Object.entries(row).forEach(
          ([key, value]) => {
            doc.text(
              `${key}: ${String(
                value ?? ""
              )}`
            );
          }
        );

        doc.moveDown();
      });

      doc.end();

      return;
    }

    return res.status(400).json({
      error:
        "Unsupported export format. Use csv, excel, or pdf.",
    });
  } catch (error) {
    console.error(
      "Export error:",
      error
    );

    return res.status(500).json({
      error: "Failed to export report",
    });
  }
}