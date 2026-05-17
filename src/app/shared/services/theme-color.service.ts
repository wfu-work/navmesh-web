import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

export interface ThemeColorPreset {
  key: string;
  label: string;
  primary: string;
  hover: string;
  active: string;
  soft: string;
  tint: string;
  rgb: string;
}

const STORAGE_KEY = 'navmesh_theme_color';

export const THEME_COLOR_PRESETS: ThemeColorPreset[] = [
  {
    key: 'emerald',
    label: '翡翠绿',
    primary: '#0b8c5e',
    hover: '#0aa36d',
    active: '#08714c',
    soft: '#eef8f3',
    tint: '#f4fbf7',
    rgb: '11 140 94',
  },
  {
    key: 'blue',
    label: '海蓝',
    primary: '#1677ff',
    hover: '#4096ff',
    active: '#0958d9',
    soft: '#eef5ff',
    tint: '#f5f9ff',
    rgb: '22 119 255',
  },
  {
    key: 'violet',
    label: '堇紫',
    primary: '#6f42c1',
    hover: '#8b5cf6',
    active: '#59359a',
    soft: '#f3effc',
    tint: '#faf7ff',
    rgb: '111 66 193',
  },
  {
    key: 'cyan',
    label: '青蓝',
    primary: '#0891b2',
    hover: '#06b6d4',
    active: '#0e7490',
    soft: '#ecfeff',
    tint: '#f3fcfd',
    rgb: '8 145 178',
  },
  {
    key: 'amber',
    label: '琥珀',
    primary: '#c77700',
    hover: '#f59e0b',
    active: '#9a5c00',
    soft: '#fff7e6',
    tint: '#fffaf0',
    rgb: '199 119 0',
  },
];

@Injectable({ providedIn: 'root' })
export class ThemeColorService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly key = signal(THEME_COLOR_PRESETS[0].key);

  readonly presets = THEME_COLOR_PRESETS;
  readonly currentKey = this.key.asReadonly();
  readonly current = computed(() => this.findPreset(this.key()));

  constructor() {
    this.restore();
  }

  apply(key: string): void {
    const preset = this.findPreset(key);
    this.key.set(preset.key);
    this.writeVariables(preset);

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY, preset.key);
    }
  }

  restore(): void {
    const storedKey = this.isBrowser ? localStorage.getItem(STORAGE_KEY) : null;
    const preset = this.findPreset(storedKey || THEME_COLOR_PRESETS[0].key);
    this.key.set(preset.key);
    this.writeVariables(preset);
  }

  private findPreset(key: string): ThemeColorPreset {
    return THEME_COLOR_PRESETS.find((preset) => preset.key === key) ?? THEME_COLOR_PRESETS[0];
  }

  private writeVariables(preset: ThemeColorPreset): void {
    const root = this.document.documentElement;

    root.style.setProperty('--nm-primary', preset.primary);
    root.style.setProperty('--nm-primary-hover', preset.hover);
    root.style.setProperty('--nm-primary-active', preset.active);
    root.style.setProperty('--nm-primary-soft', preset.soft);
    root.style.setProperty('--nm-primary-tint', preset.tint);
    root.style.setProperty('--nm-primary-rgb', preset.rgb);
  }
}
