import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tasksRouter from "./tasks";
import studyRouter from "./study";
import gymRouter from "./gym";
import notesRouter from "./notes";
import dashboardRouter from "./dashboard";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tasksRouter);
router.use(studyRouter);
router.use(gymRouter);
router.use(notesRouter);
router.use(dashboardRouter);
router.use(aiRouter);

export default router;
