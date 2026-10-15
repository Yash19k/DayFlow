import { Request, Response, NextFunction } from "express";
import { ProjectVisibility } from "../entities/project.entity";
import { AppError } from "../errors/app.error";
import Joi from "joi";

const projectIdSchema = Joi.object({
  projectId: Joi.string().guid({ version: ["uuidv4"] }).required(),
}).unknown(false);

const createProjectSchema = Joi.object({
  name: Joi.string().trim().min(1).max(150).required(),
  key: Joi.string().trim().pattern(/^[A-Za-z][A-Za-z0-9_-]{1,19}$/).required(),
  description: Joi.string().allow("", null).max(10000).optional(),
  startDate: Joi.string().isoDate().allow(null).optional(),
  endDate: Joi.string().isoDate().allow(null).optional(),
  visibility: Joi.string().valid(...Object.values(ProjectVisibility)).default(ProjectVisibility.PRIVATE),
}).custom((value, helpers) => {
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    return helpers.error("date.order");
  }
  return value;
}).messages({
  "date.order": "endDate must be on or after startDate",
}).unknown(false);

export const validateCreateProject = (req: Request, res: Response, next: NextFunction): void => {
  const { error, value } = createProjectSchema.validate(req.body, { abortEarly: false, convert: true });
  if (error) {
    throw new AppError(error.details.map((detail) => detail.message).join(", "), 400, "VALIDATION_ERROR");
  }
  req.body = value;
  next();
};

export const validateProjectId = (req: Request, _res: Response, next: NextFunction): void => {
  const { error } = projectIdSchema.validate(req.params);
  if (error) {
    throw new AppError("Invalid project ID.", 400, "INVALID_PROJECT_ID");
  }
  next();
};
