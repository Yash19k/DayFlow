
import { app } from "./app";
// import { app } from "./src/app"; 
import { config } from "./config/config";
import { AppDataSource } from "./config/data.source";

async function startServer(): Promise<void> {
  try {
    if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET must be configured in production.");
    }

    console.log("Starting TaskFlow...");
    console.log("Connecting to PostgreSQL...");

    await AppDataSource.initialize();

    console.log("Database connected successfully.");

    const server = app.listen(config.port, config.host, () => {
      console.log(
        `Server running at http://${config.host}:${config.port}`,
      );
    });

    server.on("error", (error) => {
      console.error("HTTP server error:", error);
    });

    server.on("close", () => {
      console.error("HTTP server closed.");
    });
  } catch (error) {
    console.error("Application startup failed:", error);
    process.exitCode = 1;
  }
}

void startServer();
