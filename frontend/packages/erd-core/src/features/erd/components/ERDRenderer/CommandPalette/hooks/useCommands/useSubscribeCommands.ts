import { useSubscribeCopyLinkCommand } from './useSubscribeCopyLinkCommand'
import { useSubscribeShowModeCommand } from './useSubscribeSwitchShowMode'

export const useSubscribeCommands = () => {
  useSubscribeCopyLinkCommand()
  useSubscribeShowModeCommand()
}
