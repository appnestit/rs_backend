import cookieParser from "cookie-parser"
import express from "express"
import cors from "cors"
import admin from "firebase-admin"
import fs from "fs"
import path from "path"
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const app = express()

app.use(express.json({ limit: "50kb" }))
app.use(express.urlencoded({ limit: "50kb", extended: true }))
app.use(cookieParser())
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    allowedHeaders: "Authorization,Content-Type",
}))

const __filename = fileURLToPath(import.meta.url); // Get the current file path
const __dirname = dirname(__filename); // Get the directory path

const filePath = path.join(__dirname, '../firebase/rsapp-d4ff6-firebase-adminsdk-fbsvc-92d17b3616.json');
const firebaseCert = fs.readFileSync(filePath, 'utf-8');

// initialize for firebase notification
admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(firebaseCert))
})

// import routes
import { userRouter } from "./routes/user.route.js"
import { fileRouter } from "./routes/file.route.js"
import { superadminRouter } from "./routes/superadmin.route.js"
import { staffRouter } from "./routes/staff.routes.js"
import { productRouter } from "./routes/product.router.js"
import { cartRouter } from "./routes/cart.route.js"
import { couponRouter } from "./routes/coupon.route.js"
import { chargeRouter } from "./routes/charge.route.js"
import { paymentRouter } from "./routes/payment.router.js"
import { companyRouter } from "./routes/company.route.js"
import { bannerRouter } from "./routes/banner.route.js"
import { contactRouter } from "./routes/contact.router.js"
import { keywardRouter } from "./routes/keyward.route.js"
import { pincodeRouter } from "./routes/pincode.route.js"
import { walletTransanctionRouter } from "./routes/walletTransanction.route.js"
import { dashboardRouter } from "./routes/dashboard.route.js"
import { manualOrderRouter } from "./routes/manualOrder.route.js"
import { releaseRouter } from "./routes/appRelease.route.js"

// declear routes
// user routes
app.use("/api/v1/user", userRouter)
// file route
app.use("/api/v1/file", fileRouter)
// superadmin router
app.use("/api/v1/superadmin", superadminRouter)
// staff router
app.use("/api/v1/staff", staffRouter)
// product router
app.use("/api/v1/product", productRouter)
// cart router
app.use("/api/v1/cart", cartRouter)
// coupon routes
app.use("/api/v1/coupon", couponRouter)
// charges routes
app.use("/api/v1/charges", chargeRouter)
// payment routes
app.use("/api/v1/payment", paymentRouter)
// company route
app.use("/api/v1/company", companyRouter)
// banners route
app.use("/api/v1/banners", bannerRouter)
// contact routes
app.use("/api/v1/contact", contactRouter)
// keyward routes
app.use("/api/v1/keyward", keywardRouter)
// pincode routes
app.use("/api/v1/pincode", pincodeRouter)
// transanction routes
app.use("/api/v1/wallet", walletTransanctionRouter)
// dashboard routes
app.use("/api/v1/dashboard", dashboardRouter)
// manual order routes
app.use("/api/v1/manual/order", manualOrderRouter)
// app release route
app.use("/api/v1/release", releaseRouter)

//testing route
app.get("/is-okay", (req, res) => {
    return res.status(200).send("Everything is okay!")
})

export { app, admin }
