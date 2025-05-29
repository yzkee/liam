'use client'

import * as PopoverPrimitive from '@radix-ui/react-popover'
import { clsx } from 'clsx'
import {
  type ComponentPropsWithoutRef,
  type ElementRef,
  forwardRef,
} from 'react'
import styles from './Popover.module.css'

export const PopoverRoot = PopoverPrimitive.Root

export const PopoverTrigger = PopoverPrimitive.Trigger

export const PopoverAnchor = PopoverPrimitive.Anchor

export const PopoverPortal = PopoverPrimitive.Portal

export const PopoverContent = forwardRef<
  ElementRef<typeof PopoverPrimitive.Content>,
  ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <PopoverPrimitive.Content
    ref={ref}
    {...props}
    className={clsx(className, styles.content)}
  >
    {children}
  </PopoverPrimitive.Content>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export const PopoverClose = PopoverPrimitive.Close
