import app from "./app";
import { logger } from "./lib/logger";

// We tell the code: use the PORT from Vercel, or just use 3000 if it's missing.
const port = process.env["PORT"] || 3000;

app.listen(port, () => {
  logger.info({ port }, "Server listening");
});
