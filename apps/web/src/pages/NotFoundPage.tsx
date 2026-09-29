import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";
import { EmptyState } from "../components/ui";

export function NotFoundPage() {
  return (
    <EmptyState
      icon={SearchX}
      title="Page not found"
      description="The page you're looking for doesn't exist or has moved."
      action={<Link to="/" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">Back to dashboard</Link>}
    />
  );
}
