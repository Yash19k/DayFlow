import express, {type NextFunction, type Request ,type Response } from "express";
import organizationRoutes from "./routes/organization.routes";


export const app = express();

console.log("App.ts executed");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/organization", organizationRoutes);

app.get("/", (_req, res) => {
  console.log("GET / request received");
  res.json({
    success: true,
    message: "TaskFlow API is running",
  });
});
