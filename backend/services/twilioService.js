const twilio = require("twilio");
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_SERVICE_SID;
const client = twilio(accountSid, authToken, {
  timeout: 5000
});

const sendOtpToPhoneNumber = async (phoneNumber) => {
  if (!phoneNumber) {
    throw new Error("Phone number is required");
  }
  try {
    const response = await client.verify.v2
      .services(serviceSid)
      .verifications.create({ to: phoneNumber, channel: "sms" });
    return response;
  } catch (error) {
    throw error;
  }
};
const verifyOtp = async (phoneNumber, otp) => {
  try {
    const response = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to: phoneNumber, code: otp });
    return response;
  } catch (error) {
    throw error;
  }
};
module.exports = { sendOtpToPhoneNumber, verifyOtp };
