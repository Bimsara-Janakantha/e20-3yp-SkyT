import axios from "axios";

// Base URL for the image server
const BASE_URL = import.meta.env.VITE_IMAGE_BACKEND;

// API Key for the frontend
const API_KEY = import.meta.env.VITE_IMAGE_API_KEY;

export async function fetchImage(path: string): Promise<string | null> {
  try {
    const destination = `${BASE_URL}/${path}`;
    const config = {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
      responseType: "blob" as const, // <-- important for blob
    };

    console.log("Request image from:", destination);

    const response = await axios.get(destination, config);
    const url = URL.createObjectURL(response.data); // response.data is the Blob

    return url;
  } catch (error) {
    console.error("Image fetch error:", error);
    return null;
  }
}
