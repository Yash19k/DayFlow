import express, { type Express } from "express";
import { type Request, type Response, type NextFunction } from "express";
import { signupSchema } from "../validator/user.validator";
const Router = express.Router();

Router.post("/auth", async (req: Request, res: Response, next: NextFunction) => {
    
    const value = signupSchema.validate(req.body);
    console.log(value);
    res.send("done");
})


export default Router;