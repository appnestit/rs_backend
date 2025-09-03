import axios from "axios";
import nodemailer from "nodemailer";
import { ClassResponse } from "../utils/ClassResponse.js";

class Notification {
  async emailSender(recipent, subject, text) {
    // Create a transporter using your SMTP server configuration
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST, // Your SMTP server
      port: process.env.EMAIL_PORT, // SMTP port (use 465 for SSL)
      secure: true, // Set to true if using port 465
      auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASSWORD, // Password for the email account
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates if applicable
      },
      // logger: true,
      // debug: true
    });

    const mailOptions = {
      from: "No-Reply <noreply@appnestit.com>", // Sender address
      to: Array.isArray(recipent) ? recipent.join(",") : recipent, // List of recipients
      subject: subject, // Subject line
      html: text, // Plain text body
    };

    await transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        return ClassResponse(false, 500, "Email sent failed")
      }
    });

    return ClassResponse(true, 200, "Email has been sent")
  }

  async smsSender(recipient, message) {
    // validation
    // if (typeof message !== "function")
    //   throw new Error(
    //     "The message should be a function that returns some string"
    //   );
    if (!recipient || recipient?.length !== 10)
      throw new Error("Recipient's length should be 10");

    // const finalMessage = message(); // get the string

    console.log(message)

    try {
      const response = await axios.get(`${process.env.SMS_SERVICE_HOST}`, {
        params: {
          username: process.env.SMS_SERVICE_USERNAME,
          apikey: process.env.SMS_SERVICE_APIKEY,
          apirequest: "Text",
          sender: process.env.SMS_SENDER_ID,
          mobile: recipient,
          message: message,
          route: "TRANS",
          TemplateID: process.env.SMS_SERVICE_TEMPLATE_ID,
          format: "JSON",
        },
      });

      if (response.data.status === "success") {
        return ClassResponse(true, 200, "SMS has been sent")
      }
      console.log(response)
    } catch (error) {
      console.log(error)
      return ClassResponse(false, 500, "SMS sent failed")
    }
  }
}

export { Notification }