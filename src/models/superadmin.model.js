import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const superadminSchema = new Schema({
    username: String,
    password: String,
    role: String,
    isJoined: {
        type: Boolean,
        default: false
    },
    typeOfStore: {
        type: String,
        enum: ["Bakery", "Rest"]
    },
    email: String
})

superadminSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10)
        next()
    } else {
        return next()
    }
})

superadminSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

superadminSchema.methods.generateAccessToken = async function () {
    return jwt.sign(
        {
            _id: this?._id,
            username: this.username
        },
        process.env.SUPERADMIN_ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.SUPERADMIN_ACCESS_TOKEN_EXPIRY
        }
    )
}

export const Superadmin = mongoose.model("Superadmin", superadminSchema)