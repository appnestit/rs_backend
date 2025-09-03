import mongoose, { Schema } from "mongoose"

const accountVerifySchema = new Schema({
    email: String,
    phone: String,
    verificationMethod: {
        type: String,
        enum: ["Phone", "Email"]
    },
    otp: String,
    createdAt: {
        type: Date,
        index: {
            expires: "30m"
        }
    }
})

export const AccountVerify = mongoose.model("AccountVerify", accountVerifySchema)