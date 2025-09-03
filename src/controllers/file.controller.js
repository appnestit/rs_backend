import {asynchandler} from "../utils/asynchandler.js"
import {ApiError} from "../utils/ApiError.js"
import path from "path"
import { fileURLToPath } from "url"

const getFile = asynchandler(async(req,res)=>{
    const {file} = req.params
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    if(!file) return res.status(400).json(ApiError(400, "Image path is important"))

    const filePath = path.join(__dirname, "../../tmp/public", file)
    if(!filePath) return res.status(400).json(ApiError(400, "File not found"))

    return res.sendFile(filePath)
})

export {
    getFile
}