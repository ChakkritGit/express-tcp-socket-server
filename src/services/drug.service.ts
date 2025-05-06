import prisma from "../configs/prisma.config"
import fs from "node:fs"
import path from "node:path"
import { Drugs } from "@prisma/client"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"
import { HttpError } from "../error"
import { getDrugImage } from "../utils/image"
import { getDateFormat } from "../utils/date-format"

export const addDrug = async (body: Drugs, pic?: Express.Multer.File): Promise<Drugs | undefined> => {
  try {
    const result = await prisma.drugs.create({
      data: {
        id: body.id,
        Drugcode: body.Drugcode,
        DrugName: body.DrugName,
       
        DrugStatus: true,
        DrugImage: !pic ? null : `/img/drugs/${pic.filename}`,
        CreatedAt: getDateFormat(new Date()),
        UpdatedAt: getDateFormat(new Date())
      }
    })
    return result
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        if (pic) fs.unlinkSync(path.join('public/images/drugs', String(pic.filename)))
        throw new HttpError(400, 'Drug already exists')
      }
    } else {
      throw (error)
    }
  }
}

export const findDrug = async (): Promise<Drugs[] | undefined> => {
  try {
    const result = await prisma.drugs.findMany({
      orderBy: {
        CreatedAt: 'desc'
      }
    })
    return result
  } catch (error) {
    throw (error)
  }
}

export const findDrugId = async (drugId: string): Promise<Drugs | null> => {
  try {
    const result = await prisma.drugs.findFirst({
      where: {
        id: drugId
      }
    })
    if (!result) throw new HttpError(404, 'Drug not found')
    return result
  } catch (error) {
    throw (error)
  }
}

export const editDrugService = async (body: Drugs, drugId: string, pic?: Express.Multer.File): Promise<Drugs> => {
  try {
    const filename = await getDrugImage(drugId)
    if (body.DrugStatus) body.DrugStatus = String(body.DrugStatus) == "1" ? true : false
    body.DrugImage = !pic ? filename || null : `/img/drugs/${pic.filename}`
    body.UpdatedAt = getDateFormat(new Date())
    const result = await prisma.drugs.update({
      where: {
        id: drugId
      },
      data: body
    })
    if (pic && !!filename) fs.unlinkSync(path.join('public/images/drugs', filename.split("/")[3]))
    return result
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        fs.unlinkSync(path.join('public/images/drugs', pic!.filename))
        throw new HttpError(404, 'Drug not found to update')
      }
    }
    fs.unlinkSync(path.join('public/images/drugs', pic!.filename))
    throw (error)
  }
}

export const deleteDrugService = async (drugId: string): Promise<Drugs> => {
  try {
    const filename = await getDrugImage(drugId)
    const result = await prisma.drugs.delete({
      where: {
        id: drugId
      }
    })
    if (!!filename) fs.unlinkSync(path.join('public/images/drugs', filename.split("/")[3]))
    return result
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new HttpError(404, "Drug not found to delete")
      }
    }
    throw (error)
  }
}