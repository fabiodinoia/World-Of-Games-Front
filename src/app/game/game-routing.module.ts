import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GamesComponent } from './games/games.component';
import { DetailComponent } from './detail/detail.component';
import { AddComponent } from './add/add.component';
import { AuthGuard } from '../guards/auth.guard';

const routes: Routes = [
  { path: '', component: GamesComponent, canActivate: [AuthGuard] },
  { path: 'create', component: AddComponent, canActivate: [AuthGuard] },
  { path: ':id', component: DetailComponent, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GameRoutingModule {}
