import mongoose, {Schema} from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const staffSchema = new Schema({
    username: String,
    email: String,
    password: String,
    name: String,
    role: String,
    isJoined: {
        type: Boolean,
        default: false
    },
    staffId: String,
    /** Most important */
    city: String,
    typeOfStore: {
        type: String,
        enum: ["Bakery", "Rest"]
    },
    isShopClosed: {
        type: Boolean,
        default: false
    },
    state: String,
    pincode: String,
    streetAddress: String,
    phoneNumber: String,
    isActive: {
        type: Boolean,
        default: true
    }
})

staffSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10)
        next()
    } else {
        return next()
    }
})

staffSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

staffSchema.methods.generateAccessToken = async function () {
    return jwt.sign(
        {
            _id: this?._id,
            username: this.username
        },
        process.env.STAFF_ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.STAFF_ACCESS_TOKEN_EXPIRY
        }
    )
}

export const Staff = mongoose.model("Staff", staffSchema)