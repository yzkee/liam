import {
  Button,
  ChevronDown,
  Copy,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from '@liam-hq/ui'
import type { FC } from 'react'

export const ExportDropdown: FC = () => {
  return (
    <DropdownMenuRoot>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline-secondary"
          size="md"
          rightIcon={<ChevronDown size={16} />}
        >
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent align="end" sideOffset={8}>
          <DropdownMenuItem leftIcon={<Copy size={16} />}>
            Copy PostgreSQL
          </DropdownMenuItem>
          <DropdownMenuItem leftIcon={<Copy size={16} />}>
            Copy YAML
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
  )
}
