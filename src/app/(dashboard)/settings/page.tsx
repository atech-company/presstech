import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { settingsNavItems } from "@/config/navigation";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your account and workspace preferences"
      />
      <div className="grid gap-4 md:grid-cols-2">
        {settingsNavItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="transition-all hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>
                  Manage your {item.title.toLowerCase()} settings
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
