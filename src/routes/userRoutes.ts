import express, { Router, RequestHandler } from "express";
import { loginUser } from "../controllers/userController";

const router = express.Router();

router.post("/login", loginUser as RequestHandler);

export default router;
