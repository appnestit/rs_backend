import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

export const connectDb = async () => {
    try {
        const connection = await mongoose.connect(process.env.MONGODB_URI, {dbName: DB_NAME})
        console.log("Server is connected to MongoDB Atlas")
        console.log(connection?.connection?.host)
    } catch (error) {
        console.log("MongoDB Atlas connection is failed ", error)
    }
}