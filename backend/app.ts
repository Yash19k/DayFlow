
import express from "express";
import userRoutes from "./routes/user.routes";

export const app = express();

console.log("App.ts executed");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/users", userRoutes);

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "TaskFlow API is running",
  });
});
