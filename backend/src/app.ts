import express from "express";
import cors from "cors";
import routes from "./routes";
import { errorHandler } from "./middlewares/error.middleware";

const app = express();

// Enable Cross-Origin Resource Sharing
app.use(
	cors({
		origin: process.env.FRONTEND_URL || "http://localhost:5173",
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
	}),
);

// Body parsing middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Server Request Logger (Simple formatting)
app.use((req, _res, next) => {
	console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
	next();
});

// API health check endpoint
app.get("/api/health", (_req, res) => {
	return res.status(200).json({
		status: "ok",
		message: "MindForge Server is healthy",
		timestamp: new Date().toISOString(),
	});
});

// Register api router orchestrator
app.use("/api", routes);

// Register global exception filter middleware (must be registered last)
app.use(errorHandler);

export default app;
