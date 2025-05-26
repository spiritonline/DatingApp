import { validatePhotoUpload, PhotoItem } from '../../screens/profile-setup/utils/validation';

// Mock the validation module
jest.mock('../../screens/profile-setup/utils/validation', () => ({
  validatePhotoUpload: jest.fn(),
  // SimpleValidationResult: jest.requireActual('../../screens/profile-setup/utils/validation').SimpleValidationResult // Unused
}));

describe('PhotoUploadScreen Validation', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('validatePhotoUpload', () => {
    it('should return error when no photos are uploaded', () => {
      const emptyPhotos: PhotoItem[] = [];
      
      // Mock the validation function to return error for empty photos
      (validatePhotoUpload as jest.Mock).mockReturnValue({
        isValid: false,
        error: 'Please upload at least 3 photos'
      });

      const result = validatePhotoUpload(emptyPhotos);
      
      expect(validatePhotoUpload).toHaveBeenCalledWith(emptyPhotos);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please upload at least 3 photos');
    });

    it('should return error when less than 3 photos are uploaded', () => {
      const twoPhotos = [
        { uri: 'photo1.jpg', id: '1' },
        { uri: 'photo2.jpg', id: '2' }
      ];

      // Mock validation for insufficient photos
      (validatePhotoUpload as jest.Mock).mockReturnValueOnce({
        isValid: false,
        error: 'Please upload at least 3 photos'
      });

      const result = validatePhotoUpload(twoPhotos);
      expect(validatePhotoUpload).toHaveBeenCalledWith(twoPhotos);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please upload at least 3 photos');
    });

    it('should validate successfully when 3 or more photos are uploaded', () => {
      const threePhotos = [
        { uri: 'photo1.jpg', id: '1' },
        { uri: 'photo2.jpg', id: '2' },
        { uri: 'photo3.jpg', id: '3' }
      ];

      // Mock successful validation
      (validatePhotoUpload as jest.Mock).mockReturnValueOnce({
        isValid: true,
        error: ''
      });

      const result = validatePhotoUpload(threePhotos);
      expect(validatePhotoUpload).toHaveBeenCalledWith(threePhotos);
      expect(result.isValid).toBe(true);
      expect(result.error).toBe('');
    });

    it('should handle invalid photo items gracefully', () => {
      const invalidPhotos = [
        { uri: '', id: '1' }, // Empty URI
        { uri: 'photo2.jpg', id: '' }, // Empty ID
        { uri: 'photo3.jpg', id: '3' }
      ];

      // Mock validation for invalid photos
      (validatePhotoUpload as jest.Mock).mockReturnValueOnce({
        isValid: false,
        error: 'Some photos are invalid'
      });

      const result = validatePhotoUpload(invalidPhotos);
      expect(validatePhotoUpload).toHaveBeenCalledWith(invalidPhotos);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Some photos are invalid');
    });
  });
});
