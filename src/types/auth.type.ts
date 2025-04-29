export type GenQr = {
  pinCode: string
}

export type jwtDecodeType = {
  id: string,
  userRole: string,
  displayName: string,
  userStatus: boolean,
  iat: number,
  exp: number
}