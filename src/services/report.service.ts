import prisma from '../configs/prisma.config'

export const reportDrugService = async (
  startDate: Date,
  endDate: Date
): Promise<any | undefined> => {
  try {
    const report = await prisma.orders.findMany({
      where: {
        CreatedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        DrugInfo: true,
        Prescription: true
      }
    })
    return report
  } catch (error) {
    throw error
  }
}

export const getDailyInventoryReport = async (
  date: Date
): Promise<any | undefined> => {
  try {
    const report = await prisma.inventory.findMany({
      where: {
        UpdatedAt: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
          lte: new Date(date.setHours(23, 59, 59, 999))
        }
      },
      include: {
        Drug: true,
        // Machines: true
      }
    })
    return report
  } catch (err) {
    throw err
  }
}
