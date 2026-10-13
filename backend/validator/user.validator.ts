import Joi from "joi";
// const Joi = require("joi");

// 1. Define the schema for Full Name, Email, and Password
const signupSchema = Joi.object({
  fullName: Joi.string().min(3).max(50).trim().required().messages({
    "string.empty": "Full name is required",
    "string.min": "Full name must be at least 3 characters long",
  }),

  email: Joi.string()
    .email({ tlds: { allow: false } }) // Validates email format
    .lowercase()
    .trim()
    .required()
    .messages({
      "string.email": "Please provide a valid email address",
      "string.empty": "Email is required",
    }),

  password: Joi.string().min(8).max(128).required().messages({
    "string.min": "Password must be at least 8 characters long",
    "string.empty": "Password is required",
  }),
});
