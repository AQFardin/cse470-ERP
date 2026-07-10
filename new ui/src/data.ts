import { Employee, Department, LeaveRequest, Task } from './types';

export const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'finance',
    name: 'Finance',
    color: 'emerald', // green
    manager: 'Sarah Jenkins',
    budget: '$1,450,000',
    description: 'Responsible for accounting, budget allocation, audits, and financial reporting.'
  },
  {
    id: 'hr',
    name: 'HR',
    color: 'rose', // red
    manager: 'Marcus Vance',
    budget: '$620,000',
    description: 'Manages recruitment, employee relations, benefits, and workplace culture.'
  },
  {
    id: 'marketing',
    name: 'Marketing',
    color: 'purple', // purple
    manager: 'Chloe Bennett',
    budget: '$980,000',
    description: 'Handles brand strategy, campaigns, social media, and market research.'
  },
  {
    id: 'sales',
    name: 'Sales',
    color: 'blue', // blue
    manager: 'David Miller',
    budget: '$1,850,000',
    description: 'Drives revenue through customer acquisition, account management, and partnerships.'
  },
  {
    id: 'engineering',
    name: 'Engineering',
    color: 'teal', // teal
    manager: 'Elena Rostova',
    budget: '$3,200,000',
    description: 'Builds, maintains, and scales product software, architecture, and developer tooling.'
  }
];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'EMP001',
    name: 'Fardin Ahmed',
    departmentId: 'finance',
    email: 'fardin@gmail.com',
    role: 'Financial Analyst',
    status: 'active',
    salary: 95000,
    joiningDate: '2023-04-12',
    phone: '+1 (555) 019-2834',
    address: '128 Birch Rd, San Francisco, CA'
  },
  {
    id: 'EMP002',
    name: 'Zain Malik',
    departmentId: 'hr',
    email: 'zain@gmail.com',
    role: 'HR Specialist',
    status: 'active',
    salary: 78000,
    joiningDate: '2022-09-01',
    phone: '+1 (555) 012-3456',
    address: '456 Oak St, Oakland, CA'
  },
  {
    id: 'EMP003',
    name: 'Paityn Vance',
    departmentId: 'marketing',
    email: 'paityn@gmail.com',
    role: 'Marketing Lead',
    status: 'on-leave',
    salary: 110000,
    joiningDate: '2021-03-18',
    phone: '+1 (555) 014-9876',
    address: '789 Pine Ave, Berkeley, CA'
  },
  {
    id: 'EMP004',
    name: 'Ruben Diaz',
    departmentId: 'sales',
    email: 'ruben@gmail.com',
    role: 'Account Executive',
    status: 'active',
    salary: 85000,
    joiningDate: '2023-08-24',
    phone: '+1 (555) 016-5432',
    address: '321 Elm Rd, San Jose, CA'
  },
  {
    id: 'EMP005',
    name: 'Dulce Maria',
    departmentId: 'sales',
    email: 'dulce@gmail.com',
    role: 'Sales Manager',
    status: 'active',
    salary: 125000,
    joiningDate: '2020-11-05',
    phone: '+1 (555) 018-8765',
    address: '222 Maple Dr, Walnut Creek, CA'
  },
  {
    id: 'EMP006',
    name: 'Ruben Garcia',
    departmentId: 'engineering',
    email: 'ruben.g@gmail.com',
    role: 'Frontend Engineer',
    status: 'active',
    salary: 105000,
    joiningDate: '2023-01-10',
    phone: '+1 (555) 011-2233',
    address: '555 Cedar Ln, San Francisco, CA'
  },
  {
    id: 'EMP007',
    name: 'Kaiya Sterling',
    departmentId: 'engineering',
    email: 'kaiya@gmail.com',
    role: 'QA Engineer',
    status: 'inactive',
    salary: 88000,
    joiningDate: '2024-02-01',
    phone: '+1 (555) 017-4455',
    address: '777 Cypress Rd, Richmond, CA'
  }
];

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'LRV001',
    employeeId: 'EMP003',
    employeeName: 'Paityn Vance',
    departmentId: 'marketing',
    startDate: '2026-07-15',
    endDate: '2026-07-22',
    reason: 'Annual family vacation',
    status: 'pending',
    requestDate: '2026-07-08'
  },
  {
    id: 'LRV002',
    employeeId: 'EMP001',
    employeeName: 'Fardin Ahmed',
    departmentId: 'finance',
    startDate: '2026-08-01',
    endDate: '2026-08-05',
    reason: 'Dental surgery and recovery',
    status: 'approved',
    requestDate: '2026-07-05'
  },
  {
    id: 'LRV003',
    employeeId: 'EMP004',
    employeeName: 'Ruben Diaz',
    departmentId: 'sales',
    startDate: '2026-07-20',
    endDate: '2026-07-21',
    reason: 'Moving to new apartment',
    status: 'pending',
    requestDate: '2026-07-09'
  }
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 'TSK001',
    title: 'Review Q2 Financial Audits',
    description: 'Go through the Q2 audit worksheets and prepare a bullet-point summary for the executive team.',
    employeeId: 'EMP001',
    employeeName: 'Fardin Ahmed',
    priority: 'high',
    status: 'in-progress',
    deadline: '2026-07-15'
  },
  {
    id: 'TSK002',
    title: 'Onboard 3 New Candidates',
    description: 'Send welcoming packets, configure hardware requisitions, and coordinate introductory calls.',
    employeeId: 'EMP002',
    employeeName: 'Zain Malik',
    priority: 'medium',
    status: 'pending',
    deadline: '2026-07-18'
  },
  {
    id: 'TSK003',
    title: 'Deploy Landing Page Hotfix',
    description: 'Resolve CSS layout shift on mobile viewports for the home subscription checkout sequence.',
    employeeId: 'EMP006',
    employeeName: 'Ruben Garcia',
    priority: 'urgent',
    status: 'pending',
    deadline: '2026-07-12'
  },
  {
    id: 'TSK004',
    title: 'Setup Mid-Year Sales Kickoff',
    description: 'Draft the presentation slides, sync with international field representatives, and book team dinner.',
    employeeId: 'EMP005',
    employeeName: 'Dulce Maria',
    priority: 'low',
    status: 'completed',
    deadline: '2026-07-05'
  }
];
