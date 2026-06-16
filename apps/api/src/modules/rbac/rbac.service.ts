import { Injectable } from "@nestjs/common";

@Injectable()
export class RbacService {
  status() {
    return { module: "rbac", implemented: false, spec: "docs/03-modules/users-rbac.md" };
  }
}
