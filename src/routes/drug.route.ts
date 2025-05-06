import { Router } from "express"
import {  createDrug, deleteDrug, editDrug, getDrug, getDrugById } from "../controllers/drug.controller"
import { upload } from "../middlewares/uploadfile"
import { verifyToken } from "../middlewares"

const drugRouter: Router = Router()

drugRouter.get('/', verifyToken, getDrug)
drugRouter.get('/:id', verifyToken, getDrugById)
drugRouter.post('/', upload.single('fileupload'), verifyToken, createDrug)
drugRouter.put('/:id', upload.single('fileupload'), verifyToken, editDrug)
drugRouter.delete('/:id', verifyToken, deleteDrug)

export default drugRouter
