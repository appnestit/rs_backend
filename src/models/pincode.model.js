import mongoose, {Schema} from "mongoose";

const pincodeSchema = new Schema({
    pincode: String,
    isActive: {
        type: Boolean,
        default: true
    },
    city: String,
    staff: {
        type: Schema.Types.ObjectId,
        ref: "Staff"
    }
})

export const Pincode = mongoose.model("Pincode", pincodeSchema)