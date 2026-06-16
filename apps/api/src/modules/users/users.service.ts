import { Injectable } from "@nestjs/common";

@Injectable()
export class UsersService {
  status() {
    return { module: "users", implemented: false, spec: "docs/03-modules/users-rbac.md" };
  }
}
