import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pdfRoutes from "./routes/pdfRoutes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "PDFMaster Backend is running",
  });
});

app.use("/api/pdf", pdfRoutes);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
