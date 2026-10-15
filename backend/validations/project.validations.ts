import Joi from "joi";
import { UserRole } from "../entities/user.entity";

// export const addMembersSchemaO = Joi.object({
//   members: Joi.array()
//     .items(
//       Joi.object({
//         email: Joi.string().trim().email().required(),
//         role: Joi.string()
//           .valid(UserRole.MANAGER, UserRole.TEAMMATE)
//           .required(),
//       }),
//     )
//     .min(1)
//     .max(100)
//     .unique("email")
//     .required(),
// });

export const addMembersSchemaA = Joi.array()
  .items(
    Joi.object({
      email: Joi.string().trim().email().required(),
      role: Joi.string().valid(UserRole.MANAGER, UserRole.TEAMMATE).required(),
    }).required(),
  )
  .min(1)
  .max(100)
  .unique("email")
  .required();

export const inviteMembersSchema = Joi.array()
  .items(
    Joi.object({
      email: Joi.string().trim().email().max(254).required(),
      role: Joi.string().valid("MANAGER", "TEAMMATE").required(),
    }),
  )
  .min(1)
  .max(100)
  .required();

export const acceptInvitationSchema = Joi.object({
  token: Joi.string().hex().length(64).required(),
  fullName: Joi.string().trim().min(2).max(100).required(),
  password: Joi.string().min(8).max(128).required(),
});