import { Router } from "express"
import { deleteUser, editeUser, getUser, getUserById } from "../controllers/user.controller"

import { upload } from "../middlewares/uploadfile"

const userRouter: Router = Router()

userRouter.get('/',  getUser)
userRouter.get('/:id',  getUserById)
userRouter.put('/:id',  upload.single('fileupload'), editeUser)
userRouter.delete('/:id', deleteUser)

export default userRouter