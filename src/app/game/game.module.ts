import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { GamesComponent } from './games/games.component';
import { DetailComponent } from './detail/detail.component';
import { AddComponent } from './add/add.component';
import { GameRoutingModule } from './game-routing.module';

@NgModule({
  declarations: [GamesComponent, DetailComponent, AddComponent],
  imports: [
    CommonModule,
    GameRoutingModule,
    MatIconModule,
    FormsModule,
    ReactiveFormsModule,
  ],
})
export class GameModule {}
