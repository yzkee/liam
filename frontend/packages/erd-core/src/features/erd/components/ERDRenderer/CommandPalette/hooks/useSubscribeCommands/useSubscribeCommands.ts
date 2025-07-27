import { useSubscribeCopyLinkCommand } from './useSubscribeCopyLinkCommand'
import { useSubscribeShowModeCommand } from './useSubscribeSwitchShowMode'
import { useSubscribeZoomToFitCommand } from './useSubscribeZoomToFitCommand'

export const useSubscribeCommands = () => {
  useSubscribeCopyLinkCommand()
  useSubscribeShowModeCommand()
  useSubscribeZoomToFitCommand()
}
