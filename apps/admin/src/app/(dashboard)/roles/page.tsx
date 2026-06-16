import { FX_ROLES, PERMISSIONS } from "@nova/shared";
import { PageHeader, Badge, Card } from "@/components/ui";

export default function RolesPage() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Roles"
        desc="Permission sets. System roles can't be deleted."
        action={
          <button className="rounded-md bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            + New role
          </button>
        }
      />
      <div className="space-y-4">
        {FX_ROLES.map((role) => (
          <Card key={role.name} className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{role.name}</h2>
                {role.isSystem && <Badge value="SYSTEM" />}
              </div>
              {!role.isSystem && <button className="text-xs text-brand-600 hover:underline">Edit</button>}
            </div>
            <p className="mt-1 text-sm text-zinc-500">{role.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(role.permissions[0] === "*" ? [...PERMISSIONS] : role.permissions).map((p) => (
                <span key={p} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                  {p}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
