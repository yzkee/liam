import { useContext } from 'react'
import { ToastContext } from './Toast'

export const useToast = () => {
  const { headerToast } = useContext(ToastContext)
  return headerToast
}
