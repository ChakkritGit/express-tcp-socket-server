import axios, { AxiosError } from "axios"
import { ResponsePres } from "../types"
import { HttpError } from "../error"

export const getPharmacyPres = async (rfid: string) => {
  try {
    const response = await axios.get<ResponsePres>(`${process.env.PHARMACY_HOST}/getPresTest/${rfid}`)
    return response.data.data
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 404) {
        throw new HttpError(404, "Data not found")
      }
    }
    throw error
  }
}