import axios from "axios";

const sendOtp = async (mobileNumber, otp) => {
  try {
    const res = await axios({
      url: `${process.env.SMS_SERVICE_HOST}?username=${process.env.SMS_SERVICE_USERNAME}&apikey=${process.env.SMS_SERVICE_APIKEY}&apirequest=Text&sender=${process.env.SMS_SENDER_ID}&mobile=${mobileNumber}&message=${otp} is the OTP for login verification - Powered By AppNest&route=TRANS&TemplateID=${process.env.SMS_SERVICE_TEMPLATE_ID_OTP}&format=JSON`,
      method: "get",
    });
    console.log(res);
    if (res.data.status === "success") {
      return {
        status: true,
        data: res,
      };
    } else {
      return null
    }
  } catch (error) {
    console.log(error);
    return null
  }
};

const sendOnboardingReqMsg = async (mobileNumber, superadminName, name) => {
  try {
    const res = await axios({
      url: `${process.env.SMS_SERVICE_HOST}?username=${process.env.SMS_SERVICE_USERNAME}&apikey=${process.env.SMS_SERVICE_APIKEY}&apirequest=Text&sender=${process.env.SMS_SENDER_ID}&mobile=${mobileNumber}&message=Hello ${superadminName}, We have received your organisation ${name} onboarding application to AppNest People. We will review your profile %26 one of the team member will connect you shortly. Thank you for your interest with us. - Powered By AppNest&route=TRANS&TemplateID=${process.env.SMS_SERVICE_TEMPLATE_ID_ONBOARDING_REQUEST}&format=JSON`,
      method: "get",
    });
    console.log(res);
    if (res.data.status === "success") {
      return {
        status: true,
        data: res,
      };
    } else {
      return null
    }
  } catch (error) {
    console.log(error);
    return null
  }
};

const sendEmpApprovalMsg = async (mobileNumber, username, password) => {
  try {
    const res = await axios({
      url: `${process.env.SMS_SERVICE_HOST}?username=${process.env.SMS_SERVICE_USERNAME}&apikey=${process.env.SMS_SERVICE_APIKEY}&apirequest=Text&sender=${process.env.SMS_SENDER_ID}&mobile=${mobileNumber}&message=Dear Candidate your user id ${username} %26 password ${password}.Please visit employee portal https%3A%2F%2Fpeople.appnestit.com%2F to complete your profile.Thank you Powered by Appnest Information Technology Private Limited&route=TRANS&TemplateID=${process.env.SMS_SERVICE_TEMPLATE_ID_EMP_APPROVAL}&format=JSON`,
      method: "get",
    });
    console.log(res);
    if (res.data.status === "success") {
      return {
        status: true,
        data: res,
      };
    } else {
      return null
    }
  } catch (error) {
    console.log(error);
    return null
  }
};

export {
    sendOtp,
    sendOnboardingReqMsg,
    sendEmpApprovalMsg
}
