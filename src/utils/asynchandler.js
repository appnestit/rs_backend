import { ApiError } from "./ApiError.js";

export const asynchandler = (fn) => async (req, res, next) => {
    try {
        await fn(req,res, next)
    } catch (error) {
        console.log(error);
        return res.status(500).json(ApiError(500, "Something went wrong"))
    }
}