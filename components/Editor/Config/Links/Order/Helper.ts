/* eslint-disable @typescript-eslint/no-explicit-any */
export const ALL_BUTTON_VALUE = 'All'
export const ACTIVE_BUTTON_VALUE = 'Active'
export const COMPLETED_BUTTON_VALUE = 'Completed'

export const reorder = (list: any, startIndex: any, endIndex: any) => {
  const result = Array.from(list)
  const [removed] = result.splice(startIndex, 1)
  result.splice(endIndex, 0, removed)
  return result
}
