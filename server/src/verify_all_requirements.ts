const BASE_URL = 'http://localhost:3001/api';

async function request(path: string, options: { method?: string; body?: any; userId?: string } = {}) {
  const { method = 'GET', body, userId } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (userId) {
    headers['x-current-user-id'] = userId;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runVerification() {
  console.log('🚀 Starting Comprehensive ERP Business Logic Verification...\n');

  // 1. Fetch Users
  const usersRes = await request('/auth/users');
  const users = usersRes.data.data;
  console.log(`✅ Fetched ${users.length} users`);

  const sarah = users.find((u: any) => u.email === 'sarah.chen@company.com'); // Admin / Operations Mgr
  const marcusHR = users.find((u: any) => u.email === 'marcus.v@company.com'); // HR Mgr
  const elena = users.find((u: any) => u.email === 'elena.r@company.com'); // Eng Mgr
  const bobPM = users.find((u: any) => u.email === 'bob.pm@company.com'); // Project Manager
  const ianIT = users.find((u: any) => u.email === 'ian.it@company.com'); // IT Specialist
  const james = users.find((u: any) => u.email === 'james.r@company.com'); // Eng Employee
  const olivia = users.find((u: any) => u.email === 'olivia.s@company.com'); // Support Employee

  if (!sarah || !marcusHR || !elena || !bobPM || !ianIT || !james || !olivia) {
    throw new Error('Could not find all required test users in database!');
  }
  console.log('✅ All key persona users resolved:\n', {
    Admin: sarah.name,
    HR: marcusHR.name,
    EngineeringManager: elena.name,
    ProjectManager: bobPM.name,
    ITSpecialist: ianIT.name,
    Employee: james.name,
    Support: olivia.name,
  });

  // ─────────────────────────────────────────────────────────
  // TEST 1: Employee can do tasks (view deliverables, update status)
  // ─────────────────────────────────────────────────────────
  console.log('\n--- TEST 1: Employee Task Capabilities ---');
  const jamesTasksRes = await request('/tasks', { userId: james.id });
  console.log(`James Rodriguez has ${jamesTasksRes.data.data.length} task(s) visible`);
  if (jamesTasksRes.data.data.length === 0) {
    throw new Error('James Rodriguez has no tasks assigned!');
  }
  const taskToUpdate = jamesTasksRes.data.data[0];
  console.log(`Attempting to update status of Task "${taskToUpdate.title}" (ID: ${taskToUpdate.id}) to IN_PROGRESS...`);
  
  const updateTaskRes = await request(`/tasks/${taskToUpdate.id}`, {
    method: 'PATCH',
    body: { status: 'IN_PROGRESS' },
    userId: james.id,
  });
  if (updateTaskRes.ok && updateTaskRes.data.data.status === 'IN_PROGRESS') {
    console.log('✅ SUCCESS: Employee James updated task status to IN_PROGRESS');
  } else {
    throw new Error(`Failed to update task status as employee: ${JSON.stringify(updateTaskRes.data)}`);
  }

  // ─────────────────────────────────────────────────────────
  // TEST 2: Employee Leave Request routes to HR (Marcus Vance)
  // ─────────────────────────────────────────────────────────
  console.log('\n--- TEST 2: Employee Leave Request Routing to HR ---');
  const leaveReqRes = await request('/leave-requests', {
    method: 'POST',
    body: {
      employeeId: james.employeeId,
      type: 'VACATION',
      startDate: '2026-10-01',
      endDate: '2026-10-05',
      reason: 'Annual family vacation',
    },
    userId: james.id,
  });
  const createdLeave = leaveReqRes.data.data;
  console.log(`Created leave request ID: ${createdLeave.id}, Approver assigned: ${createdLeave.approver?.firstName} ${createdLeave.approver?.lastName} (${createdLeave.approver?.department})`);
  
  if (createdLeave.approverId !== marcusHR.employeeId) {
    throw new Error(`Expected leave approver to be Marcus Vance (${marcusHR.employeeId}), got ${createdLeave.approverId}`);
  }
  console.log('✅ SUCCESS: Leave request automatically routed directly to HR Manager (Marcus Vance)');

  // HR reviews and approves
  const reviewLeaveRes = await request(`/leave-requests/${createdLeave.id}/review`, {
    method: 'PATCH',
    body: { status: 'APPROVED' },
    userId: marcusHR.id,
  });
  if (reviewLeaveRes.data.data.status === 'APPROVED') {
    console.log('✅ SUCCESS: HR Manager (Marcus Vance) approved employee leave request');
  } else {
    throw new Error(`Failed to approve leave request as HR: ${JSON.stringify(reviewLeaveRes.data)}`);
  }

  // ─────────────────────────────────────────────────────────
  // TEST 3: HR Exclusive Employee Creation (Non-HR gets 403)
  // ─────────────────────────────────────────────────────────
  console.log('\n--- TEST 3: HR Exclusive Employee Creation Privilege ---');
  const nonHRAttempt = await request('/employees', {
    method: 'POST',
    body: {
      firstName: 'Unauthorized',
      lastName: 'Hire',
      email: 'unauthorized.hire@company.com',
      department: 'ENGINEERING',
      position: 'Junior Dev',
      hireDate: '2026-09-10',
    },
    userId: elena.id, // Elena is Engineering Manager (NOT HR)
  });

  if (nonHRAttempt.status === 403) {
    console.log('✅ SUCCESS: Non-HR (Engineering Manager) blocked with 403 Forbidden:', nonHRAttempt.data.error);
  } else {
    throw new Error(`SECURITY VIOLATION: Non-HR was able to create employee! Status: ${nonHRAttempt.status}`);
  }

  // HR creates employee successfully
  const newEmpRes = await request('/employees', {
    method: 'POST',
    body: {
      firstName: 'Daniel',
      lastName: 'Wong',
      email: `daniel.wong.${Date.now()}@company.com`,
      department: 'ENGINEERING',
      position: 'Staff Systems Architect',
      hireDate: '2026-09-15',
      role: 'EMPLOYEE',
      systemRole: 'EMPLOYEE',
    },
    userId: marcusHR.id,
  });
  if (newEmpRes.ok) {
    console.log(`✅ SUCCESS: HR Manager successfully created new employee ${newEmpRes.data.data.employeeId} (${newEmpRes.data.data.firstName} ${newEmpRes.data.data.lastName})`);
  } else {
    throw new Error(`HR Manager failed to create employee: ${JSON.stringify(newEmpRes.data)}`);
  }

  // ─────────────────────────────────────────────────────────
  // TEST 4: 1 Manager Per Department Enforcement
  // ─────────────────────────────────────────────────────────
  console.log('\n--- TEST 4: One Manager Per Department Rule ---');
  const dupManagerAttempt = await request('/employees', {
    method: 'POST',
    body: {
      firstName: 'Duplicate',
      lastName: 'Manager',
      email: `dup.manager.${Date.now()}@company.com`,
      department: 'ENGINEERING', // Already has Elena Rostova as Manager
      position: 'Co-Engineering Manager',
      hireDate: '2026-09-20',
      role: 'MANAGER',
      systemRole: 'MANAGER',
    },
    userId: marcusHR.id,
  });

  if (dupManagerAttempt.status === 400) {
    console.log('✅ SUCCESS: Duplicate manager blocked with 400 Bad Request:', dupManagerAttempt.data.error);
  } else {
    throw new Error(`RULE VIOLATION: System allowed a second manager in Engineering! Status: ${dupManagerAttempt.status}`);
  }

  // ─────────────────────────────────────────────────────────
  // TEST 5: Project Manager creates Projects & Chunks (No Self-Assignment)
  // ─────────────────────────────────────────────────────────
  console.log('\n--- TEST 5: Project Manager Project & Chunk Creation ---');
  const newProjectRes = await request('/projects', {
    method: 'POST',
    body: {
      name: `Core Infrastructure Modernization ${Date.now()}`,
      description: 'Upgrade cloud infrastructure and database clustering',
      department: 'ENGINEERING',
      startDate: '2026-10-01',
      projectManagerId: elena.employeeId, // Elena Rostova (Engineering Manager) as lead
    },
    userId: bobPM.id,
  });
  const createdProject = newProjectRes.data.data;
  console.log(`✅ SUCCESS: Project Manager created project "${createdProject.name}" (ID: ${createdProject.id})`);

  // PM self-assignment rejection test
  const selfAssignAttempt = await request('/projects/chunks', {
    method: 'POST',
    body: {
      projectId: createdProject.id,
      title: 'Invalid Self Assignment Chunk',
      assignedDepartment: 'ENGINEERING',
      assignedManagerId: bobPM.employeeId, // PM assigning to self
    },
    userId: bobPM.id,
  });
  if (selfAssignAttempt.status === 400) {
    console.log('✅ SUCCESS: PM self-assignment blocked with 400 Bad Request:', selfAssignAttempt.data.error);
  } else {
    throw new Error(`RULE VIOLATION: PM was able to assign chunk to self! Status: ${selfAssignAttempt.status}`);
  }

  // PM creates chunk and assigns Elena Rostova as chunk manager
  const newChunkRes = await request('/projects/chunks', {
    method: 'POST',
    body: {
      projectId: createdProject.id,
      title: 'PostgreSQL Distributed Sharding',
      description: 'Implement read-replicas and database partition schema',
      assignedDepartment: 'ENGINEERING',
      assignedManagerId: elena.employeeId,
    },
    userId: bobPM.id,
  });
  const createdChunk = newChunkRes.data.data;
  console.log(`✅ SUCCESS: PM created chunk "${createdChunk.title}" (ID: ${createdChunk.id}) assigned to Elena Rostova`);

  // ─────────────────────────────────────────────────────────
  // TEST 6: Manager adds Task under Project Chunk & Visibility
  // ─────────────────────────────────────────────────────────
  console.log('\n--- TEST 6: Manager Adds Task Under Chunk & Delegation Visibility ---');
  const chunkTaskRes = await request('/tasks', {
    method: 'POST',
    body: {
      title: 'Configure PGPool Connection Pooling',
      description: 'Deploy PGPool cluster in Kubernetes and test failovers',
      assignedToId: james.employeeId, // James is Engineering employee
      assignedById: elena.employeeId, // Elena is Engineering manager
      priority: 'HIGH',
      deadline: '2026-10-15',
      projectChunkId: createdChunk.id,
    },
    userId: elena.id,
  });
  const createdTask = chunkTaskRes.data.data;
  console.log(`✅ SUCCESS: Elena created task "${createdTask.title}" under chunk "${createdChunk.title}" assigned to James Rodriguez`);

  // Verify PM sees this chunk and task
  const pmProjectsRes = await request(`/projects/${createdProject.id}`, { userId: bobPM.id });
  const pmViewProject = pmProjectsRes.data.data;
  const foundChunk = pmViewProject.chunks.find((c: any) => c.id === createdChunk.id);
  if (!foundChunk || foundChunk.tasks.length === 0) {
    throw new Error('PM cannot view the task under chunk!');
  }
  const taskUnderChunk = foundChunk.tasks[0];
  console.log(`✅ SUCCESS: PM Bob Projects views task under chunk:`, {
    Task: taskUnderChunk.title,
    AssignedTo: `${taskUnderChunk.assignedTo.firstName} ${taskUnderChunk.assignedTo.lastName}`,
    AssignedBy: `${taskUnderChunk.assignedBy.firstName} ${taskUnderChunk.assignedBy.lastName}`,
  });

  // ─────────────────────────────────────────────────────────
  // TEST 7: IT Role & Supporting Ticket Resolution Restriction
  // ─────────────────────────────────────────────────────────
  console.log('\n--- TEST 7: IT Role & IT Support Ticket Restriction ---');
  const allTicketsRes = await request('/tickets', { userId: sarah.id });
  const itTicket = allTicketsRes.data.data.find(
    (t: any) => t.category === 'INTERNAL_IT' && t.status !== 'RESOLVED'
  );
  if (!itTicket) {
    throw new Error('No open INTERNAL_IT ticket found for testing!');
  }
  console.log(`Found IT Ticket: "${itTicket.title}" (ID: ${itTicket.id}, Status: ${itTicket.status})`);

  // Attempt to resolve as James (Regular Employee) -> Must be 403 Forbidden
  const empResolveAttempt = await request(`/tickets/${itTicket.id}`, {
    method: 'PATCH',
    body: { status: 'RESOLVED' },
    userId: james.id,
  });
  if (empResolveAttempt.status === 403) {
    console.log('✅ SUCCESS: Employee James blocked from resolving IT ticket (403):', empResolveAttempt.data.error);
  } else {
    throw new Error(`SECURITY VIOLATION: Regular employee resolved an IT ticket! Status: ${empResolveAttempt.status}`);
  }

  // Attempt to resolve as Olivia (Support Agent, non-IT) -> Must be 403 Forbidden
  const supportResolveAttempt = await request(`/tickets/${itTicket.id}`, {
    method: 'PATCH',
    body: { status: 'RESOLVED' },
    userId: olivia.id,
  });
  if (supportResolveAttempt.status === 403) {
    console.log('✅ SUCCESS: Support Agent Olivia blocked from resolving IT ticket (403):', supportResolveAttempt.data.error);
  } else {
    throw new Error(`SECURITY VIOLATION: Customer support agent resolved an IT ticket! Status: ${supportResolveAttempt.status}`);
  }

  // Resolve as Ian Tech (IT Specialist) -> Must succeed 200 OK
  const itResolveRes = await request(`/tickets/${itTicket.id}`, {
    method: 'PATCH',
    body: { status: 'RESOLVED' },
    userId: ianIT.id,
  });
  if (itResolveRes.ok && itResolveRes.data.data.status === 'RESOLVED') {
    console.log(`✅ SUCCESS: IT Specialist Ian Tech successfully resolved IT ticket "${itTicket.title}"!`);
  } else {
    throw new Error(`IT Specialist failed to resolve IT ticket: ${JSON.stringify(itResolveRes.data)}`);
  }

  console.log('\n🎉 ALL 7 REQUIREMENTS AND PERMISSION CONTROLS VERIFIED 100% WORKING!\n');
}

runVerification().catch((err) => {
  console.error('❌ Verification failed:', err.message || err);
  process.exit(1);
});
