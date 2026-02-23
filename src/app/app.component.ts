import { Component, OnInit } from '@angular/core';
import { RepoUserService } from './services/user/user.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  constructor(private readonly userService: RepoUserService) {}

  ngOnInit(): void {
    this.userService.restoreSession();
  }
}
