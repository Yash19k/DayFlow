
import { app } from "./app";
// import { app } from "./src/app"; 
import { config } from "./config/config";
import { AppDataSource } from "./config/data.source";

async function startServer(): Promise<void> {
  try {
    console.log("Starting TaskFlow...");
    console.log("Connecting to PostgreSQL...");

    await AppDataSource.initialize();

    console.log("Database connected successfully.");
// here config.host make error while sending data
    app.listen(config.port, () => {
      console.log(
        `Server running at http://${config.host}:${config.port}`,
      );
    });
  } catch (error) {
    console.error("Application startup failed:", error);
    process.exitCode = 1;
  }
}

void startServer();