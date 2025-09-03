import mongoose, {Schema} from "mongoose";

const walletTransanctionSchema = new Schema({
    amount: Number,
    point: Number,
    date: Date,
    transanctionType: {
        type: String,
        enum: ["Debit", "Credit"]
    },
    isDone: {
        type: Boolean,
        default: false
    },
    supportingDocs: [String],
    paymentId: {
        type: Schema.Types.ObjectId,
        ref: "Payment"
    },
    orderId: String,
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    pointOrigin: {
        type: String,
        enum: ["Product", "Admin", "Referral"]
    },
    withdrawalReqId: {
        type: Schema.Types.ObjectId,
        ref: "WithdrawalReq"
    },
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: "Superadmin"
    }
})

const withdrawalReqSchema = new Schema({
    amount: Number,
    upiId: String,
    date: Date,
    isDone: {
        type: Boolean,
        default: false
    },
    bankAcNumber: String,
    ifscCode: String,
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
})

export const WalletTransanction = mongoose.model("WalletTransaction", walletTransanctionSchema)
export const WithdrawalReq = mongoose.model("WithdrawReq", withdrawalReqSchema)