import { Contact } from "../models/conatct.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";

const addContact = asynchandler(async(req,res) => {
    const {name, email, phone, msg} = req.body

    const newMsg = await Contact.create({
        name: name,
        email: email,
        phone: phone,
        msg: msg,
        date: new Date().toLocaleDateString()
    })
    if(!newMsg) return res.status(200).json(ApiError(200, "Message is not saved"))

    return res.status(200).json(ApiResponse(200, "Message has been saved"))
})

const getAllMsg = asynchandler(async(req,res) => {
    const contacts = await Contact.find().sort({_id: -1})

    return res.status(200).json(ApiResponse(200, "Contacts fetched", contacts))
})

export {
    addContact,
    getAllMsg
}