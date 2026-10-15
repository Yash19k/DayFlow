import { Request, Response } from "express";
import { In } from "typeorm";
import { AppDataSource } from "../config/data.source";
import { User, UserStatus } from "../entities/user.entity";
import { Project, ProjectVisibility,} from "../entities/project.entity";
import { ProjectMember } from "../entities/project.member.entity";
import { WorkItem, WorkItemType, WorkItemStatus, WorkItemPriority,} from "../entities/work.item.entity";
import { WorkItemAssignee } from "../entities/work.item-assignee.entity";
import { AppError } from "../errors/app.error";
import {getPagination,getPaginationMeta,} from "../utils/pagination";
interface AssigneeInput { userId: string;startDate?: string | null; estimatedHours?: number | null;}
interface CreateWorkItemBody {projectId: string; parentWorkItemId?: string | null;type: WorkItemType;title: string;description?: string | null;
  priority: WorkItemPriority;
  status: WorkItemStatus;
  dueDate?: string | Date | null;
  assignees: AssigneeInput[];
}
export const createWorkItem = 
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const {
      projectId,
      parentWorkItemId,
      type,
      title,
      description,
      priority,
      status,
      dueDate,
      assignees,
    } = req.body as CreateWorkItemBody;

    const result = await AppDataSource.transaction(
      async (manager) => {
        const userRepository = manager.getRepository(User);
        const projectRepository = manager.getRepository(Project);
        const projectMemberRepository =
          manager.getRepository(ProjectMember);
        const workItemRepository = manager.getRepository(WorkItem);
        const assigneeRepository =
          manager.getRepository(WorkItemAssignee);

        // 1. Retrieve the authenticated user and organization.
        const user = await userRepository.findOne({
          where: { id: userId },
          select: {
            id: true,
            organizationId: true,
            status: true,
          },
        });

        if (!user) {
          throw new AppError(
            "User not found",
            404,
            "USER_NOT_FOUND"
          );
        }

        if (!user.organizationId) {
          throw new AppError(
            "You are not associated with an organization",
            403,
            "ORGANIZATION_NOT_FOUND"
          );
        }

        // 2. Check organization isolation and project visibility.
        const project = await projectRepository
          .createQueryBuilder("project")
          .leftJoin(
            "project.memberships",
            "membership",
            "membership.userId = :userId",
            { userId: user.id }
          )
          .where("project.id = :projectId", { projectId })
          .andWhere(
            "project.organizationId = :organizationId",
            { organizationId: user.organizationId }
          )
          .andWhere(
            `(
              project.visibility = :publicVisibility
              OR membership.userId = :userId
            )`,
            {
              publicVisibility: ProjectVisibility.PUBLIC,
              userId: user.id,
            }
          )
          .getOne();

        if (!project) {
          throw new AppError(
            "Project not found or you do not have access to it",
            404,
            "PROJECT_NOT_FOUND"
          );
        }

        // 3. A parent work item must belong to this project.
        if (parentWorkItemId) {
          const parent = await workItemRepository.findOne({
            where: {
              id: parentWorkItemId,
              projectId: project.id,
              organizationId: user.organizationId,
            },
            select: {
              id: true,
            },
          });

          if (!parent) {
            throw new AppError(
              "Parent work item not found in this project",
              404,
              "PARENT_WORK_ITEM_NOT_FOUND"
            );
          }
        }

        // 4. Verify all assignees belong to this organization
        // and are active.
        const assigneeIds = assignees.map(
          (assignee) => assignee.userId
        );

        if (assigneeIds.length > 0) {
          const eligibleUsers = await userRepository.find({
            where: {
              id: In(assigneeIds),
              organizationId: user.organizationId,
              status: UserStatus.ACTIVE,
            },
            select: {
              id: true,
            },
          });

         

          // 5. Every assignee must be a member of the project.
          const memberships = await projectMemberRepository.find({
            where: {
              projectId: project.id,
              userId: In(assigneeIds),
            },
            select: {
              userId: true,
            },
          });

          if (memberships.length !== assigneeIds.length) {
            throw new AppError(
              "All assignees must be members of the selected project",
              400,
              "ASSIGNEE_NOT_PROJECT_MEMBER"
            );
          }
        }

        // 6. Create the work item.
        const workItem = workItemRepository.create({
          organizationId: user.organizationId,
          projectId: project.id,
          createdById: user.id,
          parentWorkItemId: parentWorkItemId ?? null,
          type,
          title: title.trim(),
          description: description?.trim() || null,
          priority,
          status,
          dueDate:
            dueDate == null ? null : new Date(dueDate),
        });

        const savedWorkItem =
          await workItemRepository.save(workItem);

        // 7. Create multiple assignee records.
        if (assignees.length > 0) {
          const assignments = assignees.map((assignee) =>
            assigneeRepository.create({
              workItemId: savedWorkItem.id,
              userId: assignee.userId,
              assignedById: user.id,
              startDate: assignee.startDate ?? null,
              estimatedHours:
                assignee.estimatedHours == null
                  ? null
                  : String(assignee.estimatedHours),
            })
          );

          await assigneeRepository.save(assignments);
        }

        return {
          workItem: savedWorkItem,
          assigneeIds,
        };
      }
    );

    res.status(201).json({
      success: true,
      message: "Work item created successfully",
      data: {
        ...result.workItem,
        assigneeIds: result.assigneeIds,
      },
    });
  }


