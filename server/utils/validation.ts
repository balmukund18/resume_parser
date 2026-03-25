import Joi from "joi";

// File upload validation schema
export const uploadSchema = Joi.object({
  filename: Joi.string().required(),
  mimetype: Joi.string()
    .valid(
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain"
    )
    .required()
    .messages({
      "any.only": "Invalid file type. Supported formats: PDF, DOCX, TXT",
    }),
  size: Joi.number()
    .max(10 * 1024 * 1024) // 10MB
    .required()
    .messages({
      "number.max": "File size exceeds 10MB limit",
    }),
});

// Export request validation schema
export const exportSchema = Joi.object({
  format: Joi.string().valid("json", "pdf").required().messages({
    "any.only": "Invalid export format. Supported formats: json, pdf",
  }),
});

// Resume ID validation
export const idSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    "string.guid": "Invalid resume ID format",
  }),
});

// Validate function helper
export function validate<T>(
  schema: Joi.ObjectSchema,
  data: unknown
): { value: T; error: null } | { value: null; error: string } {
  const { error, value } = schema.validate(data, { abortEarly: false });
  
  if (error) {
    const messages = error.details.map((detail) => detail.message).join(", ");
    return { value: null, error: messages };
  }
  
  return { value: value as T, error: null };
}
