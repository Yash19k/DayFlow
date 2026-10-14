
import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import {
  WorkItemType,
  WorkItemStatus,
} from "../entities/work.item.entity";
import { AppError } from "../errors/app.error";


const viewProjectWorkItemsParamsSchema = Joi.object({
  projectId: Joi.string()
    .guid({ version: ["uuidv4"] })
    .required(),
}).unknown(false);

const viewProjectWorkItemsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string()
    .valid(...Object.values(WorkItemStatus))
    .optional(),
  type: Joi.string()
    .valid(...Object.values(WorkItemType))
    .optional(),
}).unknown(false);

export const validateViewProjectWorkItems = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const paramsResult = viewProjectWorkItemsParamsSchema.validate(
    req.params,
    { abortEarly: false }
  );

  const queryResult = viewProjectWorkItemsQuerySchema.validate(
    req.query,
    { abortEarly: false, convert: true }
  );

  const errors = [
    ...(paramsResult.error?.details ?? []),
    ...(queryResult.error?.details ?? []),
  ];

  if (errors.length > 0) {
    throw new AppError(
      errors.map((detail) => detail.message).join(", "),
      400,
      "VALIDATION_ERROR"
    );
  }

  res.locals.validatedWorkItemQuery = queryResult.value;
  next();
};
