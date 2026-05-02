/**
 * OpenAPI 3.0 Documentation for Resume Builder Backend API
 * 
 * To view this documentation:
 * 1. Visit https://swagger.io/tools/swagger-ui/ (paste the spec)
 * 2. Or set up Swagger UI locally with:
 *    npm install swagger-ui-express
 *    Then import and serve this spec in server.ts
 */

export const openAPISpec = {
  openapi: "3.0.0",
  info: {
    title: "Resume Builder API",
    version: "1.0.0",
    description: "API for building, managing, and exporting resumes",
    contact: {
      name: "Support",
    },
  },
  servers: [
    {
      url: "http://localhost:5000/api",
      description: "Development server",
    },
    {
      url: "https://api.yourproduction.com/api",
      description: "Production server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "accessToken",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string", format: "email" },
          name: { type: "string" },
          role: { type: "string", enum: ["user", "admin"] },
        },
        required: ["id", "email", "name", "role"],
      },
      Resume: {
        type: "object",
        properties: {
          _id: { type: "string" },
          userId: { type: "string" },
          title: { type: "string" },
          templateId: { type: "string" },
          style: { type: "object" },
          sections: { type: "object" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Template: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          preview: { type: "string", format: "uri" },
          isPublished: { type: "boolean" },
        },
      },
      Error: {
        type: "object",
        properties: {
          message: { type: "string" },
          code: { type: "string" },
          details: { type: "object" },
        },
      },
    },
  },
  paths: {
    "/auth/signup": {
      post: {
        summary: "Register a new user",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", format: "password" },
                },
                required: ["name", "email", "password"],
              },
            },
          },
        },
        responses: {
          201: {
            description: "User registered successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/User" },
                    csrfToken: { type: "string" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid input" },
          500: { description: "Server error" },
        },
      },
    },
    "/auth/login": {
      post: {
        summary: "Login with email and password",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", format: "password" },
                },
                required: ["email", "password"],
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/User" },
                    csrfToken: { type: "string" },
                  },
                },
              },
            },
          },
          401: { description: "Invalid credentials" },
          500: { description: "Server error" },
        },
      },
    },
    "/auth/google-login": {
      post: {
        summary: "Login or register with Google OAuth token",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  credential: { type: "string", description: "Google OAuth JWT token" },
                },
                required: ["credential"],
              },
            },
          },
        },
        responses: {
          200: {
            description: "Google OAuth login successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/User" },
                    csrfToken: { type: "string" },
                    isNewUser: { type: "boolean" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid Google token" },
          500: { description: "Server error" },
        },
      },
    },
    "/auth/logout": {
      post: {
        summary: "Logout current user",
        tags: ["Authentication"],
        security: [{ cookieAuth: [] }],
        responses: {
          200: { description: "Logged out successfully" },
          401: { description: "Not authenticated" },
        },
      },
    },
    "/refresh": {
      post: {
        summary: "Refresh access token using refresh token",
        tags: ["Authentication"],
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: "Token refreshed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    csrfToken: { type: "string" },
                  },
                },
              },
            },
          },
          401: { description: "Invalid refresh token" },
        },
      },
    },
    "/resumes": {
      get: {
        summary: "List all resumes for current user",
        tags: ["Resumes"],
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20 },
          },
          {
            name: "skip",
            in: "query",
            schema: { type: "integer", default: 0 },
          },
        ],
        responses: {
          200: {
            description: "List of resumes",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Resume" },
                },
              },
            },
          },
          401: { description: "Not authenticated" },
        },
      },
      post: {
        summary: "Create a new resume",
        tags: ["Resumes"],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  templateId: { type: "string" },
                },
                required: ["title", "templateId"],
              },
            },
          },
        },
        responses: {
          201: { description: "Resume created", content: { "application/json": { schema: { $ref: "#/components/schemas/Resume" } } } },
          400: { description: "Invalid input" },
          401: { description: "Not authenticated" },
        },
      },
    },
    "/resumes/{id}": {
      get: {
        summary: "Get a specific resume",
        tags: ["Resumes"],
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Resume found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Resume" } } },
          },
          404: { description: "Resume not found" },
          401: { description: "Not authenticated" },
        },
      },
      put: {
        summary: "Update a resume",
        tags: ["Resumes"],
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  sections: { type: "object" },
                  style: { type: "object" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Resume updated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Resume" } } },
          },
          404: { description: "Resume not found" },
          401: { description: "Not authenticated" },
        },
      },
      delete: {
        summary: "Delete a resume",
        tags: ["Resumes"],
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Resume deleted" },
          404: { description: "Resume not found" },
          401: { description: "Not authenticated" },
        },
      },
    },
    "/resumes/{id}/export-pdf-safe": {
      post: {
        summary: "Export resume as PDF (server-rendered)",
        tags: ["Resumes"],
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  html: { type: "string", description: "HTML content to render" },
                  title: { type: "string" },
                  preset: { type: "string", enum: ["web", "standard", "print"] },
                },
                required: ["html"],
              },
            },
          },
        },
        responses: {
          200: {
            description: "PDF file",
            content: {
              "application/pdf": {},
            },
          },
          400: { description: "Invalid input" },
          404: { description: "Resume not found" },
          401: { description: "Not authenticated" },
          503: { description: "PDF export temporarily unavailable" },
        },
      },
    },
    "/templates": {
      get: {
        summary: "List all available templates",
        tags: ["Templates"],
        responses: {
          200: {
            description: "List of templates",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Template" },
                },
              },
            },
          },
        },
      },
    },
    "/health": {
      get: {
        summary: "Health check endpoint",
        tags: ["Health"],
        responses: {
          200: {
            description: "Service is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          503: { description: "Service unavailable" },
        },
      },
    },
    "/metrics": {
      get: {
        summary: "Prometheus metrics endpoint",
        tags: ["Observability"],
        responses: {
          200: {
            description: "Prometheus metrics in text format",
            content: {
              "text/plain": {},
            },
          },
        },
      },
    },
  },
  security: [
    { cookieAuth: [] },
    { bearerAuth: [] },
  ],
  tags: [
    {
      name: "Authentication",
      description: "User authentication endpoints (signup, login, logout, refresh)",
    },
    {
      name: "Resumes",
      description: "Resume CRUD operations and PDF export",
    },
    {
      name: "Templates",
      description: "Resume templates",
    },
    {
      name: "Health",
      description: "Service health and readiness checks",
    },
    {
      name: "Observability",
      description: "Metrics and monitoring endpoints",
    },
  ],
};
