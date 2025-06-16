import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DeepModelingToggle } from './DeepModelingToggle'

describe('DeepModelingToggle', () => {
  it('renders with label text', () => {
    render(<DeepModelingToggle>Deep Modeling</DeepModelingToggle>)
    expect(screen.getByText('Deep Modeling')).toBeInTheDocument()
  })

  it('renders in inactive state by default', () => {
    render(<DeepModelingToggle>Deep Modeling</DeepModelingToggle>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('inactive')
    expect(button).not.toHaveClass('active')
  })

  it('renders in active state when isActive is true', () => {
    render(<DeepModelingToggle isActive>Deep Modeling</DeepModelingToggle>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('active')
    expect(button).not.toHaveClass('inactive')
  })

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn()
    render(<DeepModelingToggle onClick={handleClick}>Deep Modeling</DeepModelingToggle>)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('adds transitioning class when clicked', () => {
    render(<DeepModelingToggle>Deep Modeling</DeepModelingToggle>)
    const button = screen.getByRole('button')
    
    fireEvent.click(button)
    expect(button).toHaveClass('transitioning')
  })

  it('removes transitioning class after animation duration', async () => {
    vi.useFakeTimers()
    render(<DeepModelingToggle>Deep Modeling</DeepModelingToggle>)
    const button = screen.getByRole('button')
    
    fireEvent.click(button)
    expect(button).toHaveClass('transitioning')
    
    vi.advanceTimersByTime(300)
    expect(button).not.toHaveClass('transitioning')
    
    vi.useRealTimers()
  })

  it('forwards ref correctly', () => {
    const ref = vi.fn()
    render(<DeepModelingToggle ref={ref}>Deep Modeling</DeepModelingToggle>)
    
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement))
  })

  it('passes through additional props', () => {
    render(
      <DeepModelingToggle data-testid="custom-toggle" disabled>
        Deep Modeling
      </DeepModelingToggle>
    )
    
    const button = screen.getByTestId('custom-toggle')
    expect(button).toBeDisabled()
  })

  it('renders sparkle icon when active', () => {
    const { container } = render(<DeepModelingToggle isActive>Deep Modeling</DeepModelingToggle>)
    const sparkleIcon = container.querySelector('.thumbActive svg')
    expect(sparkleIcon).toBeInTheDocument()
  })

  it('renders minus icon when inactive', () => {
    const { container } = render(<DeepModelingToggle isActive={false}>Deep Modeling</DeepModelingToggle>)
    const minusIcon = container.querySelector('.thumbInactive svg')
    expect(minusIcon).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <DeepModelingToggle className="custom-class">
        Deep Modeling
      </DeepModelingToggle>
    )
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
    expect(button).toHaveClass('wrapper') // Still has default classes
  })
})