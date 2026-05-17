import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'logo',
  template: `
    <svg viewBox="0 0 200 200" role="img" aria-label="NavMesh logo">
      <defs>
        <linearGradient
          id="logo-panel"
          x1="48"
          y1="28"
          x2="154"
          y2="170"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stop-color="#ffffff" />
          <stop offset="0.54" stop-color="var(--nm-primary-tint)" />
          <stop offset="1" stop-color="var(--nm-primary-soft)" />
        </linearGradient>
        <linearGradient
          id="logo-ring"
          x1="40"
          y1="32"
          x2="160"
          y2="168"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stop-color="var(--nm-primary-hover)" />
          <stop offset="0.58" stop-color="var(--nm-primary)" />
          <stop offset="1" stop-color="var(--nm-primary-active)" />
        </linearGradient>
        <linearGradient
          id="logo-link"
          x1="48"
          y1="58"
          x2="152"
          y2="142"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stop-color="var(--nm-primary-hover)" />
          <stop offset="0.58" stop-color="var(--nm-primary)" />
          <stop offset="1" stop-color="var(--nm-primary-active)" />
        </linearGradient>
        <filter
          id="logo-soft-shadow"
          x="-18%"
          y="-18%"
          width="136%"
          height="142%"
          color-interpolation-filters="sRGB"
        >
          <feDropShadow
            dx="0"
            dy="10"
            stdDeviation="9"
            flood-color="var(--nm-primary-active)"
            flood-opacity="0.16"
          />
        </filter>
      </defs>

      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path
          d="M100 20 168 59.5v81L100 180l-68-39.5v-81z"
          fill="url(#logo-panel)"
          stroke="url(#logo-ring)"
          stroke-width="8"
          filter="url(#logo-soft-shadow)"
        />

        <path
          d="M60 78h80M60 122h80M78 56v88M122 56v88"
          stroke="rgb(var(--nm-primary-rgb) / 28%)"
          stroke-width="5"
          opacity="0.72"
        />
        <path d="M60 122 78 78l44 44 18-44" stroke="url(#logo-link)" stroke-width="10" />
        <path
          d="M78 78h44M78 122h44"
          stroke="var(--nm-primary-hover)"
          stroke-width="8"
          opacity="0.9"
        />

        <circle
          cx="60"
          cy="122"
          r="16"
          fill="#ffffff"
          stroke="var(--nm-primary)"
          stroke-width="8"
        />
        <circle
          cx="78"
          cy="78"
          r="15"
          fill="#ffffff"
          stroke="var(--nm-primary-hover)"
          stroke-width="8"
        />
        <circle
          cx="122"
          cy="122"
          r="15"
          fill="#ffffff"
          stroke="var(--nm-primary)"
          stroke-width="8"
        />
        <circle
          cx="140"
          cy="78"
          r="16"
          fill="#ffffff"
          stroke="var(--nm-primary-active)"
          stroke-width="8"
        />

        <path
          d="M100 43V28M100 172v-15M35 100H21M179 100h-14"
          stroke="url(#logo-ring)"
          stroke-width="7"
        />
        <circle cx="100" cy="28" r="6" fill="var(--nm-primary-hover)" />
        <circle cx="100" cy="172" r="6" fill="var(--nm-primary-active)" />
        <circle cx="21" cy="100" r="6" fill="var(--nm-primary)" />
        <circle cx="179" cy="100" r="6" fill="var(--nm-primary-active)" />
      </g>
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        flex: 0 0 auto;
        aspect-ratio: 1;
      }

      svg {
        display: block;
        width: 100%;
        height: 100%;
        overflow: visible;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoComponent {}
