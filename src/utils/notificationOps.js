import { admin } from "../app.js";

export const sendPushNotification = async ({ title, body, image, targetScreen, routeData, userTokens }) => {
    // notification structure
    const message = {
        notification: {
            title: title,
            body: body,
            image: image || "",
        },
        android: {
            notification: {
                channelId: "fresly_default",
                clickAction: "OPEN_ACTIVTY",
                priority: "high",
                sound: "default",
                icon: "ic_logo"
            }
        },
        data: {
            targetScreen: targetScreen || "Main", // use for redirect to the targeted screen
            routeData: routeData // pass data to screen 
        },
        token: userTokens
    }

    // send
    try {
        const res = await admin.messaging().send(message)
        console.log("Notification sent successfully :: ", res)
    } catch (error) {
        console.log("Notification sent failed :: ", error)
    }
}