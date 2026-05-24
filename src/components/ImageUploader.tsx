// components/ImageUploader.tsx
import React, { useState, useEffect } from 'react';
import { imageApi } from '../api/images';

interface ImageUploaderProps {
  productId?: number;
  currentImageUrl?: string | null;
  onImageUploaded?: (imageUrl: string) => void;
  onImageRemoved?: () => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  productId, 
  currentImageUrl, 
  onImageUploaded, 
  onImageRemoved 
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingImage, setHasExistingImage] = useState(!!currentImageUrl);

  // Actualizar cuando cambia la URL actual
  useEffect(() => {
    setHasExistingImage(!!currentImageUrl);
    setPreview(null); // Limpiar preview cuando cambia la imagen actual
  }, [currentImageUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !productId) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten archivos de imagen');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar los 5MB');
      return;
    }

    // Vista previa
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setUploading(true);
    setError(null);

    try {
      const result = await imageApi.upload(productId, file);
      if (onImageUploaded) {
        onImageUploaded(result.url);
      }
      setHasExistingImage(true);
      setPreview(null); // Limpiar preview después de subir
      alert('✅ Imagen subida exitosamente');
    } catch (err: any) {
      setError(err.message || 'Error al subir la imagen');
    } finally {
      setUploading(false);
      e.target.value = ''; // Limpiar input
    }
  };

  // Mostrar imagen actual o preview
  const displayImage = preview || currentImageUrl;

  if (!productId) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
        💡 Guarda el producto primero para poder subir imágenes
      </div>
    );
  }

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
      <div className="mb-2">
        {displayImage ? (
          <div className="relative inline-block">
            <img 
              src={displayImage} 
              alt="Vista previa" 
              className="max-w-full h-32 object-contain mx-auto rounded" 
            />
            {hasExistingImage && !preview && (
              <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-1 rounded-bl">
                Actual
              </div>
            )}
          </div>
        ) : (
          <div className="text-4xl mb-2">🖼️</div>
        )}
      </div>
      
      <label className={`cursor-pointer inline-block px-4 py-2 rounded-md transition ${
        uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}>
        {uploading ? 'Subiendo...' : hasExistingImage ? '🔄 Reemplazar imagen' : '📤 Seleccionar imagen'}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading || !productId}
          className="hidden"
        />
      </label>
      
      {hasExistingImage && !preview && (
        <p className="text-xs text-green-600 mt-2">
          ✅ Producto tiene imagen asociada
        </p>
      )}
      
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      <p className="text-xs text-gray-400 mt-2">
        Formatos permitidos: JPG, PNG, GIF. Máximo 5MB
      </p>
    </div>
  );
};

export default ImageUploader;