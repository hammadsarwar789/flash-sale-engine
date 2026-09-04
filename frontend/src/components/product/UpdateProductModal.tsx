import React, { useState, useEffect } from 'react';
import { Product, Category, User } from '../../types/api';
import { productsApi } from '../../api/products';
import { adminApi } from '../../api/admin';
import { vendorApi } from '../../api/vendor';
import { useToast } from '../../context/ToastContext';
import { Eyebrow } from '../ui/Eyebrow';

export interface UpdateProductModalProps {
  product: Product | any;
  categories: Category[];
  vendors?: User[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedProduct?: any) => void;
  isVendor?: boolean;
}

export interface GalleryItem {
  id?: string;
  url: string;
  file?: File;
  is_primary: boolean;
}

export const UpdateProductModal: React.FC<UpdateProductModalProps> = ({
  product,
  categories,
  vendors = [],
  isOpen,
  onClose,
  onSuccess,
  isVendor = false,
}) => {
  const toast = useToast();

  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | string>(0);
  const [stock, setStock] = useState<number | string>(0);
  const [discountPct, setDiscountPct] = useState<number | string>(0);
  const [categoryId, setCategoryId] = useState('');
  const [vendorId, setVendorId] = useState('');

  // Multi-Image Gallery State
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Variant creation state
  const [variantSku, setVariantSku] = useState('');
  const [variantName, setVariantName] = useState('');
  const [variantColor, setVariantColor] = useState('');
  const [variantSize, setVariantSize] = useState('');
  const [variantPrice, setVariantPrice] = useState<number | string>('');
  const [variantStock, setVariantStock] = useState<number | string>('');
  const [isCreatingVariant, setIsCreatingVariant] = useState(false);

  useEffect(() => {
    if (product && isOpen) {
      setName(product.name || '');
      setPrice(Number(product.price) || 0);
      setStock(product.total_stock ?? product.available_stock ?? product.stock ?? 0);
      setDiscountPct(Number(product.discount_percentage) || 0);
      setCategoryId(
        typeof product.category === 'object'
          ? product.category?.id || ''
          : product.category_id || product.category || ''
      );
      setVendorId(product.vendor_id || '');

      // Populate multi-image gallery
      const initialItems: GalleryItem[] = [];
      const primaryUrl = product.primary_image_url || product.image_url;

      if (Array.isArray(product.images) && product.images.length > 0) {
        product.images.forEach((img: any, idx: number) => {
          const url = typeof img === 'string' ? img : img?.image_url;
          if (url) {
            const isPrim =
              typeof img === 'object'
                ? Boolean(img.is_primary || url === primaryUrl)
                : url === primaryUrl || idx === 0;
            initialItems.push({
              id: typeof img === 'object' ? img.id : undefined,
              url,
              is_primary: isPrim,
            });
          }
        });
      } else if (primaryUrl) {
        initialItems.push({
          url: primaryUrl,
          is_primary: true,
        });
      }

      if (initialItems.length > 0 && !initialItems.some((i) => i.is_primary)) {
        initialItems[0].is_primary = true;
      }
      setGalleryItems(initialItems);

      setVariantSku('');
      setVariantName('');
      setVariantColor('');
      setVariantSize('');
      setVariantPrice('');
      setVariantStock('');
    }
  }, [product, isOpen]);

  const handleCreateVariant = async () => {
    if (!variantSku || !variantName) {
      toast.error('SKU and Name are required for new variant');
      return;
    }
    setIsCreatingVariant(true);
    try {
      const validVarPrice = Math.max(0.01, Number(variantPrice) || Number(price) || 0.01);
      const validVarStock = Math.max(0, parseInt(String(variantStock), 10) || 0);
      await adminApi.createVariant(product.id, {
        sku: variantSku.toUpperCase(),
        name: variantName,
        color: variantColor || undefined,
        size: variantSize || undefined,
        price: validVarPrice,
        total_stock: validVarStock,
        available_stock: validVarStock,
      });
      toast.success(`Variant '${variantSku}' created successfully`);
      setVariantSku('');
      setVariantName('');
      setVariantColor('');
      setVariantSize('');
      setVariantPrice('');
      setVariantStock('');
      onSuccess();
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.message || 'Failed to create variant');
    } finally {
      setIsCreatingVariant(false);
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFilesAdded = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: GalleryItem[] = Array.from(files).map((f) => ({
      url: URL.createObjectURL(f),
      file: f,
      is_primary: false,
    }));

    setGalleryItems((prev) => {
      const combined = [...prev, ...newItems];
      if (combined.length > 0 && !combined.some((i) => i.is_primary)) {
        combined[0].is_primary = true;
      }
      return combined;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSetPrimary = (index: number) => {
    setGalleryItems((prev) =>
      prev.map((item, i) => ({
        ...item,
        is_primary: i === index,
      }))
    );
  };

  const handleRemoveGalleryItem = (index: number) => {
    setGalleryItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length > 0 && !next.some((i) => i.is_primary)) {
        next[0].is_primary = true;
      }
      return next;
    });
  };

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Upload any pending new image files
      const pendingFiles = galleryItems.filter((i) => i.file && i.file instanceof File).map((i) => i.file!);
      const uploadedMap = new Map<File, string>();

      if (pendingFiles.length > 0) {
        setIsUploading(true);
        try {
          const uploadRes = await productsApi.uploadImages(pendingFiles);
          pendingFiles.forEach((file, idx) => {
            const returnedUrl = uploadRes.urls?.[idx] || uploadRes.images?.[idx]?.url;
            if (returnedUrl) {
              uploadedMap.set(file, returnedUrl);
            }
          });
        } catch (uploadErr: any) {
          const uploadMsg =
            uploadErr?.response?.data?.detail ||
            uploadErr?.data?.detail ||
            uploadErr?.data?.message ||
            uploadErr?.message ||
            'Failed to upload image(s)';
          toast.error(uploadMsg);
          setIsSubmitting(false);
          setIsUploading(false);
          return;
        } finally {
          setIsUploading(false);
        }
      }

      // 2. Build final images payload
      const finalImages = galleryItems.map((item, idx) => {
        const resolvedUrl = item.file ? (uploadedMap.get(item.file) || item.url) : item.url;
        return {
          image_url: resolvedUrl,
          is_primary: item.is_primary,
          display_order: idx,
        };
      });

      const primaryItem = finalImages.find((i) => i.is_primary) || finalImages[0];
      const primaryUrl = primaryItem ? primaryItem.image_url : null;

      const validPrice = Math.max(0.01, Number(price) || 0.01);
      const validStock = Math.max(0, parseInt(String(stock), 10) || 0);
      const validDiscount = Math.min(100, Math.max(0, Number(discountPct) || 0));

      // Main product update submitted as standard JSON
      const updatePayload: any = {
        name: name.trim(),
        price: validPrice,
        total_stock: validStock,
        available_stock: validStock,
        category_id: categoryId || undefined,
        discount_percentage: validDiscount,
        image_url: primaryUrl,
        primary_image_url: primaryUrl,
        images: finalImages,
      };

      if (!isVendor && vendorId) {
        updatePayload.vendor_id = vendorId;
      }

      let updatedProduct: any;
      if (isVendor) {
        const res = await vendorApi.updateProduct(product.id, updatePayload);
        updatedProduct = res.product || res;
      } else {
        updatedProduct = await adminApi.updateProduct(product.id, updatePayload);
      }

      toast.success('Product updated successfully');
      onSuccess(updatedProduct);
      onClose();
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.detail ||
        error?.data?.detail ||
        error?.data?.message ||
        error?.message ||
        'Failed to update product';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-paper border border-rule p-6 space-y-4 font-mono text-xs z-10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-rule pb-3 flex justify-between items-center">
          <div>
            <h3 className="font-serif text-2xl text-ink">
              {isVendor ? 'Edit Merchant Product' : 'Update Product Record'}
            </h3>
            <span className="text-ash text-[11px] font-mono">
              SKU: {product.sku || 'N/A'} · ID: {String(product.id).slice(0, 8)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-ash hover:text-ink font-mono text-sm px-1 py-0.5"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1">
            <Eyebrow className="text-ash block">PRODUCT NAME *</Eyebrow>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-paper-sunk border border-rule px-3 py-2 text-ink focus:outline-none focus:border-ink"
              placeholder="E.G. TITANIUM DIVER WATCH"
            />
          </div>

          {/* Pricing, Discount & Stock Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Eyebrow className="text-ash block">PRICE ($) *</Eyebrow>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-paper-sunk border border-rule px-3 py-2 text-ink focus:outline-none focus:border-ink font-mono"
              />
            </div>

            <div className="space-y-1">
              <Eyebrow className="text-ash block">DISCOUNT (%)</Eyebrow>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPct}
                onChange={(e) => setDiscountPct(e.target.value)}
                className="w-full bg-paper-sunk border border-rule px-3 py-2 text-ink focus:outline-none focus:border-ink font-mono"
              />
            </div>

            <div className="space-y-1">
              <Eyebrow className="text-ash block">STOCK (UNITS) *</Eyebrow>
              <input
                type="number"
                min="0"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full bg-paper-sunk border border-rule px-3 py-2 text-ink font-semibold focus:outline-none focus:border-ink font-mono"
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <Eyebrow className="text-ash block">CATEGORY</Eyebrow>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-paper-sunk border border-rule px-3 py-2 text-ink focus:outline-none focus:border-ink"
            >
              <option value="">NO CATEGORY / GENERAL</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Vendor Assignment (Admin Only) */}
          {!isVendor && vendors.length > 0 && (
            <div className="space-y-1">
              <Eyebrow className="text-ash block">ASSIGN VENDOR</Eyebrow>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full bg-paper-sunk border border-rule px-3 py-2 text-ink focus:outline-none focus:border-ink"
              >
                <option value="">CENTRAL OUTLET (NO VENDOR)</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.full_name || v.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Product Image Section */}
          <div className="space-y-2 pt-2 border-t border-rule/60">
            <div className="flex items-center justify-between">
              <Eyebrow className="text-ash block">PRODUCT IMAGES ({galleryItems.length})</Eyebrow>
              <span className="text-[10px] text-ash">
                Click a thumbnail to set as Primary / Cover image
              </span>
            </div>

            {/* Thumbnail Strip */}
            <div className="flex flex-wrap gap-2.5 items-center p-2.5 bg-paper-sunk border border-rule min-h-[96px]">
              {galleryItems.map((item, idx) => (
                <div
                  key={item.id || item.url || idx}
                  className={`relative group w-20 h-20 rounded border bg-paper overflow-hidden flex-shrink-0 transition-all ${
                    item.is_primary
                      ? 'border-ink ring-2 ring-ink/80 ring-offset-1'
                      : 'border-rule hover:border-ash'
                  }`}
                >
                  <img
                    src={item.url}
                    alt={`Image ${idx + 1}`}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => handleSetPrimary(idx)}
                    title="Click to set as primary cover image"
                  />

                  {/* Primary Badge or Set Primary Action */}
                  {item.is_primary ? (
                    <span className="absolute top-1 left-1 bg-ink text-paper text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                      COVER
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(idx)}
                      className="absolute top-1 left-1 hidden group-hover:block bg-paper/90 backdrop-blur-sm text-ink hover:bg-ink hover:text-paper text-[8px] font-bold px-1 py-0.5 rounded shadow border border-rule transition-colors"
                      title="Set as Cover Image"
                    >
                      SET COVER
                    </button>
                  )}

                  {/* Delete / Remove Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveGalleryItem(idx);
                    }}
                    className="absolute top-1 right-1 w-5 h-5 bg-paper/90 hover:bg-signal text-ink hover:text-paper rounded flex items-center justify-center text-[10px] font-bold shadow border border-rule transition-colors"
                    title="Remove image"
                  >
                    ✕
                  </button>

                  {item.file && (
                    <span className="absolute bottom-0 inset-x-0 bg-signal text-paper text-[8px] text-center font-mono py-0.5">
                      NEW
                    </span>
                  )}
                </div>
              ))}

              {/* Add Images Button / Card */}
              <label className="w-20 h-20 border-2 border-dashed border-rule hover:border-ink/60 bg-paper hover:bg-paper-sunk rounded flex flex-col items-center justify-center cursor-pointer transition-colors text-center p-1 group flex-shrink-0">
                <span className="text-lg group-hover:scale-110 transition-transform">➕</span>
                <span className="text-[9px] font-bold text-ash group-hover:text-ink mt-0.5 uppercase tracking-tight">
                  Add Image
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFilesAdded}
                />
              </label>
            </div>

            <p className="text-[10px] text-ash">
              Supported formats: JPEG, PNG, WEBP, GIF up to 10MB each. First or selected image serves as the store catalog cover.
            </p>
          </div>

          {/* Variants section (Admin only) */}
          {!isVendor && (
            <div className="pt-3 border-t border-rule/60 space-y-3">
              <div className="flex items-center justify-between">
                <Eyebrow className="text-ash block">ADD VARIANT</Eyebrow>
                <span className="text-[11px] text-ash font-mono">
                  {product.variants?.length || 0} EXISTING
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-paper-sunk p-3 border border-rule">
                <input
                  type="text"
                  placeholder="VARIANT SKU"
                  value={variantSku}
                  onChange={(e) => setVariantSku(e.target.value)}
                  className="bg-paper border border-rule px-2 py-1.5 text-ink focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="VARIANT NAME"
                  value={variantName}
                  onChange={(e) => setVariantName(e.target.value)}
                  className="bg-paper border border-rule px-2 py-1.5 text-ink focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="COLOR"
                  value={variantColor}
                  onChange={(e) => setVariantColor(e.target.value)}
                  className="bg-paper border border-rule px-2 py-1.5 text-ink focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="SIZE"
                  value={variantSize}
                  onChange={(e) => setVariantSize(e.target.value)}
                  className="bg-paper border border-rule px-2 py-1.5 text-ink focus:outline-none"
                />
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="PRICE"
                  value={variantPrice || ''}
                  onChange={(e) => setVariantPrice(Math.max(0.01, parseFloat(e.target.value) || 0))}
                  className="bg-paper border border-rule px-2 py-1.5 text-ink focus:outline-none"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="STOCK"
                  value={variantStock || ''}
                  onChange={(e) => setVariantStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="bg-paper border border-rule px-2 py-1.5 text-ink focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCreateVariant}
                  disabled={isCreatingVariant || !variantSku || !variantName}
                  className="col-span-2 px-3 py-1.5 bg-signal text-paper font-semibold hover:bg-signal/90 disabled:opacity-50 text-[11px]"
                >
                  {isCreatingVariant ? 'CREATING VARIANT...' : '+ ADD VARIANT RECORD'}
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-rule flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-rule bg-paper text-ink hover:bg-paper-sunk uppercase disabled:opacity-50"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-ink text-paper font-semibold hover:bg-graphite disabled:opacity-50 uppercase flex items-center gap-2"
            >
              {isUploading
                ? 'UPLOADING IMAGE...'
                : isSubmitting
                ? 'SAVING CHANGES...'
                : 'SAVE & SYNC STOCK →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateProductModal;
