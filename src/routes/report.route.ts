import { Router } from 'express'
import { reportDrug, reportInventory } from '../controllers'

const reportRouter: Router = Router()

reportRouter.get('/drug', reportDrug)
reportRouter.get('/inventory', reportInventory)

export default reportRouter
