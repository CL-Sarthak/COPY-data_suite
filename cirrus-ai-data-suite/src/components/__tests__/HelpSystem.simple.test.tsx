import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelpButton, Tooltip, HelpContent, HelpModal } from '../HelpSystem';

const mockHelpContent: HelpContent = {
  title: 'Test Help',
  sections: [
    {
      heading: 'Overview',
      content: 'This is test help content for the component.',
      tips: ['Tip 1: This is a helpful tip'],
      warnings: ['Warning: Be careful with this feature'],
      steps: ['Step 1: First do this'],
    },
  ],
};

describe('HelpSystem Components', () => {
  describe('HelpButton', () => {
    it('should render help button', () => {
      render(<HelpButton content={mockHelpContent} />);
      
      const button = screen.getByRole('button', { name: /help/i });
      expect(button).toBeInTheDocument();
    });

    it('should open help modal when clicked', async () => {
      const user = userEvent.setup();
      render(<HelpButton content={mockHelpContent} />);
      
      const button = screen.getByRole('button', { name: /help/i });
      await user.click(button);
      
      expect(screen.getByText('Test Help')).toBeInTheDocument();
    });

    it('should close modal when X button is clicked', async () => {
      const user = userEvent.setup();
      render(<HelpButton content={mockHelpContent} />);
      
      // Open modal
      const button = screen.getByRole('button', { name: /help/i });
      await user.click(button);
      
      // Close modal
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
      
      expect(screen.queryByText('Test Help')).not.toBeInTheDocument();
    });

    it('should close modal when backdrop is clicked', async () => {
      const user = userEvent.setup();
      render(<HelpButton content={mockHelpContent} />);
      
      // Open modal
      const button = screen.getByRole('button', { name: /help/i });
      await user.click(button);
      
      // Click backdrop (the overlay div)
      const backdrop = screen.getByText('Test Help').closest('.fixed.inset-0');
      if (backdrop) {
        await user.click(backdrop);
      }
      
      expect(screen.queryByText('Test Help')).not.toBeInTheDocument();
    });

    it('should render modal with all content sections', async () => {
      const user = userEvent.setup();
      render(<HelpButton content={mockHelpContent} />);
      
      const button = screen.getByRole('button', { name: /help/i });
      await user.click(button);
      
      // Check all sections are rendered
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('This is test help content for the component.')).toBeInTheDocument();
      expect(screen.getByText('Tip 1: This is a helpful tip')).toBeInTheDocument();
      expect(screen.getByText('Warning: Be careful with this feature')).toBeInTheDocument();
      expect(screen.getByText('Step 1: First do this')).toBeInTheDocument();
    });
  });

  describe('Tooltip', () => {
    it('should render children', () => {
      render(
        <Tooltip text="This is a tooltip">
          <button>Hover me</button>
        </Tooltip>
      );
      
      expect(screen.getByRole('button', { name: /hover me/i })).toBeInTheDocument();
    });

    it('should show tooltip on mouse enter', async () => {
      render(
        <Tooltip text="This is a tooltip">
          <button>Hover me</button>
        </Tooltip>
      );
      
      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      
      expect(screen.getByText('This is a tooltip')).toBeInTheDocument();
    });

    it('should hide tooltip on mouse leave', async () => {
      render(
        <Tooltip text="This is a tooltip">
          <button>Hover me</button>
        </Tooltip>
      );
      
      const button = screen.getByRole('button');
      
      // Show tooltip
      fireEvent.mouseEnter(button);
      expect(screen.getByText('This is a tooltip')).toBeInTheDocument();
      
      // Hide tooltip
      fireEvent.mouseLeave(button);
      expect(screen.queryByText('This is a tooltip')).not.toBeInTheDocument();
    });

    it('should support different tooltip positions', () => {
      const positions = ['top', 'bottom', 'left', 'right'] as const;
      
      positions.forEach(position => {
        render(
          <Tooltip text={`Tooltip ${position}`} position={position}>
            <button>Button {position}</button>
          </Tooltip>
        );
        
        const button = screen.getByText(`Button ${position}`);
        fireEvent.mouseEnter(button);
        
        const tooltip = screen.getByText(`Tooltip ${position}`);
        expect(tooltip).toBeInTheDocument();
        
        // Clean up for next iteration
        fireEvent.mouseLeave(button);
      });
    });

    it('should apply custom className', () => {
      const { container } = render(
        <Tooltip text="Custom tooltip" className="custom-class">
          <button>Custom button</button>
        </Tooltip>
      );
      
      const tooltipWrapper = container.querySelector('.custom-class');
      expect(tooltipWrapper).toBeInTheDocument();
    });
  });

  describe('HelpModal', () => {
    it('should render when isOpen is true', () => {
      render(
        <HelpModal 
          isOpen={true} 
          onClose={() => {}} 
          content={mockHelpContent} 
        />
      );
      
      expect(screen.getByText('Test Help')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(
        <HelpModal 
          isOpen={false} 
          onClose={() => {}} 
          content={mockHelpContent} 
        />
      );
      
      expect(screen.queryByText('Test Help')).not.toBeInTheDocument();
    });

    it('should call onClose when backdrop is clicked', async () => {
      const onClose = jest.fn();
      
      render(
        <HelpModal 
          isOpen={true} 
          onClose={onClose} 
          content={mockHelpContent} 
        />
      );
      
      // Find the backdrop (the outer fixed div)
      const modal = screen.getByText('Test Help');
      const backdrop = modal.closest('.fixed.inset-0.z-50');
      
      if (backdrop) {
        // Click on the backdrop itself, not its children
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalled();
      }
    });

    it('should not call onClose when modal content is clicked', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();
      
      render(
        <HelpModal 
          isOpen={true} 
          onClose={onClose} 
          content={mockHelpContent} 
        />
      );
      
      // Click on the modal content (not the backdrop)
      const modalContent = screen.getByText('Test Help');
      await user.click(modalContent);
      
      expect(onClose).not.toHaveBeenCalled();
    });

    it('should call onClose when close button is clicked', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();
      
      render(
        <HelpModal 
          isOpen={true} 
          onClose={onClose} 
          content={mockHelpContent} 
        />
      );
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
      
      expect(onClose).toHaveBeenCalled();
    });
  });
});