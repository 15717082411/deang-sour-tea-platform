const mainlandChinaPhonePattern = /^1[3-9]\d{9}$/

export function isValidPhone(phone: string): boolean {
  return mainlandChinaPhonePattern.test(phone)
}
