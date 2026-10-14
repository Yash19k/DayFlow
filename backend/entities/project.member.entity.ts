import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";

import { Project } from "./project.entity";
import { User } from "./user.entity";

@Entity("project_members")
export class ProjectMember {
  @PrimaryColumn("uuid", { name: "project_id" })
  projectId!: string;

  @PrimaryColumn("uuid", { name: "user_id" })
  userId!: string;

  @Column("uuid", {
    name: "added_by_id",
    nullable: true,
  })
  addedById!: string | null;

  @CreateDateColumn({ name: "joined_at" })
  joinedAt!: Date;

  @ManyToOne(
    () => Project,
    (project) => project.memberships,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "project_id" })
  project!: Project;

  @ManyToOne(
    () => User,
    (user) => user.projectMemberships,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(
    () => User,
    { nullable: true, onDelete: "SET NULL" },
  )
  @JoinColumn({ name: "added_by_id" })
  addedBy!: User | null;
}