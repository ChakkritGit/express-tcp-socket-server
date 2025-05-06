import { Router } from "express"
import { findSlot, useSlot } from "../controllers"

const deviceRouter: Router = Router()

deviceRouter.get('/', findSlot)
deviceRouter.patch('/:machine_id', useSlot)

export default deviceRouter