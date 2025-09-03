import { UserAddressSchema, UserLoginSchema, UserProfileUpdateSchema, UserRegisterSchema } from "../schemas/userSchema.js";
import { ApiError } from "../utils/ApiError.js";
import { asynchandler } from "../utils/asynchandler.js";

const userRegisterValidation = asynchandler(async (req, res, next) => {
    // validate with zod schema
    // using "safeParse" because it does not throw error
    const result = UserRegisterSchema.safeParse(req.body)

    console.log(req.body)
    console.log(result.error)

    if (!result.success) return res.status(400).json(ApiError(400, `${result?.error?.issues?.length} input field is invalid`, result?.error?.issues))

    // you know about middleware, right? Okay, then you can get it.
    next()
})

const userLoginValidation = asynchandler(async (req, res, next) => {
    const result = UserLoginSchema.safeParse(req.body)

    if (!result.success) return res.status(400).json(ApiError(400, `${result?.error?.issues?.length} input field is invalid`, result?.error?.issues))

    // you know about middleware, right? Okay, then you can get it.
    next()
})

const userUpdateValidation = asynchandler(async (req, res, next) => {
    const sanitizedData = UserProfileUpdateSchema.safeParse(req.body)

    if (!sanitizedData.success) return res.status(400).json(ApiError(400, `${sanitizedData?.error?.issues?.length} input field is invalid`, sanitizedData?.error?.issues))

    // changing req.body data with sanitized data
    req.body = { ...sanitizedData.data }

    next()
})

const userAddressValidation = asynchandler(async (req, res, next) => {
    const sanitizedData = UserAddressSchema.safeParse(req.body)

    if (!sanitizedData.success) return res.status(400).json(ApiError(400, `${sanitizedData?.error?.issues?.length} input field is invalid`, sanitizedData?.error?.issues))

    // changing req.body data with sanitized data
    req.body = { ...sanitizedData.data }

    next()
})

export {
    userRegisterValidation,
    userLoginValidation,
    userUpdateValidation,
    userAddressValidation
}