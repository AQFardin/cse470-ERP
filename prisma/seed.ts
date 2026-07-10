import { PrismaClient, Department, Role, EmployeeStatus, LeaveType, LeaveStatus, TaskPriority, TaskStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.taskAssignment.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.employee.deleteMany();

  // ─── Create Employees ─────────────────────────────────

  const manager = await prisma.employee.create({
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

  const employees = await Promise.all([
    prisma.employee.create({
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
      },
    }),
    prisma.employee.create({
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
      },
    }),
    prisma.employee.create({
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
      },
    }),
    prisma.employee.create({
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
      },
    }),
    prisma.employee.create({
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
      },
    }),
    prisma.employee.create({
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
      },
    }),
    prisma.employee.create({
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
      },
    }),
  ]);

  console.log(`✅ Created ${employees.length + 1} employees`);

  // ─── Create Leave Requests ────────────────────────────

  const leaveRequests = await Promise.all([
    prisma.leaveRequest.create({
      data: {
        employeeId: employees[0].id, // James
        type: LeaveType.VACATION,
        startDate: new Date('2026-07-20'),
        endDate: new Date('2026-07-25'),
        reason: 'Family vacation — visiting parents in Mexico City',
        status: LeaveStatus.PENDING,
      },
    }),
    prisma.leaveRequest.create({
      data: {
        employeeId: employees[1].id, // Aisha
        type: LeaveType.SICK,
        startDate: new Date('2026-07-11'),
        endDate: new Date('2026-07-11'),
        reason: 'Doctor appointment in the morning',
        status: LeaveStatus.PENDING,
      },
    }),
    prisma.leaveRequest.create({
      data: {
        employeeId: employees[3].id, // Emily
        type: LeaveType.PERSONAL,
        startDate: new Date('2026-07-15'),
        endDate: new Date('2026-07-16'),
        reason: 'Moving to a new apartment',
        status: LeaveStatus.APPROVED,
        reviewedById: manager.id,
        reviewedAt: new Date('2026-07-08'),
      },
    }),
    prisma.leaveRequest.create({
      data: {
        employeeId: employees[4].id, // David
        type: LeaveType.VACATION,
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-05'),
        reason: 'Summer break trip',
        status: LeaveStatus.DENIED,
        reviewedById: manager.id,
        reviewedAt: new Date('2026-07-05'),
      },
    }),
  ]);

  console.log(`✅ Created ${leaveRequests.length} leave requests`);

  // ─── Create Task Assignments ──────────────────────────

  const tasks = await Promise.all([
    prisma.taskAssignment.create({
      data: {
        title: 'Complete Q3 Budget Report',
        description: 'Prepare the quarterly budget analysis including department-wise spending breakdown and projections for Q4.',
        assignedToId: employees[2].id, // Marcus (Finance)
        assignedById: manager.id,
        priority: TaskPriority.HIGH,
        status: TaskStatus.IN_PROGRESS,
        deadline: new Date('2026-07-18'),
      },
    }),
    prisma.taskAssignment.create({
      data: {
        title: 'Fix Authentication Bug #2847',
        description: 'Users are intermittently being logged out after 10 minutes. Investigate session handling in the auth middleware.',
        assignedToId: employees[0].id, // James (Engineering)
        assignedById: manager.id,
        priority: TaskPriority.URGENT,
        status: TaskStatus.TODO,
        deadline: new Date('2026-07-12'),
      },
    }),
    prisma.taskAssignment.create({
      data: {
        title: 'Update Employee Handbook',
        description: 'Review and update the 2026 employee handbook with the latest policy changes regarding remote work and benefits.',
        assignedToId: employees[1].id, // Aisha (HR)
        assignedById: manager.id,
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.TODO,
        deadline: new Date('2026-07-30'),
      },
    }),
    prisma.taskAssignment.create({
      data: {
        title: 'Launch Social Media Campaign',
        description: 'Design and schedule the product launch campaign across Instagram, LinkedIn, and Twitter.',
        assignedToId: employees[3].id, // Emily (Marketing)
        assignedById: manager.id,
        priority: TaskPriority.HIGH,
        status: TaskStatus.IN_PROGRESS,
        deadline: new Date('2026-07-22'),
      },
    }),
    prisma.taskAssignment.create({
      data: {
        title: 'Client Follow-up Calls',
        description: 'Contact the 15 leads from last week\'s trade show and schedule demos.',
        assignedToId: employees[4].id, // David (Sales)
        assignedById: manager.id,
        priority: TaskPriority.LOW,
        status: TaskStatus.COMPLETED,
        deadline: new Date('2026-07-10'),
      },
    }),
    prisma.taskAssignment.create({
      data: {
        title: 'Write API Integration Tests',
        description: 'Add comprehensive test coverage for the new payment gateway integration endpoints.',
        assignedToId: employees[5].id, // Olivia (Engineering)
        assignedById: manager.id,
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.OVERDUE,
        deadline: new Date('2026-07-05'),
      },
    }),
  ]);

  console.log(`✅ Created ${tasks.length} task assignments`);
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
