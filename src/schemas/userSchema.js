import { z } from "zod"

const stringRegex = /^[a-zA-Z\s]+$/; // a-z & A-Z
const addressRegex = /^[a-zA-Z0-9\s\-,]+$/; // 1-9 & - and , & a-z & A-Z
const numberRegex = /^[0-9]+$/ // 1-9
const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

const UserRegisterSchema = z.object({
    fullName: z.string().regex(stringRegex, { message: "Invalid data" }),
    email: z.string().email().optional(),
    phoneNumber: z.string().length(10, { message: "Phone number must be of 10 digits" }).regex(numberRegex, {
        message: "Invalid phone number"
    }),
    password: z.string().regex(passwordRegex, {
        message: "Password must contain at least 8 character, a capital letter, a small letter, a number, a special letter"
    })
})

// ".shape" is used tp invidually access any schema. We can use it to re-use a schema from an object to another object that's what we are doing here

const UserLoginSchema = z.object({
    email: UserRegisterSchema.shape.email
})

const UserProfileUpdateSchema = z.object({
    email: UserRegisterSchema.shape.email.transform(val => val?.trim()).optional(),
    phone: UserRegisterSchema.shape.phoneNumber.transform(val => val?.trim().replace(stringRegex, "")).optional(),
    fullName: UserRegisterSchema.shape.fullName.transform(val => val?.trim()).optional(),
    country: z.string().regex(stringRegex).transform(val => val?.trim()).optional(),
    gender: z.string().regex(stringRegex).transform(val => val?.trim()).optional(),
}) 

const UserAddressSchema = z.object({
    streetAddress1: z.string().regex(addressRegex).transform(val => val.trim()),
    streetAddress2: z.string().regex(addressRegex).transform(val => val.trim()),
    city: z.string().regex(stringRegex).transform(val => val.trim()),
    state: z.string().regex(stringRegex).transform(val => val.trim()),
    pincode: z.string().length(6).regex(numberRegex).transform(val => val.trim()),
    fullName: UserRegisterSchema.shape.fullName.transform(val => val.trim()),
    phone: UserRegisterSchema.shape.phoneNumber.transform(val => val.trim())
})

export {
    UserRegisterSchema,
    UserLoginSchema,
    UserProfileUpdateSchema,
    UserAddressSchema
}