import axios from "axios";

export const sendWhatsAppTemplate = async ({
  phoneNumber,
  templateName,
  languageCode = "en",
  bodyValues = []
}) => {
  try {
    const response = await axios.post(
      "https://api.interakt.ai/v1/public/message/",
      {
        countryCode: "+91",
        phoneNumber,
        type: "Template",
        template: {
          name: templateName,
          languageCode,
          bodyValues
        }
      },
      {
        headers: {
          Authorization: `Basic ${process.env.INTERAKT_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data;

  } catch (error) {
    console.error(
      "Interakt Error:",
      error.response?.data || error.message
    );

    throw error;
  }
};