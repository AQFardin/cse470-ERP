import { PrismaClient, Department, Role, EmployeeStatus, LeaveType, LeaveStatus, TaskPriority, TaskStatus, SystemRole, AuditAction, TicketCategory, TicketStatus, TicketPriority, ProjectStatus } from '../server/node_modules/.prisma/client';
import path from 'path';

const dbPath = path.resolve(__dirname, 'dev.db').replace(/\\/g, '/');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`,
    },
  },
});

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data in dependency order
  await prisma.ticket.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.attendanceLog.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.offboardRequest.deleteMany();
  await prisma.applicationStatusHistory.deleteMany();
  await prisma.application.deleteMany();
  await prisma.applicant.deleteMany();
  await prisma.jobPosting.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.projectChunk.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.employee.deleteMany();

  // ═══════════════════════════════════════════════════════
  // 1. CREATE DEPARTMENT MANAGERS (1 per department)
  // ═══════════════════════════════════════════════════════

  // Operations Manager
  const mgrOperations = await prisma.employee.create({
    data: {
      employeeId: 'EMP001',
      firstName: 'Sarah',
      lastName: 'Chen',
      email: 'sarah.chen@company.com',
      phoneNumber: '+1-555-0101',
      department: Department.OPERATIONS,
      position: 'Operations Manager',
      role: Role.MANAGER,
      hireDate: new Date('2022-01-15'),
      status: EmployeeStatus.ACTIVE,
      address: '123 Corporate Blvd, Suite 100',
    },
  });

  // Marketing Manager
  const mgrMarketing = await prisma.employee.create({
    data: {
      employeeId: 'EMP009',
      firstName: 'Alice',
      lastName: 'Manager',
      email: 'alice.manager@company.com',
      phoneNumber: '+1-555-0109',
      department: Department.MARKETING,
      position: 'Marketing Manager',
      role: Role.MANAGER,
      hireDate: new Date('2021-03-15'),
      status: EmployeeStatus.ACTIVE,
      address: '321 Market St, Suite 200',
    },
  });

  // Engineering Manager
  const mgrEngineering = await prisma.employee.create({
    data: {
      employeeId: 'EMP011',
      firstName: 'Elena',
      lastName: 'Rostova',
      email: 'elena.r@company.com',
      phoneNumber: '+1-555-0111',
      department: Department.ENGINEERING,
      position: 'Engineering Manager',
      role: Role.MANAGER,
      hireDate: new Date('2021-05-10'),
      status: EmployeeStatus.ACTIVE,
      address: '456 Tech Park Dr, Suite 300',
    },
  });

  // HR Manager
  const mgrHR = await prisma.employee.create({
    data: {
      employeeId: 'EMP012',
      firstName: 'Marcus',
      lastName: 'Vance',
      email: 'marcus.v@company.com',
      phoneNumber: '+1-555-0112',
      department: Department.HR,
      position: 'HR Manager',
      role: Role.MANAGER,
      hireDate: new Date('2020-09-01'),
      status: EmployeeStatus.ACTIVE,
      address: '789 Business Center, Suite 400',
    },
  });

  // Finance Manager
  const mgrFinance = await prisma.employee.create({
    data: {
      employeeId: 'EMP013',
      firstName: 'Sarah',
      lastName: 'Jenkins',
      email: 'sarah.j@company.com',
      phoneNumber: '+1-555-0113',
      department: Department.FINANCE,
      position: 'Finance Manager',
      role: Role.MANAGER,
      hireDate: new Date('2021-11-20'),
      status: EmployeeStatus.ACTIVE,
      address: '100 Finance Ave, Suite 500',
    },
  });

  // Sales Manager
  const mgrSales = await prisma.employee.create({
    data: {
      employeeId: 'EMP014',
      firstName: 'David',
      lastName: 'Miller',
      email: 'david.m@company.com',
      phoneNumber: '+1-555-0114',
      department: Department.SALES,
      position: 'Sales Manager',
      role: Role.MANAGER,
      hireDate: new Date('2022-02-14'),
      status: EmployeeStatus.ACTIVE,
      address: '555 Commerce Way, Suite 600',
    },
  });

  // ═══════════════════════════════════════════════════════
  // 2. CREATE TEAM EMPLOYEES (Reporting to Department Managers)
  // ═══════════════════════════════════════════════════════

  const empJames = await prisma.employee.create({
    data: {
      employeeId: 'EMP002',
      firstName: 'James',
      lastName: 'Rodriguez',
      email: 'james.r@company.com',
      phoneNumber: '+1-555-0102',
      department: Department.ENGINEERING,
      position: 'Senior Developer',
      role: Role.EMPLOYEE,
      hireDate: new Date('2022-03-20'),
      status: EmployeeStatus.ACTIVE,
      address: '456 Tech Park Dr',
      reportingManagerId: mgrEngineering.id,
    },
  });

  const empAisha = await prisma.employee.create({
    data: {
      employeeId: 'EMP003',
      firstName: 'Aisha',
      lastName: 'Patel',
      email: 'aisha.p@company.com',
      phoneNumber: '+1-555-0103',
      department: Department.HR,
      position: 'HR Coordinator',
      role: Role.EMPLOYEE,
      hireDate: new Date('2022-06-01'),
      status: EmployeeStatus.ACTIVE,
      address: '789 Business Center',
      reportingManagerId: mgrHR.id,
    },
  });

  const empMarcus = await prisma.employee.create({
    data: {
      employeeId: 'EMP004',
      firstName: 'Marcus',
      lastName: 'Williams',
      email: 'marcus.w@company.com',
      phoneNumber: '+1-555-0104',
      department: Department.FINANCE,
      position: 'Financial Analyst',
      role: Role.EMPLOYEE,
      hireDate: new Date('2023-01-10'),
      status: EmployeeStatus.ACTIVE,
      reportingManagerId: mgrFinance.id,
    },
  });

  const empEmily = await prisma.employee.create({
    data: {
      employeeId: 'EMP005',
      firstName: 'Emily',
      lastName: 'Nakamura',
      email: 'emily.n@company.com',
      phoneNumber: '+1-555-0105',
      department: Department.MARKETING,
      position: 'Marketing Specialist',
      role: Role.EMPLOYEE,
      hireDate: new Date('2023-04-15'),
      status: EmployeeStatus.ACTIVE,
      address: '321 Market St',
      reportingManagerId: mgrMarketing.id,
    },
  });

  const empDavid = await prisma.employee.create({
    data: {
      employeeId: 'EMP006',
      firstName: 'David',
      lastName: 'Kim',
      email: 'david.k@company.com',
      phoneNumber: '+1-555-0106',
      department: Department.SALES,
      position: 'Sales Representative',
      role: Role.EMPLOYEE,
      hireDate: new Date('2023-07-01'),
      status: EmployeeStatus.ACTIVE,
      reportingManagerId: mgrSales.id,
    },
  });

  const empOlivia = await prisma.employee.create({
    data: {
      employeeId: 'EMP007',
      firstName: 'Olivia',
      lastName: 'Santos',
      email: 'olivia.s@company.com',
      phoneNumber: '+1-555-0107',
      department: Department.ENGINEERING,
      position: 'QA Engineer',
      role: Role.EMPLOYEE,
      hireDate: new Date('2023-09-12'),
      status: EmployeeStatus.ON_LEAVE,
      reportingManagerId: mgrEngineering.id,
    },
  });

  const empRobert = await prisma.employee.create({
    data: {
      employeeId: 'EMP008',
      firstName: 'Robert',
      lastName: 'Taylor',
      email: 'robert.t@company.com',
      phoneNumber: '+1-555-0108',
      department: Department.OPERATIONS,
      position: 'Logistics Coordinator',
      role: Role.EMPLOYEE,
      hireDate: new Date('2021-11-05'),
      status: EmployeeStatus.INACTIVE,
      reportingManagerId: mgrOperations.id,
    },
  });

  // Project Manager employee
  const empPM = await prisma.employee.create({
    data: {
      employeeId: 'EMP010',
      firstName: 'Bob',
      lastName: 'Projects',
      email: 'bob.pm@company.com',
      phoneNumber: '+1-555-0110',
      department: Department.ENGINEERING,
      position: 'Senior Project Manager',
      role: Role.EMPLOYEE,
      hireDate: new Date('2022-01-10'),
      status: EmployeeStatus.ACTIVE,
      reportingManagerId: mgrEngineering.id,
    },
  });

  // IT Support Specialist employee
  const empIT = await prisma.employee.create({
    data: {
      employeeId: 'EMP015',
      firstName: 'Ian',
      lastName: 'Tech',
      email: 'ian.it@company.com',
      phoneNumber: '+1-555-0115',
      department: Department.OPERATIONS,
      position: 'Senior IT Systems Engineer',
      role: Role.EMPLOYEE,
      hireDate: new Date('2023-05-10'),
      status: EmployeeStatus.ACTIVE,
      reportingManagerId: mgrOperations.id,
    },
  });

  console.log(`✅ Created 15 employees (6 Department Managers, 9 Team Members)`);

  // ═══════════════════════════════════════════════════════
  // 3. CREATE USERS
  // ═══════════════════════════════════════════════════════

  const userSarah = await prisma.user.create({
    data: { email: 'sarah.chen@company.com', name: 'Sarah Chen', employeeId: mgrOperations.id },
  });
  const userAlice = await prisma.user.create({
    data: { email: 'alice.manager@company.com', name: 'Alice Manager', employeeId: mgrMarketing.id },
  });
  const userElena = await prisma.user.create({
    data: { email: 'elena.r@company.com', name: 'Elena Rostova', employeeId: mgrEngineering.id },
  });
  const userMarcusVance = await prisma.user.create({
    data: { email: 'marcus.v@company.com', name: 'Marcus Vance', employeeId: mgrHR.id },
  });
  const userSarahJenkins = await prisma.user.create({
    data: { email: 'sarah.j@company.com', name: 'Sarah Jenkins', employeeId: mgrFinance.id },
  });
  const userDavidMiller = await prisma.user.create({
    data: { email: 'david.m@company.com', name: 'David Miller', employeeId: mgrSales.id },
  });

  const userJames = await prisma.user.create({
    data: { email: 'james.r@company.com', name: 'James Rodriguez', employeeId: empJames.id },
  });
  const userAisha = await prisma.user.create({
    data: { email: 'aisha.p@company.com', name: 'Aisha Patel', employeeId: empAisha.id },
  });
  const userMarcus = await prisma.user.create({
    data: { email: 'marcus.w@company.com', name: 'Marcus Williams', employeeId: empMarcus.id },
  });
  const userEmily = await prisma.user.create({
    data: { email: 'emily.n@company.com', name: 'Emily Nakamura', employeeId: empEmily.id },
  });
  const userDavid = await prisma.user.create({
    data: { email: 'david.k@company.com', name: 'David Kim', employeeId: empDavid.id },
  });
  const userOlivia = await prisma.user.create({
    data: { email: 'olivia.s@company.com', name: 'Olivia Santos', employeeId: empOlivia.id },
  });
  const userRobert = await prisma.user.create({
    data: { email: 'robert.t@company.com', name: 'Robert Taylor', employeeId: empRobert.id },
  });
  const userBob = await prisma.user.create({
    data: { email: 'bob.pm@company.com', name: 'Bob Projects', employeeId: empPM.id },
  });
  const userIT = await prisma.user.create({
    data: { email: 'ian.it@company.com', name: 'Ian Tech', employeeId: empIT.id },
  });

  console.log(`✅ Created 15 users`);

  // ═══════════════════════════════════════════════════════
  // 4. ASSIGN USER ROLES
  // ═══════════════════════════════════════════════════════

  const roleAssignments: { userId: string; role: SystemRole }[] = [
    // Operations Manager + Admin
    { userId: userSarah.id, role: SystemRole.EMPLOYEE },
    { userId: userSarah.id, role: SystemRole.ADMIN },
    { userId: userSarah.id, role: SystemRole.MANAGER },

    // Marketing Manager
    { userId: userAlice.id, role: SystemRole.EMPLOYEE },
    { userId: userAlice.id, role: SystemRole.MANAGER },

    // Engineering Manager
    { userId: userElena.id, role: SystemRole.EMPLOYEE },
    { userId: userElena.id, role: SystemRole.MANAGER },

    // HR Manager
    { userId: userMarcusVance.id, role: SystemRole.EMPLOYEE },
    { userId: userMarcusVance.id, role: SystemRole.MANAGER },
    { userId: userMarcusVance.id, role: SystemRole.HR },

    // Finance Manager
    { userId: userSarahJenkins.id, role: SystemRole.EMPLOYEE },
    { userId: userSarahJenkins.id, role: SystemRole.MANAGER },

    // Sales Manager
    { userId: userDavidMiller.id, role: SystemRole.EMPLOYEE },
    { userId: userDavidMiller.id, role: SystemRole.MANAGER },

    // Team Employees
    { userId: userJames.id, role: SystemRole.EMPLOYEE },
    { userId: userAisha.id, role: SystemRole.EMPLOYEE },
    { userId: userAisha.id, role: SystemRole.HR },
    { userId: userMarcus.id, role: SystemRole.EMPLOYEE },
    { userId: userEmily.id, role: SystemRole.EMPLOYEE },
    { userId: userDavid.id, role: SystemRole.EMPLOYEE },
    { userId: userDavid.id, role: SystemRole.SALES },
    { userId: userOlivia.id, role: SystemRole.EMPLOYEE },
    { userId: userOlivia.id, role: SystemRole.SUPPORT },
    { userId: userRobert.id, role: SystemRole.EMPLOYEE },
    { userId: userBob.id, role: SystemRole.EMPLOYEE },
    { userId: userBob.id, role: SystemRole.PROJECT_MANAGER },
    { userId: userIT.id, role: SystemRole.EMPLOYEE },
    { userId: userIT.id, role: SystemRole.IT },
  ];

  await prisma.userRole.createMany({ data: roleAssignments.map(ra => ({ userId: ra.userId, role: ra.role })) });
  console.log(`✅ Assigned ${roleAssignments.length} role entries`);

  // ═══════════════════════════════════════════════════════
  // 5. SEED PERMISSIONS + ROLE_PERMISSIONS
  // ═══════════════════════════════════════════════════════

  const permDefs = [
    { module: 'employee_records', action: 'view_own' },
    { module: 'employee_records', action: 'view_team' },
    { module: 'employee_records', action: 'view_all' },
    { module: 'employee_records', action: 'create' },
    { module: 'employee_records', action: 'edit' },
    { module: 'employee_records', action: 'delete' },

    { module: 'leave', action: 'request' },
    { module: 'leave', action: 'approve' },
    { module: 'leave', action: 'view_all' },
    { module: 'leave', action: 'view_team' },
    { module: 'leave', action: 'correct_balance' },

    { module: 'task', action: 'create' },
    { module: 'task', action: 'edit' },
    { module: 'task', action: 'delete' },
    { module: 'task', action: 'view_all' },
    { module: 'task', action: 'view_team' },
    { module: 'task', action: 'view_own' },

    { module: 'offboarding', action: 'request' },
    { module: 'offboarding', action: 'execute' },
    { module: 'offboarding', action: 'view' },

    { module: 'audit', action: 'view' },

    { module: 'attendance', action: 'clock' },
    { module: 'attendance', action: 'view_own' },
    { module: 'attendance', action: 'view_team' },
    { module: 'attendance', action: 'view_all' },

    { module: 'ticket', action: 'raise' },
    { module: 'ticket', action: 'view_own' },
    { module: 'ticket', action: 'view_all' },
    { module: 'ticket', action: 'resolve' },

    { module: 'project', action: 'create' },
    { module: 'project', action: 'chunk_create' },
    { module: 'project', action: 'view_all' },
    { module: 'project', action: 'edit' },
  ];

  const permissions: Record<string, string> = {};
  for (const pd of permDefs) {
    const p = await prisma.permission.create({ data: pd });
    permissions[`${pd.module}.${pd.action}`] = p.id;
  }
  console.log(`✅ Created ${permDefs.length} permissions`);

  const matrix: Record<string, string[]> = {
    ADMIN: [
      'employee_records.view_own', 'employee_records.view_team', 'employee_records.view_all',
      'employee_records.edit', 'employee_records.delete',
      'leave.request', 'leave.approve', 'leave.view_all', 'leave.view_team', 'leave.correct_balance',
      'offboarding.request', 'offboarding.execute', 'offboarding.view',
      'audit.view',
      'attendance.clock', 'attendance.view_own', 'attendance.view_team', 'attendance.view_all',
      'ticket.raise', 'ticket.view_own', 'ticket.view_all', 'ticket.resolve',
      'project.create', 'project.view_all', 'project.edit',
    ],
    PROJECT_MANAGER: [
      'employee_records.view_own', 'employee_records.view_all',
      'project.create', 'project.view_all', 'project.edit', 'project.chunk_create',
      'task.view_all', 'task.view_own',
      'leave.request',
      'attendance.clock', 'attendance.view_own',
      'ticket.raise', 'ticket.view_own',
    ],
    MANAGER: [
      'employee_records.view_own', 'employee_records.view_team',
      'leave.request', 'leave.approve', 'leave.view_team',
      'task.create', 'task.edit', 'task.delete', 'task.view_team', 'task.view_own',
      'offboarding.request', 'offboarding.view',
      'attendance.clock', 'attendance.view_own', 'attendance.view_team',
      'ticket.raise', 'ticket.view_own', 'ticket.view_all', 'ticket.resolve',
      'project.view_all',
    ],
    HR: [
      'employee_records.view_own', 'employee_records.view_team', 'employee_records.view_all',
      'employee_records.create', 'employee_records.edit',
      'leave.request', 'leave.approve', 'leave.view_all', 'leave.correct_balance',
      'task.view_all', 'task.view_own',
      'offboarding.execute', 'offboarding.view',
      'attendance.clock', 'attendance.view_own', 'attendance.view_all',
      'ticket.raise', 'ticket.view_own',
      'project.view_all',
    ],
    SALES: [
      'employee_records.view_own',
      'leave.request',
      'task.view_own',
      'attendance.clock', 'attendance.view_own',
      'ticket.raise', 'ticket.view_own',
      'project.view_all',
    ],
    SUPPORT: [
      'employee_records.view_own',
      'leave.request',
      'task.view_own',
      'attendance.clock', 'attendance.view_own',
      'ticket.raise', 'ticket.view_own', 'ticket.view_all', 'ticket.resolve',
      'project.view_all',
    ],
    IT: [
      'employee_records.view_own',
      'leave.request',
      'task.view_own',
      'attendance.clock', 'attendance.view_own',
      'ticket.raise', 'ticket.view_own', 'ticket.view_all', 'ticket.resolve',
      'project.view_all',
    ],
    EMPLOYEE: [
      'employee_records.view_own',
      'leave.request',
      'task.view_own',
      'attendance.clock', 'attendance.view_own',
      'ticket.raise', 'ticket.view_own',
      'project.view_all',
    ],
    VENDOR: [
      'employee_records.view_own',
      'attendance.clock', 'attendance.view_own',
      'ticket.raise', 'ticket.view_own',
    ],
  };

  const rpData: { role: SystemRole; permissionId: string }[] = [];
  for (const [role, permKeys] of Object.entries(matrix)) {
    for (const key of permKeys) {
      rpData.push({ role: role as SystemRole, permissionId: permissions[key] });
    }
  }
  await prisma.rolePermission.createMany({ data: rpData });
  console.log(`✅ Created ${rpData.length} role-permission mappings`);

  // ═══════════════════════════════════════════════════════
  // 6. CREATE LEAVE REQUESTS
  // ═══════════════════════════════════════════════════════

  const leaveRequests = await Promise.all([
    prisma.leaveRequest.create({
      data: {
        employeeId: empJames.id,
        type: LeaveType.VACATION,
        startDate: new Date('2026-07-20'),
        endDate: new Date('2026-07-25'),
        reason: 'Family vacation — visiting parents in Mexico City',
        status: LeaveStatus.PENDING,
        approverId: mgrHR.id,
      },
    }),
    prisma.leaveRequest.create({
      data: {
        employeeId: empAisha.id,
        type: LeaveType.SICK,
        startDate: new Date('2026-07-11'),
        endDate: new Date('2026-07-11'),
        reason: 'Doctor appointment in the morning',
        status: LeaveStatus.PENDING,
        approverId: mgrHR.id,
      },
    }),
    prisma.leaveRequest.create({
      data: {
        employeeId: empEmily.id,
        type: LeaveType.PERSONAL,
        startDate: new Date('2026-07-15'),
        endDate: new Date('2026-07-16'),
        reason: 'Moving to a new apartment',
        status: LeaveStatus.APPROVED,
        reviewedById: mgrHR.id,
        reviewedAt: new Date('2026-07-08'),
        approverId: mgrHR.id,
      },
    }),
    prisma.leaveRequest.create({
      data: {
        employeeId: empDavid.id,
        type: LeaveType.VACATION,
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-05'),
        reason: 'Summer break trip',
        status: LeaveStatus.DENIED,
        reviewedById: mgrHR.id,
        reviewedAt: new Date('2026-07-05'),
        approverId: mgrHR.id,
      },
    }),
  ]);
  console.log(`✅ Created ${leaveRequests.length} leave requests`);

  // ═══════════════════════════════════════════════════════
  // 7. CREATE TASK ASSIGNMENTS (Managers assign to team employees)
  // ═══════════════════════════════════════════════════════

  const tasks = await Promise.all([
    prisma.taskAssignment.create({
      data: {
        title: 'Complete Q3 Budget Report',
        description: 'Prepare the quarterly budget analysis including department-wise spending breakdown and projections for Q4.',
        assignedToId: empMarcus.id, // Marcus (Finance Employee)
        assignedById: mgrFinance.id, // Sarah Jenkins (Finance Manager)
        priority: TaskPriority.HIGH,
        status: TaskStatus.IN_PROGRESS,
        deadline: new Date('2026-07-18'),
      },
    }),
    prisma.taskAssignment.create({
      data: {
        title: 'Fix Authentication Bug #2847',
        description: 'Users are intermittently being logged out after 10 minutes. Investigate session handling in the auth middleware.',
        assignedToId: empJames.id, // James (Engineering Employee)
        assignedById: mgrEngineering.id, // Elena Rostova (Engineering Manager)
        priority: TaskPriority.URGENT,
        status: TaskStatus.TODO,
        deadline: new Date('2026-07-12'),
      },
    }),
    prisma.taskAssignment.create({
      data: {
        title: 'Update Employee Handbook',
        description: 'Review and update the 2026 employee handbook with the latest policy changes regarding remote work and benefits.',
        assignedToId: empAisha.id, // Aisha (HR Employee)
        assignedById: mgrHR.id, // Marcus Vance (HR Manager)
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.TODO,
        deadline: new Date('2026-07-30'),
      },
    }),
    prisma.taskAssignment.create({
      data: {
        title: 'Launch Social Media Campaign',
        description: 'Design and schedule the product launch campaign across Instagram, LinkedIn, and Twitter.',
        assignedToId: empEmily.id, // Emily (Marketing Employee)
        assignedById: mgrMarketing.id, // Alice Manager (Marketing Manager)
        priority: TaskPriority.HIGH,
        status: TaskStatus.IN_PROGRESS,
        deadline: new Date('2026-07-22'),
      },
    }),
    prisma.taskAssignment.create({
      data: {
        title: 'Client Follow-up Calls',
        description: 'Contact the 15 leads from last week\'s trade show and schedule demos.',
        assignedToId: empDavid.id, // David Kim (Sales Employee)
        assignedById: mgrSales.id, // David Miller (Sales Manager)
        priority: TaskPriority.LOW,
        status: TaskStatus.COMPLETED,
        deadline: new Date('2026-07-10'),
      },
    }),
    prisma.taskAssignment.create({
      data: {
        title: 'Write API Integration Tests',
        description: 'Add comprehensive test coverage for the new payment gateway integration endpoints.',
        assignedToId: empOlivia.id, // Olivia (Engineering QA Employee)
        assignedById: mgrEngineering.id, // Elena Rostova (Engineering Manager)
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.OVERDUE,
        deadline: new Date('2026-07-05'),
      },
    }),
  ]);

  console.log(`✅ Created ${tasks.length} task assignments`);

  // ═══════════════════════════════════════════════════════
  // 8. SEED LEAVE BALANCES (2026)
  // ═══════════════════════════════════════════════════════

  const allEmps = [mgrOperations, mgrMarketing, mgrEngineering, mgrHR, mgrFinance, mgrSales, empJames, empAisha, empMarcus, empEmily, empDavid, empOlivia, empRobert, empPM, empIT];
  const balanceDefaults: { type: LeaveType; balance: number }[] = [
    { type: LeaveType.VACATION, balance: 18 },
    { type: LeaveType.SICK, balance: 10 },
    { type: LeaveType.PERSONAL, balance: 5 },
    { type: LeaveType.MATERNITY, balance: 90 },
    { type: LeaveType.UNPAID, balance: 30 },
  ];

  const balanceData = allEmps.flatMap(emp =>
    balanceDefaults.map(bd => ({
      employeeId: emp.id,
      leaveType: bd.type,
      balance: bd.balance,
      year: 2026,
    }))
  );
  await prisma.leaveBalance.createMany({ data: balanceData });
  console.log(`✅ Created ${balanceData.length} leave balance entries`);

  // ═══════════════════════════════════════════════════════
  // 9. SEED SAMPLE AUDIT LOGS
  // ═══════════════════════════════════════════════════════

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: userSarah.id,
        action: AuditAction.CREATE,
        targetEntity: 'Employee',
        targetId: empJames.id,
        afterSnapshot: JSON.stringify({ employeeId: 'EMP002', name: 'James Rodriguez' }),
        timestamp: new Date('2026-07-01T09:00:00Z'),
      },
      {
        actorId: userAisha.id,
        action: AuditAction.UPDATE,
        targetEntity: 'Employee',
        targetId: empMarcus.id,
        beforeSnapshot: JSON.stringify({ address: null }),
        afterSnapshot: JSON.stringify({ address: '100 Finance Ave' }),
        timestamp: new Date('2026-07-02T14:30:00Z'),
      },
    ],
  });
  console.log(`✅ Created sample audit logs`);

  // ═══════════════════════════════════════════════════════
  // 10. SEED SAMPLE PROJECTS & TICKETS
  // ═══════════════════════════════════════════════════════

  const proj1 = await prisma.project.create({
    data: {
      name: 'NextGen ERP Migration',
      description: 'Upgrade core ERP modules to microservices architecture.',
      department: Department.ENGINEERING,
      status: ProjectStatus.ACTIVE,
      startDate: new Date('2026-06-01'),
      projectManagerId: empPM.id,
      createdById: userBob.id,
    },
  });

  const proj2 = await prisma.project.create({
    data: {
      name: 'Q3 Brand Campaign',
      description: 'Omnichannel brand campaign across social & search.',
      department: Department.MARKETING,
      status: ProjectStatus.PLANNING,
      startDate: new Date('2026-07-15'),
      projectManagerId: empPM.id,
      createdById: userBob.id,
    },
  });

  const chunk1 = await prisma.projectChunk.create({
    data: {
      title: 'Backend API Microservices',
      description: 'Refactor monolithic backend into Node/Express services.',
      projectId: proj1.id,
      assignedDepartment: Department.ENGINEERING,
      assignedManagerId: mgrEngineering.id,
      status: ProjectStatus.ACTIVE,
    },
  });

  const chunk2 = await prisma.projectChunk.create({
    data: {
      title: 'UI Design System & Component Library',
      description: 'Design and build shared component library for web apps.',
      projectId: proj1.id,
      assignedDepartment: Department.MARKETING,
      assignedManagerId: mgrMarketing.id,
      status: ProjectStatus.PLANNING,
    },
  });

  // Link tasks directly under project chunks!
  await prisma.taskAssignment.create({
    data: {
      title: 'Implement Redis Cache Layer',
      description: 'Integrate Redis caching for user sessions and frequent query optimization.',
      assignedToId: empJames.id,
      assignedById: mgrEngineering.id,
      priority: TaskPriority.HIGH,
      status: TaskStatus.IN_PROGRESS,
      deadline: new Date('2026-07-25'),
      projectId: proj1.id,
      projectChunkId: chunk1.id,
    },
  });

  await prisma.taskAssignment.create({
    data: {
      title: 'Design Dark Mode Color Tokens',
      description: 'Define semantic color variables for dark mode and accessibility.',
      assignedToId: empEmily.id,
      assignedById: mgrMarketing.id,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.TODO,
      deadline: new Date('2026-08-05'),
      projectId: proj1.id,
      projectChunkId: chunk2.id,
    },
  });

  console.log('✅ Created 2 sample projects, 2 project chunks, and 2 chunk-linked tasks');

  await prisma.ticket.createMany({
    data: [
      {
        title: 'VPN Connection Fails Intermittently',
        description: 'Unable to connect to internal staging environment via corporate VPN.',
        category: TicketCategory.INTERNAL_IT,
        priority: TicketPriority.HIGH,
        status: TicketStatus.OPEN,
        raisedById: userJames.id,
        assignedToId: userIT.id,
      },
      {
        title: 'Workstation Dual-Monitor & IAM Security Setup',
        description: 'Need dual-monitor setup and AWS cloud IAM security credentials provisioned.',
        category: TicketCategory.INTERNAL_IT,
        priority: TicketPriority.MEDIUM,
        status: TicketStatus.IN_PROGRESS,
        raisedById: userElena.id,
        assignedToId: userIT.id,
      },
      {
        title: 'Manager Approval for Equipment Request',
        description: 'Need approval for equipment requisition budget allocation.',
        category: TicketCategory.MANAGER_ASSIST,
        priority: TicketPriority.MEDIUM,
        status: TicketStatus.IN_PROGRESS,
        raisedById: userEmily.id,
        assignedToId: userSarah.id,
      },
      {
        title: 'Client Billing Dispute - Invoice #992',
        description: 'Customer requesting correction on billing statement for June subscription.',
        category: TicketCategory.CUSTOMER_SUPPORT,
        priority: TicketPriority.URGENT,
        status: TicketStatus.OPEN,
        raisedById: userOlivia.id,
        assignedToId: userOlivia.id,
      },
    ],
  });

  console.log('✅ Created 4 sample help desk tickets (including IT Support tickets assigned to Ian Tech)');

  console.log('\n🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

