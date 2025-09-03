import mongoose, {Schema} from "mongoose";

const contactSchema = new Schema({
    name: String,
    email: String,
    phone: String,
    msg: String,
    date: String
})

export const Contact = mongoose.model("Contact", contactSchema)