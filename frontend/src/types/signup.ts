export type SignupStep = 1 | 2 | 3 | 4

export interface SignupData {
  firstName: string
  lastName: string
  email: string
  countryCode: string
  phone: string
  role: string
  acceptedTerms: boolean
  consentedToVerification: boolean
  verificationCode: string
  companyName: string
  companyType: string
  registrationNumber: string
  tin: string
  apiUsage: string
  password: string
  confirmPassword: string
}

export interface SignupStepProps {
  data: SignupData
  update: <K extends keyof SignupData>(
    field: K,
    value: SignupData[K],
  ) => void
}

export const initialSignupData: SignupData = {
  firstName: '',
  lastName: '',
  email: '',
  countryCode: '+234',
  phone: '',
  role: '',
  acceptedTerms: false,
  consentedToVerification: false,
  verificationCode: '',
  companyName: '',
  companyType: '',
  registrationNumber: '',
  tin: '',
  apiUsage: '',
  password: '',
  confirmPassword: '',
}

export function getPasswordChecks(password: string) {
  return [
    {
      label: 'At least 8 characters',
      passed: password.length >= 8,
    },
    {
      label: 'One uppercase & lowercase letter',
      passed: /[A-Z]/.test(password) && /[a-z]/.test(password),
    },
    {
      label: 'One number',
      passed: /[0-9]/.test(password),
    },
    {
      label: 'One special character',
      passed: /[^A-Za-z0-9\s]/.test(password),
    },
  ]
}