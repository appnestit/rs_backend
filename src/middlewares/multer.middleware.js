import {v4 as uuidv4} from "uuid"
import multer from "multer"

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './tmp/public')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = uuidv4()
        //extracting file extension
        const splitedName = file.originalname.split(".")
        const splitedArrayLen = splitedName.length
        //generating new file name
        const fileName = `${file.fieldname}_${uniqueSuffix}.${splitedName[splitedArrayLen-1]}`
        cb(null, fileName)
    }
})

export const upload = multer({ storage: storage })