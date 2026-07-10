import { WorkflowLayout } from "@/layouts/workflow-layout";

export default function WorkflowEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorkflowLayout>{children}</WorkflowLayout>;
}
