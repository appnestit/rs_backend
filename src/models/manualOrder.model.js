import mongoose, {Schema} from "mongoose";

const manualOrderSchema = new Schema({
    username: String,
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    phone: String,
    orderPath: [String],
    orderStatus: {
        type: String,
        enum: ["Delivered", "Canceled", "Waiting"],
        default: "Waiting"
    },
    date: Date
})

export const ManualOrder = mongoose.model("ManualOrder", manualOrderSchema)