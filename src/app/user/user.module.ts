import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';
import { UserDetailComponent } from './detail/detail.component';
import { CartComponent } from './cart/cart.component';
import { UserRoutingModule } from './user-routing.module';

@NgModule({
  declarations: [
    RegisterComponent,
    LoginComponent,
    UserDetailComponent,
    CartComponent,
  ],
  imports: [
    CommonModule,
    UserRoutingModule,
    ReactiveFormsModule,
    MatIconModule,
  ],
})
export class UserModule {}
