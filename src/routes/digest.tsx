import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/digest")({
  component: () => <Navigate to="/" />,
});
