import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import createHttpError, { isHttpError } from "http-errors";
import cors from "cors";
import env from "./util/validateEnv";

// Import routes
import testDBRouter from "./route/testDB";
import usersRouter from "./route/users";
import authRouter from "./route/auth";

const app = express();
const allowedMethods = ["GET", "POST", "PATCH", "DELETE"];

/* Middlewares for data validation */

// Middleware to parse incoming JSON data
app.use(express.json());

// Middleware to handle URL-encoded data
app.use(
  express.urlencoded({
    extended: true,
  })
);

// Only allow your trusted frontend origin and methods
app.use(
  cors({
    origin: [env.FRONTEND_URL], // or "" during dev
    methods: allowedMethods,
  })
);

// Block all other HTTP methods
app.use((req, res, next) => {
  if (!allowedMethods.includes(req.method)) {
    console.log("Method Not Allowed");
    return next(createHttpError(405, "Method Not Allowed"));
  }
  next();
});

/* Routing */

// Base Route
app.get("/", (req, res) => {
  console.log("Hello to the user");
  res.send("Hello, World!");
});

// DB Test Route
app.use("/test", testDBRouter);

// User Authentication Routes
app.use("/auth", authRouter);

// users Routes
app.use("/users", usersRouter);

// 404 Handler
app.use((req, res, next) => {
  next(createHttpError(404, "Endpoint not found"));
});

// Error Function Middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error(err);

  // Default case error
  let errMsg = "An unknown error occured!";
  let statusCode = 500;

  // Unique error
  if (isHttpError(err)) {
    errMsg = err.message;
    statusCode = err.status;
  }

  res.status(statusCode).json({ error: errMsg });
});

export default app;
