import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminView from './AdminView';
import { api } from '../api/client';

// Mock the API
vi.mock('../api/client', () => ({
  api: {
    getFolders: vi.fn(),
    getSettings: vi.fn(),
    deleteFolder: vi.fn(),
    scanFolder: vi.fn(),
    updateSetting: vi.fn(),
  }
}));

// Mock window.confirm
const confirmSpy = vi.spyOn(window, 'confirm');

describe('AdminView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getFolders as any).mockResolvedValue([
      { id: 1, path: '/photos/folder1', last_scanned_at: null }
    ]);
    (api.getSettings as any).mockResolvedValue([]);
  });

  it('shows the correct confirmation message when deleting a folder', async () => {
    render(<AdminView />);
    
    // Wait for folders to load
    await waitFor(() => {
      expect(screen.getByText('/photos/folder1')).toBeInTheDocument();
    });

    // Find the delete button (Trash2 icon)
    const deleteButton = screen.getByTitle('Remove');
    
    // Click delete
    fireEvent.click(deleteButton);

    // Verify confirmation message
    expect(confirmSpy).toHaveBeenCalledWith(
      'Remove this folder? All indexed photos from this folder and its subfolders will also be removed from the library.'
    );
  });
});
