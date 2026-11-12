import React, { useId } from 'react';
import {
  Eye,
  Image as ImageIcon,
  RotateCcw,
  Save,
  Sparkles,
  Type,
  Upload,
} from 'lucide-react';

export interface AdminLoginBrandingValue {
  heroTitle?: string;
  heroSubtitle?: string;
  heroImageUrl?: string;
  formTitle?: string;
  formSubtitle?: string;
}

export const ADMIN_LOGIN_BRANDING_CACHE_KEY = 'spicehub_admin_login_branding';
export const ADMIN_LOGIN_BRANDING_EVENT = 'spicehub:admin-login-branding-updated';
export const DEFAULT_ADMIN_LOGIN_IMAGE = '/images/hotel-login-default.jpg';
export const DEFAULT_ADMIN_HERO_TITLE = 'Unified Hotel Operations & Revenue Management';
export const DEFAULT_ADMIN_HERO_SUBTITLE =
  'Mission-critical administration hub for multi-floor PMS reservation matrix, dining operations, folio reconciliation, and automated night audit.';
export const DEFAULT_ADMIN_FORM_TITLE = 'Hotel Admin Sign In';
export const DEFAULT_ADMIN_FORM_SUBTITLE =
  'Sign in with your hotel administrator credentials to manage property operations.';

const PRESET_SHOWCASE_IMAGES = [
  {
    label: 'Resort Courtyard',
    url: '/images/hotel-login-default.jpg',
  },
  {
    label: 'Palace Architecture',
    url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1400&auto=format&fit=crop&q=85',
  },
  {
    label: 'Grand Hotel Exterior',
    url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1400&auto=format&fit=crop&q=85',
  },
] as const;

