// src/config/mediaConfig.ts
export const IMAGE_PICKER_CONFIG = {
  profile: {
    width: 800,
    height: 800,
    cropping: true,
    cropperCircleOverlay: false,
    cropperToolbarTitle: 'Crop Profile Photo',
    mediaType: 'photo',
    includeBase64: false,
    compressImageQuality: 0.8,
  },
  chat: {
    width: 1200,
    height: 1200,
    cropping: true,
    freeStyleCropEnabled: true,
    cropperToolbarTitle: 'Crop Image',
    mediaType: 'any',
    includeBase64: false,
    compressImageQuality: 0.7,
  },
  // Add more presets as needed
};