interface ViewWorkItemsQuery {
  page: number;
  limit: number;
  status?: WorkItemStatus;
  type?: WorkItemType;
}

export const getProjectWorkItems =
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(
        "Authentication required",
        401,
        "UNAUTHORIZED"
      );
    }

    const { projectId } = req.params;

    const {
      page,
      limit,
      status,
      type,
    } = res.locals.validatedWorkItemQuery as ViewWorkItemsQuery;

    const userRepository = AppDataSource.getRepository(User);
    const projectRepository = AppDataSource.getRepository(Project);
    const workItemRepository = AppDataSource.getRepository(WorkItem);

    // 1. Find the authenticated user's organization.
    const user = await userRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
        organizationId: true,
        status: true,
      },
    });

    if (!user) {
      throw new AppError(
        "User not found",
        404,
        "USER_NOT_FOUND"
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AppError(
        "Your account is not active",
        403,
        "ACCOUNT_INACTIVE"
      );
    }

    // 2. Check project organization and visibility.
    const project = await projectRepository
      .createQueryBuilder("project")
      .leftJoin(
        "project.memberships",
        "membership",
        "membership.userId = :userId",
        { userId }
      )
      .where("project.id = :projectId", { projectId })
      .andWhere(
        "project.organizationId = :organizationId",
        { organizationId: user.organizationId }
      )
      .andWhere(
        `(project.visibility = :publicVisibility
          OR membership.userId = :userId)`,
        {
          publicVisibility: ProjectVisibility.PUBLIC,
          userId,
        }
      )
      .getOne();

    if (!project) {
      throw new AppError(
        "Project not found or you do not have access to it",
        404,
        "PROJECT_NOT_FOUND"
      );
    }

    // 3. Calculate reusable pagination values.
    const { skip, take } = getPagination({ page, limit });

    // 4. Build the project work-items query.
    const query = workItemRepository
      .createQueryBuilder("workItem")
      .where("workItem.projectId = :projectId", {
        projectId: project.id,
      })
      .andWhere(
        "workItem.organizationId = :organizationId",
        { organizationId: user.organizationId }
      )
      .orderBy("workItem.createdAt", "DESC")
      .addOrderBy("workItem.id", "DESC")
      .skip(skip)
      .take(take);

    // 5. Apply optional filters.
    if (status) {
      query.andWhere("workItem.status = :status", { status });
    }

    if (type) {
      query.andWhere("workItem.type = :type", { type });
    }

    // 6. Retrieve work items and total matching count.
    const [workItems, total] = await query.getManyAndCount();

    // 7. Return the paginated response.
    res.status(200).json({
      success: true,
      message: "Project work items retrieved successfully",
      data: {
        projectId: project.id,
        workItems,
        pagination: getPaginationMeta({
          page,
          limit,
          total,
        }),
      },
    });
  }
