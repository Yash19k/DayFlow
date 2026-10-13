
import express from "express";

export const app = express();

console.log("App.ts executed");

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "TaskFlow API is running",
  });
});
