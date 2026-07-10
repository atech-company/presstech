import { use } from "react";
import { WorkflowBuilder } from "@/features/workflows/components/workflow-builder";

export const metadata = { title: "Edit Workflow" };

export default function EditWorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <WorkflowBuilder workflowId={id} />;
}
