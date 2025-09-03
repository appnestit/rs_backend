import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const userSchema = new Schema({
    fullName: String,
    image: String,
    address: [
        {
            addressId: String, // for uniquely identify each address element
            street: String,
            city: String,
            pincode: String,
            state: String,
            fullName: String,
            phone: String,
            houseNo: String,
            landmark: String
        }
    ],
    email: String,
    phone: String,
    customerId: String,
    password: String,
    country: String,
    gender: {
        type: String,
    },
    wallet: {
        point: {
            type: Number,
            default: 0
        },
        money: {
            type: Number,
            default: 0
        },
        withdrawal: {
            type: Number,
            default: 0
        },
        withdrawalPoint: {
            type: Number,
            default: 0
        },
        withdrawalMoney: {
            type: Number,
            default: 0
        }
    },
    bakeryCart: {
        item: {
            type: Number,
            default: 0
        }, 
        price: {
            type: Number,
            default: 0
        }
    },
    restCart: {
        item: {
            type: Number,
            default: 0
        }, 
        price: {
            type: Number,
            default: 0
        }
    },
    fcmToken: String,
    referCode: String,
    isReferUsed: {
        type: Boolean,
        default: false
    },
    usedReferCode: String
})

userSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10)
        next()
    } else {
        return next()
    }
})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = async function () {
    return jwt.sign(
        {
            _id: this?._id,
            email: this.email
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema)