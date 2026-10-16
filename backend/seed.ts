import bcrypt from 'bcrypt';
import { AppDataSource } from './config/data.source';
import { Organization } from './entities/organization.entity';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { Project, ProjectVisibility } from './entities/project.entity';
import { ProjectMember, ProjectRole } from './entities/project.member.entity';
import { Sprint, SprintStatus } from './entities/sprint.entities';
import { WorkItem, WorkItemPriority, WorkItemStatus, WorkItemType } from './entities/work.item.entity';
import { WorkItemAssignee } from './entities/work.item-assignee.entity';

export async function runSeed(): Promise<void> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const orgRepo = AppDataSource.getRepository(Organization);
  const userRepo = AppDataSource.getRepository(User);
  const projectRepo = AppDataSource.getRepository(Project);
  const memberRepo = AppDataSource.getRepository(ProjectMember);
  const sprintRepo = AppDataSource.getRepository(Sprint);
  const workItemRepo = AppDataSource.getRepository(WorkItem);
  const assigneeRepo = AppDataSource.getRepository(WorkItemAssignee);

  let org = await orgRepo.findOne({ where: { slug: 'taskflow-hq' } });
  if (!org) {
    org = await orgRepo.save(
      orgRepo.create({
        name: 'TaskFlow Technologies',
        slug: 'taskflow-hq',
      })
    );
  }

  const hashedPassword = await bcrypt.hash('Password123!', 10);

  const demoUsers = [
    { name: 'Yash Kshatriya', email: 'admin@taskflow.pro', role: UserRole.ADMIN },
    { name: 'Sarah Chen', email: 'manager@taskflow.pro', role: UserRole.MANAGER },
    { name: 'Alex Rivera', email: 'teammate@taskflow.pro', role: UserRole.TEAMMATE },
  ];

  const userMap: Record<string, User> = {};

  for (const u of demoUsers) {
    let user = await userRepo.findOne({ where: { email: u.email } });
    if (!user) {
      user = await userRepo.save(
        userRepo.create({
          fullName: u.name,
          email: u.email,
          passwordHash: hashedPassword,
          role: u.role,
          status: UserStatus.ACTIVE,
          organizationId: org.id,
        })
      );
      console.log(`Created user: ${u.email}`);
    } else {
      user.passwordHash = hashedPassword;
      user.status = UserStatus.ACTIVE;
      user.organizationId = org.id;
      user = await userRepo.save(user);
    }
    userMap[u.role] = user;
  }

  let project = await projectRepo.findOne({
    where: { organizationId: org.id, key: 'CORE' },
  });

  if (!project) {
    project = await projectRepo.save(
      projectRepo.create({
        name: 'Core Application Platform',
        key: 'CORE',
        description: 'TaskFlow flagship architecture and core delivery modules',
        visibility: ProjectVisibility.PUBLIC,
        organizationId: org.id,
        createdById: userMap[UserRole.ADMIN].id,
      })
    );
    console.log(`Created project CORE: ${project.id}`);
  }

  const roles = [
    { user: userMap[UserRole.ADMIN], role: ProjectRole.ADMIN },
    { user: userMap[UserRole.MANAGER], role: ProjectRole.LEAD },
    { user: userMap[UserRole.TEAMMATE], role: ProjectRole.MEMBER },
  ];

  for (const m of roles) {
    const mem = await memberRepo.findOne({
      where: { projectId: project.id, userId: m.user.id },
    });
    if (!mem) {
      await memberRepo.save(
        memberRepo.create({
          projectId: project.id,
          userId: m.user.id,
          addedById: userMap[UserRole.ADMIN].id,
          role: m.role,
        })
      );
    }
  }

  let sprint = await sprintRepo.findOne({
    where: { projectId: project.id, name: 'Sprint 1 - Foundations' },
  });

  if (!sprint) {
    sprint = await sprintRepo.save(
      sprintRepo.create({
        projectId: project.id,
        createdById: userMap[UserRole.ADMIN].id,
        name: 'Sprint 1 - Foundations',
        goal: 'Deliver primary auth, schema migrations, and REST pipeline',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        status: SprintStatus.ACTIVE,
      })
    );
  }

  const workItemsData = [
    { title: 'Cloud Infrastructure & Database Architecture', type: WorkItemType.EPIC, status: WorkItemStatus.IN_PROGRESS, priority: WorkItemPriority.HIGH, dueDate: new Date('2026-10-30') },
    { title: 'User Authentication & JWT Verification Layer', type: WorkItemType.STORY, status: WorkItemStatus.DONE, priority: WorkItemPriority.HIGH, dueDate: new Date('2026-10-14') },
    { title: 'TypeORM Migration Engine Synchronization', type: WorkItemType.TASK, status: WorkItemStatus.DONE, priority: WorkItemPriority.MEDIUM, dueDate: new Date('2026-10-12') },
    { title: 'Implement Business-Day Scheduling Cascades', type: WorkItemType.TASK, status: WorkItemStatus.IN_PROGRESS, priority: WorkItemPriority.HIGH, dueDate: new Date('2026-10-23') },
    { title: 'Prevent Accidental Task Deletion with Confirmation Modal', type: WorkItemType.TASK, status: WorkItemStatus.BACKLOG, priority: WorkItemPriority.LOW, dueDate: new Date('2026-10-28') },
    { title: 'Resolve Due-Date Boundary Misalignment in Calendar Grid', type: WorkItemType.BUG, status: WorkItemStatus.BACKLOG, priority: WorkItemPriority.HIGH, dueDate: new Date('2026-10-20') },
  ];

  for (const item of workItemsData) {
    const exists = await workItemRepo.findOne({
      where: { projectId: project.id, title: item.title },
    });
    if (!exists) {
      const saved = await workItemRepo.save(
        workItemRepo.create({
          organizationId: org.id,
          projectId: project.id,
          createdById: userMap[UserRole.ADMIN].id,
          sprintId: sprint.id,
          title: item.title,
          type: item.type,
          status: item.status,
          priority: item.priority,
          dueDate: item.dueDate,
        })
      );
      await assigneeRepo.save(
        assigneeRepo.create({
          workItemId: saved.id,
          userId: userMap[UserRole.TEAMMATE].id,
          assignedById: userMap[UserRole.ADMIN].id,
        })
      );
    }
  }

  console.log('Database seeded successfully.');
}

if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed execution error:', err);
      process.exit(1);
    });
}
