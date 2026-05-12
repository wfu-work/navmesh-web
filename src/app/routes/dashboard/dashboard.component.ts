import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PanelComponent } from 'src/app/shared/components/panel/panel.component';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { DashboardActiveRulesComponent } from './widgets/active-rules';
import { DashboardTrafficTrendComponent } from './widgets/traffic-trend';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TitleLabelComponent,
    PanelComponent,
    DashboardTrafficTrendComponent,
    DashboardActiveRulesComponent,
  ],
})
export class DashboardComponent {}
