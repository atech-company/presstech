import { PageHeader } from "@/components/layout/page-header";
import { CreateBotForm } from "@/features/bots/components/create-bot-form";

export const metadata = { title: "Create Bot" };

export default function NewBotPage() {
  return (
    <div>
      <PageHeader
        title="Create Bot"
        description="Set up a new AI bot for your workspace"
      />
      <CreateBotForm />
    </div>
  );
}