export function compressImageFileToDataUrl(
  file: File,
  maxDim = 1400,
  quality = 0.86
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read selected image file.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Selected file is not a valid image.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Image compression canvas is unavailable.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(event.target?.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export function syncAdminLoginBrandingCache(
  branding: AdminLoginBrandingValue,
  extras?: { hotelName?: string; hotelSlug?: string; coverImageUrl?: string }
): void {
  if (typeof window === 'undefined') return;
  const payload = {
    hotelName: extras?.hotelName || '',
    hotelSlug: extras?.hotelSlug || '',
    coverImageUrl: extras?.coverImageUrl || '',
    heroTitle: branding.heroTitle || '',
    heroSubtitle: branding.heroSubtitle || '',
    heroImageUrl: branding.heroImageUrl || '',
    formTitle: branding.formTitle || '',
    formSubtitle: branding.formSubtitle || '',
  };
  try {
    window.localStorage.setItem(ADMIN_LOGIN_BRANDING_CACHE_KEY, JSON.stringify(payload));
  } catch {}
  window.dispatchEvent(new CustomEvent(ADMIN_LOGIN_BRANDING_EVENT, { detail: payload }));
}

interface AdminLoginBrandingEditorProps {
  value: AdminLoginBrandingValue;
  onChange: (next: AdminLoginBrandingValue) => void;
  coverImageUrl?: string;
  hotelName?: string;
  isDark?: boolean;
  onSave?: () => void;
  saving?: boolean;
  saveStatus?: { type: 'success' | 'error'; message: string } | null;
}

export const AdminLoginBrandingEditor: React.FC<AdminLoginBrandingEditorProps> = ({
  value,
  onChange,
  coverImageUrl,
  hotelName,
  isDark = false,
  onSave,
  saving = false,
  saveStatus = null,
}) => {
  const uploadInputId = useId();
  const previewImage =
    value.heroImageUrl?.trim() || coverImageUrl?.trim() || DEFAULT_ADMIN_LOGIN_IMAGE;
  const previewHeroTitle = value.heroTitle?.trim() || DEFAULT_ADMIN_HERO_TITLE;
  const previewHeroSubtitle = value.heroSubtitle?.trim() || DEFAULT_ADMIN_HERO_SUBTITLE;
  const previewFormTitle = value.formTitle?.trim() || DEFAULT_ADMIN_FORM_TITLE;
  const previewFormSubtitle = value.formSubtitle?.trim() || DEFAULT_ADMIN_FORM_SUBTITLE;

  const updateField = (patch: Partial<AdminLoginBrandingValue>) => {
    onChange({
      ...value,
      ...patch,
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 1400, 0.86);
      updateField({ heroImageUrl: dataUrl });
    } catch {
      // Keep current image if file decoding fails
    } finally {
      e.target.value = '';
    }
  };

  const handleResetDefaults = () => {
    onChange({
      heroTitle: '',
      heroSubtitle: '',
      heroImageUrl: '',
      formTitle: '',
      formSubtitle: '',
    });
  };

  const cardSurface = isDark
    ? 'bg-slate-900/70 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200 text-slate-900';
  const subSurface = isDark
    ? 'bg-slate-950/60 border-slate-800 text-slate-300'
    : 'bg-slate-50 border-slate-200 text-slate-700';
  const inputSurface = isDark
    ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500'
    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400';

  return (
    <section
      data-testid="admin-login-branding-editor"
      className={`rounded-2xl border p-5 space-y-5 ${cardSurface}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Hotel Admin Login Page Appearance</span>
          </h3>
          <p className="text-xs text-slate-500">
            Customize the side showcase photo, left headline, subtitle, and sign-in copy shown on the Hotel Admin login page.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          {onSave && (
            <button
              type="button"
              data-testid="save-admin-login-branding-btn"
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-60 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Login Design'}</span>
            </button>
          )}
        </div>
      </div>

      {saveStatus && (
        <div
          role="status"
          className={`rounded-xl border px-3.5 py-2.5 text-xs font-semibold ${
            saveStatus.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {saveStatus.message}
        </div>
      )}

      {/* Live Split-Screen Mini Preview */}
      <div className={`rounded-xl border p-3.5 space-y-2.5 ${subSurface}`}>
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-emerald-600" />
            Live Login Screen Preview
          </span>
          <span>Desktop Split Layout</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-xs min-h-[190px]">
          <div className="md:col-span-7 relative bg-slate-900 text-white p-5 flex flex-col justify-end min-h-[160px]">
            <img
              src={previewImage}
              alt="Login showcase preview"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/15" />
            <div className="relative z-10 space-y-1.5">
              <div className="text-sm font-bold leading-snug text-white line-clamp-2">
                {previewHeroTitle}
              </div>
              <div className="text-[11px] text-slate-200/90 leading-relaxed line-clamp-2">
                {previewHeroSubtitle}
              </div>
              <div className="pt-2 border-t border-white/15 flex items-center justify-between text-[10px] text-slate-300/80">
                <span>© {new Date().getFullYear()} {hotelName || 'SpiceHub Hospitality'}</span>
                <span>Hotel Operations Console</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-5 bg-slate-50 p-4 flex items-center justify-center">
            <div className="w-full rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 shadow-2xs">
              <div className="text-sm font-bold text-slate-900 truncate">{previewFormTitle}</div>
              <div className="text-[10px] text-slate-500 line-clamp-2">{previewFormSubtitle}</div>
              <div className="space-y-1.5 pt-1">
                <div className="h-6 rounded border border-slate-200 bg-slate-50 px-2 flex items-center text-[10px] text-slate-400">
                  Write email
                </div>
                <div className="h-6 rounded border border-slate-200 bg-slate-50 px-2 flex items-center text-[10px] text-slate-400">
                  Write password
                </div>
                <div className="h-6 rounded bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                  Sign In to Hotel ERP
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side Image Controls */}
      <div className={`rounded-xl border p-4 space-y-3 ${subSurface}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="block text-xs font-bold">Side Showcase Photograph</span>
            <span className="text-[11px] text-slate-500">
              Upload a photo from your computer, paste a URL, or choose a curated architectural view.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <input
              id={uploadInputId}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleImageUpload(e)}
            />
            <label
              htmlFor={uploadInputId}
              data-testid="upload-admin-login-image-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 text-xs font-semibold cursor-pointer transition shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>Upload Photo</span>
            </label>

            {coverImageUrl && (
              <button
                type="button"
                onClick={() => updateField({ heroImageUrl: coverImageUrl })}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Use Hotel Cover</span>
              </button>
            )}

            {value.heroImageUrl && (
              <button
                type="button"
                onClick={() => updateField({ heroImageUrl: '' })}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
              >
                Clear Image
              </button>
            )}
          </div>
        </div>

        <input
          type="text"
          data-testid="input-admin-login-hero-image-url"
          value={value.heroImageUrl?.startsWith('data:') ? '' : value.heroImageUrl || ''}
          onChange={(e) => updateField({ heroImageUrl: e.target.value })}
          placeholder={
            value.heroImageUrl?.startsWith('data:')
              ? 'Uploaded photo active (paste an https:// URL to replace)'
              : 'https://images.unsplash.com/... or /images/hotel-login-default.jpg'
          }
          className={`w-full px-3 py-2 rounded-xl text-xs border outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-medium ${inputSurface}`}
        />

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-500 mr-1">Presets:</span>
          {PRESET_SHOWCASE_IMAGES.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => updateField({ heroImageUrl: preset.url })}
              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-medium transition cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Text Copy Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <Type className="w-3.5 h-3.5 text-emerald-600" />
            <span>Left Showcase Text</span>
          </div>

          <label className="block">
            <span className="block text-xs font-semibold text-slate-500 mb-1">
              Showcase Headline
            </span>
            <input
              type="text"
              data-testid="input-admin-login-hero-title"
              value={value.heroTitle || ''}
              onChange={(e) => updateField({ heroTitle: e.target.value })}
              placeholder={DEFAULT_ADMIN_HERO_TITLE}
              className={`w-full px-3 py-2 rounded-xl text-xs border outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-semibold ${inputSurface}`}
            />
          </label>

          <label className="block">
            <span className="block text-xs font-semibold text-slate-500 mb-1">
              Showcase Subtitle / Description
            </span>
            <textarea
              rows={2}
              data-testid="input-admin-login-hero-subtitle"
              value={value.heroSubtitle || ''}
              onChange={(e) => updateField({ heroSubtitle: e.target.value })}
              placeholder={DEFAULT_ADMIN_HERO_SUBTITLE}
              className={`w-full px-3 py-2 rounded-xl text-xs border outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-y ${inputSurface}`}
            />
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <Type className="w-3.5 h-3.5 text-blue-600" />
            <span>Right Sign-In Card Text</span>
          </div>

          <label className="block">
            <span className="block text-xs font-semibold text-slate-500 mb-1">
              Sign-In Form Heading
            </span>
            <input
              type="text"
              data-testid="input-admin-login-form-title"
              value={value.formTitle || ''}
              onChange={(e) => updateField({ formTitle: e.target.value })}
              placeholder={DEFAULT_ADMIN_FORM_TITLE}
              className={`w-full px-3 py-2 rounded-xl text-xs border outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-semibold ${inputSurface}`}
            />
          </label>

          <label className="block">
            <span className="block text-xs font-semibold text-slate-500 mb-1">
              Sign-In Form Subtitle
            </span>
            <textarea
              rows={2}
              data-testid="input-admin-login-form-subtitle"
              value={value.formSubtitle || ''}
              onChange={(e) => updateField({ formSubtitle: e.target.value })}
              placeholder={DEFAULT_ADMIN_FORM_SUBTITLE}
              className={`w-full px-3 py-2 rounded-xl text-xs border outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-y ${inputSurface}`}
            />
          </label>
        </div>
      </div>
    </section>
  );
};
